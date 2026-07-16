# Implementation Plan: First-run Slidev onboarding

## Overview

Build a contextual, one-click onboarding path for unconfigured users. The
plugin will create `<vault>/.slidev`, install the maintained starter
dependencies with the user's Node.js/npm installation, verify the result,
persist the project path, and let the existing presentation startup continue.
The implementation stays desktop-only, shell-free, resumable, and compatible
with manually configured projects.

Source design:
[`docs/superpowers/specs/2026-07-16-first-run-onboarding-design.md`](../docs/superpowers/specs/2026-07-16-first-run-onboarding-design.md)

## Architecture decisions

- Put filesystem and child-process behavior in a UI-agnostic setup service
  under `src/setup/`; neither Solid components nor the settings tab will run
  npm directly.
- Add a plugin-owned setup controller that exposes one shared state stream and
  coalesces concurrent starts from the presentation view and settings.
- Resolve the actual Node executable first, then invoke npm's JavaScript CLI
  through that executable. Do not run a shell or interpolate a command string.
- Import dependency versions from `slidev-template/package.json` at build time
  so the repository has one maintained starter dependency set and the release
  bundle remains self-contained.
- Save `slidevTemplateLocation` only after `diagnoseSlidevProject` succeeds.
  The existing reactive settings update will then trigger presentation startup
  automatically.
- Isolate Obsidian's undocumented settings-navigation object behind a
  feature-detected adapter. If unavailable, keep setup usable and show text
  telling the user how to open **Settings → Slidev** manually.
- Follow test-driven development for every behavior slice: add a failing test,
  make it pass with the smallest implementation, then refactor with the suite
  green.

The npm install is local because `npm install` without package arguments
installs dependencies from the current package into local `node_modules`.
Official npm guidance also treats Node.js and npm as a paired installation:
[npm install behavior](https://docs.npmjs.com/cli/install/) and
[installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/).

## Dependency graph

```text
Node runtime diagnosis + npm CLI discovery
                    │
                    ▼
       Safe setup service + manifest
                    │
                    ▼
       Shared setup controller + plugin
                 ┌──┴──┐
                 ▼     ▼
      Presentation UI  Settings UI
                 └──┬──┘
                    ▼
           Documentation + full CI
```

The work should remain sequential because the central setup state contract is
consumed by both UI surfaces and those files overlap during integration.

## Phase 1: Runtime and project foundation

### Task 1: Diagnose Node.js and locate npm without a shell

**Description:** Extract reusable Node runtime diagnosis from the current
project launcher, including the real `process.execPath`, and add npm CLI
discovery for the standard POSIX and Windows layouts relative to that real
executable. This fails before creating files when Node.js or npm is missing.

**Acceptance criteria:**

- [ ] Node diagnosis preserves the launcher's current configured-path and PATH
      behavior and returns the probed version plus real executable path.
- [ ] npm discovery recognizes POSIX `../lib/node_modules/npm/bin/npm-cli.js`
      and Windows `node_modules/npm/bin/npm-cli.js` layouts, including paths
      containing spaces and shell metacharacters.
- [ ] Missing/invalid Node.js and missing npm return distinct typed errors; no
      command is executed with `shell: true`.

**Verification:**

- [ ] RED: focused tests fail before the runtime/npm APIs exist.
- [ ] GREEN: `pnpm vitest run src/launcher/slidevLauncher.test.ts src/setup/npmCli.test.ts`
- [ ] `pnpm run type-check`

**Dependencies:** None.

**Files likely touched:**

- `src/launcher/slidevLauncher.ts`
- `src/launcher/slidevLauncher.test.ts`
- `src/setup/npmCli.ts`
- `src/setup/npmCli.test.ts`

**Estimated scope:** Medium (4 files).

### Task 2: Create, install, verify, and cancel the starter project

**Description:** Implement the setup service and generated manifest. It will
create a new marked `.slidev/package.json`, resume only an exact marked
manifest, run npm with structured arguments, stream safe output, verify the
installed project, and terminate only its owned installer when cancelled.

**Acceptance criteria:**

- [ ] A fresh setup writes the marked manifest using the maintained starter
      versions, invokes Node with npm's CLI and local-install arguments, and
      returns the canonical path only after validation succeeds.
- [ ] A matching partial setup resumes; an unmarked or changed non-empty
      `.slidev` directory is not overwritten; failed installs never update
      plugin settings.
- [ ] Progress, stdout/stderr, typed failures, retry state, coalesced active
      work, and cancellation are observable without leaking environment data.

**Verification:**

- [ ] RED: temporary-directory tests fail for creation, collision, retry,
      process failure, verification failure, and cancellation.
- [ ] GREEN: `pnpm vitest run src/setup/SlidevSetupService.test.ts`
- [ ] `pnpm run type-check`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/setup/starterProject.ts`
- `src/setup/SlidevSetupService.ts`
- `src/setup/SlidevSetupService.test.ts`
- `tsconfig.json`

**Estimated scope:** Medium (4 files).

## Checkpoint: Foundation

- [ ] `pnpm test`
- [ ] `pnpm run type-check`
- [ ] Review the setup service for shell use, path interpolation, destructive
      filesystem calls, and ownership checks.

## Phase 2: Shared orchestration and user flows

### Task 3: Own setup lifecycle and successful persistence in the plugin

**Description:** Add a setup controller that serializes starts, publishes a
stable state model, obtains the vault path and current Node setting at start
time, and persists the verified path through `SlidevPlugin.saveSettings`.
Construct and cancel it with the plugin lifecycle.

**Acceptance criteria:**

- [ ] Calls from multiple UI surfaces share one active setup and one state
      stream instead of spawning duplicate npm installs.
- [ ] Success saves the verified canonical project path once and triggers the
      existing settings/view update; every failure leaves the old setting
      unchanged.
- [ ] Plugin unload cancels an active owned installer and does not remove a
      resumable marked project.

**Verification:**

- [ ] RED: controller tests fail for deduplication, persistence, failure, and
      cancellation before integration.
- [ ] GREEN: `pnpm vitest run src/setup/SlidevSetupController.test.ts`
- [ ] `pnpm run type-check`

**Dependencies:** Task 2.

**Files likely touched:**

- `src/setup/SlidevSetupController.ts`
- `src/setup/SlidevSetupController.test.ts`
- `src/SlidevPlugin.ts`

**Estimated scope:** Medium (3 files).

### Task 4: Add contextual onboarding to the presentation view

**Description:** Pass the shared controller into the Solid view and render a
dedicated onboarding state when the project setting is empty. Show consent
copy, progress, retry/log actions, and a guarded settings shortcut. After
successful persistence, let the current settings effect run the normal server
startup path.

**Acceptance criteria:**

- [ ] Empty configuration shows **Set up Slidev** and download/location
      disclosure instead of the generic stopped-server diagnosis; configured
      projects keep their current states unchanged.
- [ ] Setup stages and failures are announced in text, actions remain keyboard
      accessible, duplicate starts are disabled, and log output is available.
- [ ] A successful setup leaves onboarding automatically and starts the active
      Markdown presentation without another button click.

**Verification:**

- [ ] RED/GREEN: focused state-selection tests cover unconfigured, active,
      failed, successful, and configured modes.
- [ ] `pnpm vitest run src/views/PresentationView.test.ts`
- [ ] Manual check: use only the keyboard to start setup, retry a fake failure,
      and open the log/settings fallback.

**Dependencies:** Task 3.

**Files likely touched:**

- `src/views/SlidevPresentationView.tsx`
- `src/views/PresentationView.tsx`
- `src/views/PresentationView.test.ts`
- `src/styles.css`

**Estimated scope:** Medium (4 files).

### Task 5: Add quick setup to Slidev settings

**Description:** Put a Quick setup section before existing settings when no
project is configured. Subscribe it to the shared controller, display the same
progress/result language, and redisplay after success while preserving the
manual project and Node controls.

**Acceptance criteria:**

- [ ] Quick setup appears only when the project path is empty and starts the
      same shared operation used by the presentation view.
- [ ] Progress, failure, retry, and success are visible without blocking edits
      to the manual Node/project fields.
- [ ] Existing configured users see the same settings and Verify behavior as
      before.

**Verification:**

- [ ] `pnpm vitest run src/setup/SlidevSetupController.test.ts src/settings.test.ts`
- [ ] `pnpm run type-check`
- [ ] Manual check: start setup in the presentation, open settings during the
      install, and confirm there is still only one installer and synchronized
      progress.

**Dependencies:** Tasks 3 and 4.

**Files likely touched:**

- `src/SlidevSettingTab.ts`
- `src/styles.css`

**Estimated scope:** Small (2 files).

## Checkpoint: End-to-end onboarding

- [ ] `pnpm test`
- [ ] `pnpm run lint`
- [ ] `pnpm run type-check`
- [ ] Manual fresh-vault flow reaches a running presentation without terminal
      interaction.
- [ ] Manual custom-project flow is unchanged.

## Phase 3: Documentation and release verification

### Task 6: Document quick setup and its trust boundaries

**Description:** Lead the README with the one-click path, retain manual setup
as an advanced option, update common-problem guidance, and disclose the
vault-local files, network downloads, npm process, package scripts, and retry
behavior.

**Acceptance criteria:**

- [ ] A new user can follow the README from plugin enablement to presentation
      without a terminal when Node.js/npm are available.
- [ ] Manual configuration and missing Node/npm recovery remain documented.
- [ ] Security disclosures accurately describe `.slidev`, npm registry access,
      install scripts, external processes, and deletion/cleanup ownership.

**Verification:**

- [ ] `pnpm exec prettier README.md docs/common-problems.md --check`
- [ ] Review every command, label, path, and disclosure against the shipped UI.

**Dependencies:** Tasks 4 and 5.

**Files likely touched:**

- `README.md`
- `docs/common-problems.md`

**Estimated scope:** Small (2 files).

### Task 7: Run full verification and desktop smoke tests

**Description:** Run the complete repository pipeline, inspect the production
bundle, and smoke-test success plus the highest-risk recovery paths in a
throwaway local vault. Do not touch or stage the existing
`slidev-template/.obsidian/workspace.json` modification.

**Acceptance criteria:**

- [ ] Full CI passes and the three release artifacts still verify.
- [ ] Fresh setup, retry after failed install, `.slidev` collision, missing
      Node/npm, cancellation, and manual existing-project flows behave as
      designed.
- [ ] Git diff contains only onboarding, tests, and documentation; no generated
      vault/project output is included.

**Verification:**

- [ ] `pnpm run ci`
- [ ] Inspect `git diff --check`, `git status --short`, and the production build
      contents.
- [ ] Record manual smoke-test outcomes in the final handoff.

**Dependencies:** Task 6.

**Files likely touched:** None unless verification reveals a scoped defect.

**Estimated scope:** Small.

## Checkpoint: Complete

- [ ] All task acceptance criteria are met.
- [ ] All automated checks pass.
- [ ] Desktop smoke tests pass or any environment-only limitation is explicit.
- [ ] Existing manual configuration has no regression.
- [ ] The user-owned workspace change remains untouched.
- [ ] Changes are ready for review.

## Risks and mitigations

| Risk                                                   | Impact | Mitigation                                                                                                                                                     |
| ------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GUI Obsidian inherits a different PATH than a terminal | High   | Reuse the configurable Node path, resolve the real Node executable, and derive npm's JS CLI from that installation.                                            |
| npm layouts vary across installers/version managers    | High   | Cover standard POSIX/Windows layouts with fixtures, resolve symlinks/real exec paths, and fail with a specific manual-setup path rather than invoking a shell. |
| Existing `.slidev` content is overwritten              | High   | Require the exact marker/schema/manifest before resume; never delete unowned directories.                                                                      |
| Install is interrupted or fails                        | Medium | Keep the marked manifest and partial npm output, expose retry/log state, and save settings only after verification.                                            |
| Two UI surfaces start two npm processes                | Medium | Put concurrency ownership in one plugin-owned controller and test coalescing.                                                                                  |
| Obsidian settings navigation changes                   | Low    | Isolate and feature-detect the undocumented adapter; setup and manual instructions remain available without it.                                                |
| npm dependency install scripts execute code            | High   | Require an explicit button click, disclose this behavior, use only maintained fixed ranges, and never install into an unrelated directory.                     |

## Open questions

None. The approved design and repository conventions provide the required
choices. Any unsupported npm installation layout degrades to the documented
manual-project path rather than expanding scope during implementation.

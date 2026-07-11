# Implementation plan: Reliable Slidev launch

## Architecture decisions

- Resolve the configured project's local CLI and invoke it through Node.
- Use a typed diagnosis result as the contract shared by Verify and Start.
- Keep the process view-scoped and avoid all shell interpolation.
- Treat the outstanding Obsidian review comments as release blockers.

## Phase 1: Launcher foundation

### Task 1: Add the test harness and failing launcher tests

Acceptance criteria:

- Tests reproduce global-CLI false positives and paths containing spaces.
- Tests specify distinct setup failures and a shell-free launch specification.
- The first run fails against the current implementation.

Verification: `pnpm test`

### Task 2: Implement diagnosis and direct launch

Acceptance criteria:

- Only a project-local `@slidev/cli` is accepted.
- Node and CLI are invoked with an argument array and `shell: false`.
- A fake CLI starts end to end and receives unchanged paths and port.

Verification: focused launcher tests, then `pnpm run type-check`

## Checkpoint: Launcher foundation

- All launcher tests pass.
- The production bundle compiles.

## Phase 2: Plugin integration

### Task 3: Migrate settings and verification

Acceptance criteria:

- “Initial script” is replaced with an optional Node executable path.
- Empty/default project paths do not report success.
- Settings save without unloading or reloading the plugin.

Verification: settings tests and type checking

### Task 4: Fix view and process lifecycle

Acceptance criteria:

- Existing presentation leaves are revealed rather than detached.
- An existing server is reused before launch is attempted.
- Server probes use `requestUrl`; child state and listeners are view-scoped.

Verification: component/service tests and production build

## Checkpoint: Plugin integration

- Automated tests and type checking pass.
- Manual start, stop, reopen, and existing-server flows work.

## Phase 3: Distribution and standards

### Task 5: Correct documentation and release metadata

Acceptance criteria:

- README accurately documents prerequisites, BRAT/manual setup, disclosures,
  and the current Community Plugins status.
- Manifest description follows current capitalization and punctuation rules.
- Release ZIP name contains the version and release verification runs first.

Verification: metadata assertions and workflow inspection

### Task 6: Add cross-platform quality gates

Acceptance criteria:

- CI performs non-mutating format/lint checks, tests, type checking, and build.
- The test matrix includes Windows, macOS, and Linux.
- The committed lockfile is used with frozen installs.

Verification: local equivalents pass; workflow syntax is validated

## Final checkpoint

- Full tests, lint, formatting, type checking, and build pass.
- A real local Slidev fixture launches and answers HTTP requests.
- Dependency audit has no reachable high/critical production vulnerability.
- Final diff passes correctness, readability, architecture, security, and
  performance review.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| GUI `PATH` omits Node | Optional absolute Node executable setting |
| Slidev changes its bin path | Read the installed package's `bin` metadata |
| Malicious package metadata escapes its directory | Enforce resolved-path containment |
| Existing server uses the configured port | Probe first and reuse it |
| Windows process behavior differs | No `.cmd` wrapper; CI tests direct Node args |

## Open questions

None. The user approved the recommended design and delegated implementation.

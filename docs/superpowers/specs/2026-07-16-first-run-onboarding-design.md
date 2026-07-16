# First-run Slidev onboarding design

## Status

Approved for implementation planning.

## Context

A fresh Slidev plugin installation has no configured Slidev project. The
current presentation view reports that the server is unavailable and the
settings tab asks for a project path, but neither surface helps a new user
create that project. The repository contains an example project, yet that
project is not included in the three-file community-plugin release.

The desired first-run outcome is that a desktop user with Node.js installed
can open a Markdown note, select the Slidev ribbon action, and become ready to
present without using a terminal or copying a filesystem path.

## Goals

- Turn the unconfigured presentation view into a guided setup surface.
- Create and configure a minimal Slidev project with one explicit user action.
- Install the project's dependencies and continue directly to the
  presentation when setup succeeds.
- Make partial or failed setup safe to retry.
- Preserve the existing manual-project workflow and all configured-user
  behavior.
- Give actionable errors when Node.js, npm, filesystem access, or dependency
  installation is unavailable.

## Non-goals

- Installing or upgrading Node.js.
- Managing arbitrary existing Slidev projects.
- Automatically modifying an existing project that the plugin did not create.
- Running setup on plugin load or showing an unsolicited welcome modal.
- Supporting setup or presentation on mobile Obsidian.
- Maintaining multiple generated projects in one vault.

## Chosen approach

Use contextual onboarding in the presentation view, with the same quick-setup
action available in Slidev settings. This keeps onboarding adjacent to the
user's intent, avoids interrupting plugin enablement, and leaves configured
users unchanged.

The alternatives were:

1. A first-enable welcome modal. This is highly discoverable but appears
   before many users have a presentation note open and introduces persistent
   dismissed-state bookkeeping.
2. Documentation and copyable commands only. This is low risk but retains the
   terminal, package-manager, and path-selection friction that onboarding is
   intended to remove.

## User experience

### Unconfigured presentation view

When no Slidev project folder is configured, opening the presentation view
shows a dedicated setup state instead of the generic stopped-server state. It
contains:

- A short explanation that Slidev needs a local project and Node.js.
- A primary **Set up Slidev** button.
- A disclosure that setup creates files under `.slidev` in the current vault
  and downloads npm packages.
- A secondary **Open settings** action for users who already have a Slidev
  project or need to set a custom Node.js executable.

Selecting **Set up Slidev** is the explicit consent to create the project and
download its dependencies. The view remains open and reports the current
stage:

1. Checking Node.js and npm.
2. Creating the starter project.
3. Installing Slidev dependencies.
4. Verifying the project.
5. Starting the presentation.

The setup button is disabled while work is active. On success, the setup state
transitions into the existing presentation automatically; the user does not
need to click **Start Slidev server** separately.

### Settings

The Slidev settings tab begins with a **Quick setup** section when the project
path is empty. Its button runs the same setup operation and reports the same
progress and result. The current project path, verification button, Node.js
executable, port, slide-number, and debug settings remain available.

Users with a configured project do not see the quick-setup prompt. They can
continue to edit and verify their project path exactly as they do today.

## Generated project

The generated project lives at `<vault>/.slidev`. A dot-prefixed directory
keeps dependency files out of Obsidian's normal note navigation while making
the project vault-local, stable across plugin upgrades, and easy for the user
to remove.

The plugin writes a minimal `package.json` containing:

- `private: true` and `type: "module"`.
- Standard `dev`, `build`, and `export` scripts.
- Compatible versions of `@slidev/cli`, the default Slidev themes, and Vue.

No standalone deck is required because the existing launch bridge imports the
active vault note. The generated project is deliberately smaller than the
repository's demonstration template.

The generated manifest contains an `obsidianSlidev` object with
`generatedBy: "slidev-plugin"` and `schemaVersion: 1`. This marker lets retries
distinguish a project created by onboarding from unrelated user content.
Dependency versions are copied from the repository's maintained starter
manifest at build time and are never specified as `latest`, making repeated
setup with a given plugin release predictable.

## Setup service

A setup service owns filesystem and process behavior independently of the UI.
It accepts the vault root and the configured Node.js executable, emits typed
progress updates, and returns either a verified project path or a typed error.

Its operation is:

1. Resolve and probe Node.js using the launcher's existing rules.
2. Locate npm's JavaScript CLI relative to the resolved Node.js installation
   or through the executable search path. npm is invoked through Node.js so the
   installer remains shell-free and handles spaces consistently across
   platforms.
3. Inspect `<vault>/.slidev`.
4. If the directory is absent, create it and write the generated manifest
   atomically.
5. If its manifest contains the expected onboarding marker, schema version,
   scripts, and dependency versions, treat it as a resumable setup. Any
   unmarked directory or marked manifest with changed setup fields is treated
   as user-owned content; stop without overwriting anything.
6. Run npm with arguments equivalent to `npm install`, using the generated
   project as the working directory and no shell.
7. Diagnose the completed project with `diagnoseSlidevProject`.
8. Return the canonical project path.

The caller saves the returned path only after verification succeeds. This
prevents settings from pointing at an incomplete project. A failed dependency
install leaves the marked manifest in place, allowing a later click to resume
without deleting potentially useful npm output or diagnostic files.

Only one setup operation may run at a time per plugin instance. Both UI
surfaces subscribe to the same operation so opening settings while setup is in
progress cannot start a second installer.

## Integration with presentation startup

Presentation startup first checks whether the project setting is empty. If it
is, it exposes the setup state and does not run the normal server diagnosis.
After setup succeeds, the plugin saves settings through its existing
`saveSettings` path. The presentation view receives the settings update and
continues through its existing diagnose, prepare, spawn, and probe sequence.

The regular stopped-server screen remains responsible for failures involving
a manually configured project or a configured project that later becomes
invalid. It may link back to settings but does not silently replace that
project with the generated one.

## Failure handling

Errors are specific and recoverable:

- **Node.js missing or invalid:** explain that Node.js is required and offer
  **Open settings** to configure its executable.
- **npm missing:** explain that npm must be installed with Node.js and preserve
  the option to configure an existing Slidev project manually.
- **`.slidev` collision:** report that the directory already contains files the
  plugin does not own. Do not modify or remove it; direct the user to manual
  project configuration.
- **Manifest creation failure:** report the filesystem error without saving
  the generated project path.
- **Install failure:** show a concise failure summary and provide **Retry** and
  **View log** actions. Preserve process output in the existing log UI.
- **Verification failure:** show the launcher's diagnosis and allow retry.
- **View closure or plugin unload:** terminate only the installer process owned
  by the plugin. The marked partial project remains resumable.

Logs must not include environment variables. Process arguments are structured
and setup never invokes a shell.

## Components and boundaries

- `SlidevSetupService`: owns project inspection, manifest creation, npm
  discovery and execution, progress, cancellation, and verification.
- `SlidevPlugin`: owns the single service instance and persists a successful
  project path.
- `PresentationView`: chooses between onboarding, existing error states, and
  the presentation; it renders progress and retry actions.
- `SlidevSettingTab`: exposes the same setup operation for an empty project
  setting without duplicating setup logic.
- Existing launcher and process modules remain responsible for presentation
  validation and Slidev server lifecycle.

## Testing strategy

Unit tests for the setup service use temporary directories and injected process
dependencies. They cover:

- Creating the manifest for a fresh vault.
- Resuming a marked partial setup.
- Refusing to overwrite an unmarked `.slidev` directory.
- Resolving npm on supported platform layouts.
- Propagating installation output and a non-zero exit.
- Returning success only after project diagnosis passes.
- Cancelling the owned installer process.

Settings tests cover successful path persistence and ensure a failed setup
does not change the configured project. Presentation tests cover selection of
the onboarding state and automatic continuation after setup.

The complete verification run includes linting, formatting, type checking,
unit tests, a production build, and build-artifact verification. A manual
desktop smoke test verifies the fresh-vault button flow and confirms that the
first presentation starts without terminal interaction.

## Documentation updates

The README setup section will lead with the one-click path and retain manual
configuration as an advanced option. The disclosures will explicitly state
that quick setup creates `<vault>/.slidev`, downloads npm dependencies after a
button click, and starts an external npm process during installation.

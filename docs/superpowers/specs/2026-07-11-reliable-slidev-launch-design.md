# Reliable Slidev launch design

Date: 2026-07-11
Status: Approved

## Context

The plugin currently verifies that a `slidev` executable can be found, but it
starts a different command: a shell script containing `npm run dev`. The lookup
also searches the global `PATH`, so a global Slidev installation can make an
unrelated project look valid. The launch script interpolates project and note
paths into a shell command, which breaks paths containing spaces, behaves
differently on Windows, and exposes shell metacharacters.

GitHub issue #1 documents this mismatch: a project could be launched manually,
but not from Obsidian on Windows. The latest Obsidian community-plugin review
also requires the plugin to stop recreating views, stop reloading itself when a
setting changes, and use `requestUrl` for the local-server probe.

## Goals

- Launch the configured project's locally installed `@slidev/cli` on Windows,
  macOS, and Linux without requiring a global `slidev` command.
- Never interpolate user-controlled paths into a shell command.
- Make setup verification and launch use the same resolved executable.
- Report one actionable error for each invalid part of the setup.
- Connect to an existing Slidev server without starting a duplicate process.
- Satisfy the unresolved Obsidian review requirements and current manifest/UI
  conventions.
- Add automated regression coverage and a reproducible release gate.

## Non-goals

- Installing Node.js or downloading packages on the user's behalf.
- Bundling the Slidev CLI, Vite, themes, or a starter project into `main.js`.
- Supporting mobile Obsidian; launching a local Node process is desktop-only.
- Supporting Yarn Plug'n'Play projects without a `node_modules` directory.

## Architecture

### Project diagnosis

A launcher module owns the external-process boundary. Given a project path, an
optional Node executable, an absolute Markdown entry path, and a port, it:

1. Validates the port and that the entry file exists.
2. Reads `<project>/node_modules/@slidev/cli/package.json`.
3. Resolves the package's `bin.slidev` entry and ensures it remains inside the
   package directory.
4. Resolves Node from the explicit setting or the inherited `PATH`.
5. Probes the resolved Node executable with `--version`.
6. Returns a typed launch specification containing an executable, an argument
   array, a working directory, and display metadata.

Every failure is represented by a stable error code plus a user-facing message.
The settings “Verify” action and presentation launch call this same function.
A globally installed Slidev binary is never considered.

### Process launch

Before launch, the plugin creates a unique temporary Markdown entry directly in
the configured project. It imports the active vault note with Slidev's
supported `src` frontmatter and carries over the note's deck headmatter on a
separate disabled configuration slide. A matching temporary addon contributes
a Vite configuration that allowlists the vault root, so note-relative assets
remain available without loading the vault as an addon or replacing the
project's own Vite configuration. Slidev therefore retains the configured
project as its root and resolves that project's themes, addons, components,
snippets, setup files, and public assets. Both temporary artifacts are removed
on restart or close.

The plugin then starts Slidev as:

```text
<node> <local-slidev-bin> <project-local-temporary-entry> --port <port>
```

It uses `child_process.spawn(executable, args, { cwd, shell: false })`. Paths are
separate arguments, so whitespace and shell metacharacters are data rather than
syntax. The spawned process belongs to the presentation component and is killed
when the view closes. Restarts replace the prior child without registering
global process listeners.

### Server connection

The view probes `http://localhost:<port>/` with Obsidian `requestUrl`. Slidev's
default development server may bind to the IPv6 loopback address, so forcing
`127.0.0.1` would fail on otherwise healthy installations. When a
server already responds, the view connects without requiring a local CLI and
without spawning another process. When it is down, launch is attempted only
after the active file and project setup have been diagnosed.

### Settings and migration

The arbitrary “Initial script” setting is replaced by an optional “Node
executable” path. An empty value means automatic lookup from `PATH`. Existing
saved `initialScript` data is ignored safely; all other settings are preserved.
The default Slidev project path is empty because normal Obsidian/BRAT installs
do not contain the repository's development template.

Saving settings persists data without invoking plugin lifecycle methods.
Behavior that depends on a setting reads the current settings object at the
time it runs. The Markdown post-processor is registered once and exits early
when slide numbering is disabled.

### View lifecycle

Activating the command or ribbon reveals an existing presentation leaf when
one exists. Otherwise it creates a leaf and reveals it. It never detaches an
existing custom view as part of activation.

## Error handling

Expected setup failures are shown as concise notices and in the presentation
fallback. Child-process stderr remains available in the log. Exit code `0` is
not displayed as an error, and duplicate `exit`/`close` messages are avoided.
Unexpected exceptions are converted to a generic launch failure while their
safe message is retained for diagnostics.

## Security model

The project path, Node path, and active note path are untrusted inputs. The
launcher validates file boundaries and passes all values as argument-array
entries with `shell: false`. It performs no package installation and no remote
download. The generated bridge allowlists only the local vault root in Vite,
denies `.obsidian`, unrelated presentation sources, and common configuration
formats, and leaves the CLI bound to `localhost`. The README discloses the
configured project access, temporary-file contents, vault allowlist, and
external process, and tells users to run only trusted Slidev content.

## Testing

Unit and integration tests cover:

- a global Slidev installation cannot validate a project without a local CLI;
- package metadata resolves the local CLI entry safely;
- malformed or escaping `bin` entries are rejected;
- missing project, CLI, entry file, Node, and invalid port have distinct errors;
- project and note paths containing spaces/metacharacters remain single args;
- an external vault note is imported through a project-local entry so the real
  Slidev CLI resolves the configured project's theme, components, snippets,
  and the vault's note-relative assets;
- the bridge serves vault media while rejecting direct requests for unrelated
  Markdown, configuration data, and `.obsidian` metadata;
- the launcher uses `shell: false` and can execute a fake local CLI end to end;
- an already-running server does not trigger a second launch;
- settings migration preserves supported values and removes the old script.

CI runs tests, type checking, formatting checks, lint checks, and the production
build on Windows, macOS, and Linux where practical. A manual smoke test launches
the checked-in Slidev fixture through the same launcher and verifies its HTTP
response.

## Release and submission

- Update manifest wording to capitalize Slidev and end the description with a
  period while keeping the valid `slidev` ID and `Slidev` name.
- Correct installation documentation: Community Plugins is unavailable until
  the new submission passes; BRAT/manual release installation are available.
- Fix the release ZIP name and run verification before publishing assets.
- Keep generated `main.js` and `styles.css` out of source control; attach them
  to the matching GitHub release.

## Alternatives considered

### Keep `npm run dev`

This follows common Slidev project scripts, but it still requires locating the
correct npm wrapper in a GUI process and handling `npm.cmd` on Windows. It also
makes verification depend on user-defined script contents.

### Auto-install with `npm exec`

This reduces setup steps but can download and execute packages implicitly in a
non-interactive process. That side effect is unsuitable as the safe default.

### Bundle or embed Slidev

This removes the external CLI requirement but substantially enlarges the plugin
and couples the Obsidian process to Vite/esbuild and project-relative modules.
The project has already encountered this dependency-resolution failure mode.

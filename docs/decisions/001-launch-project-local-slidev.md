# ADR-001: Launch the project-local Slidev CLI with Node

## Status

Accepted

## Date

2026-07-11

## Context

The previous launcher searched for `slidev` but executed an npm script through
a shell. Global installations could produce false-positive validation, GUI
processes often inherit a different `PATH` than terminals, and interpolated
paths were unsafe and non-portable.

## Decision

Resolve `bin.slidev` from the configured project's installed
`@slidev/cli/package.json`, resolve an external Node executable, and spawn Node
with the CLI, a project-local temporary entry, and the port as separate
arguments with `shell: false`. The temporary entry imports the active note and
copies its deck headmatter. A companion temporary addon contributes only a
Vite file-system allowlist for the vault. This keeps Slidev's dependency root
in the configured project, retains the project's components and configuration,
and preserves source-relative assets and live updates for a vault stored
elsewhere.

Node and the local Slidev dependency remain explicit user prerequisites. The
plugin diagnoses them but does not install or download them.

## Alternatives considered

- `npm run dev`: rejected as the primary path because npm wrapper resolution
  remains platform- and environment-dependent.
- `npm exec`: rejected because it may download packages automatically.
- Bundled/in-process Slidev: rejected because of bundle size and fragile
  Vite/esbuild/project-module resolution inside Obsidian.

## Consequences

- Launch behavior is deterministic and does not depend on a global Slidev.
- Windows and paths containing spaces use the same argument model as POSIX.
- Users with Node installed only through a shell-specific version manager may
  need to configure the absolute Node executable path.
- Projects must have a conventional `node_modules/@slidev/cli` installation.
- Projects must be writable while the plugin creates and removes a temporary
  `.obsidian-slidev-<id>.md` entry and `.obsidian-slidev-<id>/` bridge.

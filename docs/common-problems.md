# Common problems

## Node.js was not found

Obsidian is a desktop app, so it may inherit a different `PATH` from your
terminal—especially when Node.js is installed through a shell-based version
manager. In **Settings → Slidev**, enter the absolute path to the Node.js
executable, then select **Verify** again.

Use `which node` on macOS/Linux or `Get-Command node` in PowerShell to find the
path. The plugin invokes that executable directly and does not source shell
profile files.

## The local Slidev package is missing

The selected project must contain
`node_modules/@slidev/cli/package.json`. Install the project's dependencies and
verify the same folder again. A globally installed `slidev` command is ignored
deliberately.

## The server does not become reachable

Check that no unrelated process occupies the configured port. Enable **Debug
mode** to see Slidev's process output, then correct the reported theme, addon,
or project error and select **Start** again.

## Temporary Slidev files remain

The plugin normally removes its `.obsidian-slidev-<id>.md` entry and matching
`.obsidian-slidev-<id>/` bridge when the view restarts or closes. If Obsidian
was terminated abruptly, stop Slidev and delete those matching artifacts from
the configured project.

## Development build output

Vite creates the configured output directory automatically. Production builds
use `dist/`; for development, set `OUT_DIR` to the target vault's
`.obsidian/plugins/slidev` directory and run `pnpm dev`.

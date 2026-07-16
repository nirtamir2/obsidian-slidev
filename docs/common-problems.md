# Common problems

For quick-setup problems, select **Retry setup** and expand **View log** in the
presentation view or **Settings → Slidev**. For a manually configured project,
start with **Settings → Slidev → Verify**. Verification checks the project,
its local `@slidev/cli` installation, and the Node.js executable without
starting a presentation.

## No active Markdown file

The plugin presents the active file, and that file must already exist as a
Markdown note in a vault stored on the local file system. Open or create a
`.md` note, save it, and reopen the presentation view.

## Node.js was not found

Obsidian is a desktop app, so it may inherit a different `PATH` from your
terminal—especially when Node.js is installed through a shell-based version
manager. In **Settings → Slidev**, enter the absolute path to the Node.js
executable, then select **Verify** again.

Use `which node` on macOS/Linux or `Get-Command node` in PowerShell to find the
path. The plugin invokes that executable directly and does not source shell
profile files. Enter the executable itself, not the containing directory and
not a shell command such as `nvm use`.

## npm was not found

Quick setup needs npm's `npm-cli.js` installed alongside the configured Node.js
executable. Install the standard Node.js distribution from
[nodejs.org](https://nodejs.org/en/download), restart Obsidian, and retry. If
you selected a custom Node.js executable in **Settings → Slidev**, make sure it
belongs to an installation that also includes npm.

The plugin invokes npm through Node.js with structured arguments. It does not
run a shell command or use a globally installed `slidev` executable.

## The `.slidev` folder is already in use

Quick setup owns only the `<your-vault>/.slidev/` directory it created and
marked. It stops rather than overwriting an existing folder, package file, or
symlink it cannot verify as its own.

Rename the existing `.slidev` folder, or configure that project manually if it
already contains `node_modules/@slidev/cli/package.json`. Never remove it until
you have checked that it does not contain work you need.

## Quick setup did not finish

Keep Obsidian open and retry with a working network connection. The plugin
reuses its generated `package.json`, and npm can continue from files already
downloaded. Expand **View log** to see npm's output.

Quick setup creates `.slidev/package.json`, npm's lockfile, and `node_modules`
inside the vault. It runs npm install scripts, just like running `npm install`
in a terminal. The plugin never deletes this folder automatically. If you no
longer want the generated project, close its presentation view, confirm the
`package.json` contains the `obsidianSlidev` marker, and delete `.slidev`
yourself.

## The local Slidev package is missing

The selected project must contain
`node_modules/@slidev/cli/package.json`. Install the project's dependencies and
verify the same folder again. A globally installed `slidev` command is ignored
deliberately.

If the package is listed in the project's `package.json` but the file is
missing, run the package manager's install command from that project folder
(for example, `pnpm install` or `npm install`).

## The project folder cannot be verified

Select the Slidev project root, not its `node_modules` directory and not the
Obsidian vault. The selected folder must be an existing, writable directory
containing `node_modules/@slidev/cli/package.json` after dependencies are
installed.

## The server does not become reachable

Check that no unrelated process occupies the configured port. If the process
on that port is a Slidev server you intend to use, select **Check again**. If it
is unrelated, stop it or configure another port from 1 through 65535.

Enable **Debug mode** to expose **Start**, **Stop**, and **View log** controls
and to inspect Slidev's process output. Correct the reported theme, addon, or
project error, then select **Start** again. The plugin waits up to 30 seconds
for a newly launched server to become reachable.

## Note-relative images or project features do not work

The active note remains in the vault, but Slidev runs from the configured
project so it can use that project's themes, addons, components, and installed
dependencies. Keep those dependencies in the configured project. Reference
vault media with paths that are valid from the note; the temporary bridge
allows Slidev's Vite server to serve permitted files below the vault root.

Slidev Markdown can execute Vue and JavaScript. Only use notes and project code
you trust.

## Temporary Slidev files remain

The plugin normally removes its `.obsidian-slidev-<id>.md` entry and matching
`.obsidian-slidev-<id>/` bridge when the view restarts or closes. If Obsidian
was terminated abruptly, stop Slidev and delete those matching artifacts from
the configured project.

## Development build output

Vite creates the configured output directory automatically. Production builds
use `dist/`. For development, create `.env.development.local` in the repository
root, set `OUT_DIR` to the absolute path of the target vault's
`.obsidian/plugins/slidev` directory, and run `pnpm dev`.

```dotenv
OUT_DIR=/absolute/path/to/vault/.obsidian/plugins/slidev
```

Vite writes `main.js`, `manifest.json`, and `styles.css` to that directory.

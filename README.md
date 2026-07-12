# Slidev

Preview Markdown presentations from Obsidian with [Slidev](https://sli.dev/).

[![Slidev presentation view in Obsidian](./docs/screenshot.png)](./docs/screencast.mp4)

> [!IMPORTANT]
> Slidev is not yet available in the Obsidian Community Plugins directory. Until the plugin is accepted, install it with BRAT or from a GitHub release.

## Requirements

- The desktop version of Obsidian. The plugin starts a local Node.js process and does not support mobile Obsidian.
- [Node.js](https://nodejs.org/en/download) supported by your Slidev project. The current version of Slidev requires Node.js 20.12 or later.
- A Slidev project with `@slidev/cli` installed locally in its `node_modules` directory. A global `slidev` command is neither required nor used.
- Write access to the Slidev project while a presentation starts. The plugin creates a hidden temporary entry and bridge configuration there so Slidev can use that project's themes, addons, and components with notes stored elsewhere.

The plugin does not install or update Node.js, Slidev, themes, or project dependencies.

## Install the plugin

### BRAT

1. Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian Community Plugins directory.
2. In BRAT settings, select **Add beta plugin**.
3. Enter `https://github.com/nirtamir2/obsidian-slidev` and add the plugin.
4. In **Settings → Community plugins**, enable **Slidev**.

### Manual installation

1. Open the [latest GitHub release](https://github.com/nirtamir2/obsidian-slidev/releases/latest).
2. Download `main.js`, `manifest.json`, and `styles.css`.
3. Create `<your-vault>/.obsidian/plugins/slidev/` and place the three files in that directory.
4. Restart Obsidian, then enable **Slidev** under **Settings → Community plugins**.

## Set up Slidev

Create a Slidev project by following the [official getting-started guide](https://sli.dev/guide/) and install its dependencies. For example:

```sh
pnpm create slidev
cd <your-slidev-project>
pnpm install
```

Then open **Settings → Slidev** and configure:

1. **Slidev project folder**: the project directory that contains `node_modules/@slidev/cli/package.json`.
2. **Node.js executable**: leave this empty to find `node` from Obsidian's inherited `PATH`, or enter the absolute executable path if a shell-based version manager is not visible to Obsidian.
3. **Port**: the local port for the Slidev server. The default is `3030`.
4. Select **Verify** and resolve any reported setup problem.

Open a Markdown note and run **Slidev: Open presentation view** from the command palette. If a Slidev server already responds on the configured port, the plugin connects to it. Otherwise, it starts the configured project's local Slidev CLI for the active note.

## Disclosures

Slidev preserves Obsidian's offline-first model, with the following local access required for its core functionality:

- **Network use:** The plugin requests and embeds the local Slidev server at `http://localhost:<port>/`. While a plugin-started server is running, its local Vite server may serve requested assets under the vault root so note-relative media works. The generated bridge blocks direct access to `.obsidian`, unrelated Markdown/Canvas files, and common configuration-data formats. The plugin does not contact a remote service and does not include telemetry. A presentation, theme, or Slidev dependency may make its own network requests if you configure it to use remote assets.
- **Files outside the vault:** The configured Slidev project may be outside the Obsidian vault. The plugin reads the project's `@slidev/cli` package metadata and executable files to validate and launch that local installation. At launch it creates a temporary `.obsidian-slidev-<id>.md` entry and matching `.obsidian-slidev-<id>/` bridge directory in the project. The entry contains a copy of the deck headmatter and a path reference that imports the active note. The bridge contains a minimal package manifest and Vite configuration with the absolute vault path and deny rules; it does not replace the project's own Vite configuration. Both artifacts are removed when the owned process exits or the view restarts/closes. If Obsidian is terminated abruptly, matching leftovers may retain those paths and headmatter but are safe to delete after stopping Slidev. The plugin does not install packages, and Slidev may create its normal cache files while running.
- **External process:** When a presentation needs a server, the plugin starts the configured Node.js executable with the project-local Slidev CLI and the temporary project-local entry as separate arguments, without a shell. That entry imports the active Markdown file. The plugin stops only the process it started when the presentation view closes; it does not stop a server that was already running.
- **Trusted content:** Slidev presentations can compile and execute Vue/JavaScript and read files they reference. Only launch notes, themes, addons, and project code you trust.

## Development

```sh
git clone https://github.com/nirtamir2/obsidian-slidev.git
cd obsidian-slidev
pnpm install
pnpm test
pnpm run type-check
pnpm run build
```

Production builds are written to `dist/`. To build directly into a development vault, set `OUT_DIR` to that vault's `.obsidian/plugins/slidev` directory in a local Vite environment file.

[See common development problems](./docs/common-problems.md).

## Credits

- [Advanced Slides](https://github.com/MSzturc/obsidian-advanced-slides)
- [Slidev](https://github.com/slidevjs/slidev) and [Slidev for VS Code](https://github.com/slidevjs/slidev-vscode)
- [Solid](https://github.com/solidjs/solid)
- Vite starters: [Obsidian Enhancing Export](https://github.com/mokeyish/obsidian-enhancing-export) and [Obsidian Svelte Plugin](https://github.com/emilio-toledo/obsidian-svelte-plugin)
- [Execute Code](https://github.com/twibiral/obsidian-execute-code)
- [Obsidian Pandoc](https://github.com/OliverBalfour/obsidian-pandoc)

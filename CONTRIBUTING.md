# Contributing

Thanks for helping improve Slidev for Obsidian.

## Development setup

Install Node.js 22.13 or newer within Node.js 22, or Node.js 24 and newer.
Node.js 24 LTS is the version used in CI. The repository pins pnpm through the
`packageManager` field, so Corepack can select the matching version
automatically.

```sh
git clone https://github.com/nirtamir2/obsidian-slidev.git
cd obsidian-slidev
corepack enable
pnpm install --frozen-lockfile
```

To build directly into a development vault, create
`.env.development.local` with an absolute output path, then start the watcher:

```dotenv
OUT_DIR=/absolute/path/to/vault/.obsidian/plugins/slidev
```

```sh
pnpm dev
```

Do not commit the machine-specific environment file or generated build output.

## Verification

Add or update tests for behavior changes and bug fixes. Before opening a pull
request, run the complete local verification pipeline:

```sh
pnpm run ci
```

If you change the bundled Slidev example or its dependencies, verify that
project separately:

```sh
cd slidev-template
pnpm install --frozen-lockfile
pnpm build
pnpm audit
```

## Pull requests

- Keep each change focused and explain the user-visible reason for it.
- Preserve the plugin's desktop-only disclosures for local network, filesystem,
  and process access when those boundaries change.
- Do not include `dist/`, vault workspace state, local environment files, or
  unrelated formatting changes.
- Include reproduction steps and a regression test for bug fixes.

Release tags and Community Plugin submissions are maintained by the repository
owner after changes are reviewed and merged.

# Obsidian Slidev Plugin

This is [obsidian](https://obsidian.md) plugin that integrates [slidev](https://github.com/slidevjs/slidev) presentations.

[![screencast](./docs/screenshot.png)](./docs/screencast.mp4)

## Installation

1. Make sure you have node.js installed on your computer or [install it](https://nodejs.org/en/download/package-manager).
2. Install [slidev](https://sli.dev/) template by following the [installation guide](https://sli.dev/guide/install.html#starter-template) or just running `npm init slidev@latest`. Make sure to install dependencies `npm i`.
3. Search `obsidian-slidev` in the community plugins of obsidian (you can also download the zip file from the latest release in the [release page](https://github.com/nirtamir2/obsidian-slidev/releases) and put it inside `<your-vault>/.obsidian/plugins`, install it and enable it.
4. Change `obsidian-slidev` settings
   1. Add `node` path to environment variable `PATH` or set absolute path of node in the obsidian-slidev setting `initial script`.
   2. Paste the path of your slidev template into the obsidian-slidev `Slidev template location`. Click verify and make sure the location is valid.
5. Now you can execute the command `Slidev: open slidev presentation view`.

## Contributing

`git clone https://github.com/nirtamir2/obsidian-slidev.git`
Change `.env` file content to

```dotenv
OUT_DIR="<relative-path-to-your-vault>/.obsidian/plugins/obsidian-slidev"
```

Also make sure you have existing folders for `dist` in this repo, and for your `OUT_DIR` in your vault (you may need to create `<relative-path-to-your-vault>/.obsidian/plugins/obsidian-slidev` folder.

[See more common issues here](./docs/common-problems.md)

## Credits

-   [Advances slides](https://github.com/MSzturc/obsidian-advanced-slides)
-   Slidev
    -   [slidev](https://github.com/slidevjs/slidev)
    -   [slidev-vscode](https://github.com/slidevjs/slidev-vscode)
-   Vite Starters
    -   with solid [obsidian-enhancing-export](https://github.com/mokeyish/obsidian-enhancing-export)
    -   with svelte [obsidian-svelte-plugin](https://github.com/emilio-toledo/obsidian-svelte-plugin)
-   [obsidian-execute-code](https://github.com/twibiral/obsidian-execute-code) - allows executing code in bash.
-   [obsidian-pandoc](https://github.com/OliverBalfour/obsidian-pandoc) allow running executable.

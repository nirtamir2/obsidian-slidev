# Obsidian Slidev Plugin

This is [obsidian](https://obsidian.md) plugin that integrates [slidev](https://github.com/slidevjs/slidev) presentations.

[![screencast](./docs/screenshot.png)](./docs/screencast.mp4)

## Credits

-   [Advances slides](https://github.com/MSzturc/obsidian-advanced-slides)
-   Slidev
    -   [slidev](https://github.com/slidevjs/slidev)
    -   [slidev-vscode](https://github.com/slidevjs/slidev-vscode)
-   Vite Starters
    -   with solid [obsidian-enhancing-export](https://github.com/mokeyish/obsidian-enhancing-export)
    -   with svelte [obsidian-svelte-plugin](https://github.com/emilio-toledo/obsidian-svelte-plugin)
- [obsidian-execute-code](https://github.com/twibiral/obsidian-execute-code) - allows executing code in bash.

## Instructions
Add your zsh/bash to settings. You should have node.js installed. You can write `source ./zshrc` if you use zsh. The plugin will install slidev and execute it. I try in obsidian-exeute-code the command:


```bash
# This gives me access to node.js & pnpm
source $HOME/.zshrc 

cd Users/nirtamir/dev/slides/introduction-to-solid-js/
pnpm dlx @slidev/cli slides.md
```
With the bash settings of shell path `/opt/homebrew/bin/zsh` (`which zsh` output)

---

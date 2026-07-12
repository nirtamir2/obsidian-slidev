# Documentation accuracy audit

## Goal

Make the plugin documentation accurate, concise, and usable by someone installing the plugin, configuring a local Slidev project, troubleshooting startup, or contributing to the repository.

## Scope

- Audit `README.md`, `docs/common-problems.md`, and `slidev-template/README.md` against the current implementation and package scripts.
- Correct inaccurate commands, labels, requirements, paths, and behavior descriptions.
- Reorganize the root README around the reader journey: install, configure, present, troubleshoot, and develop.
- Explain settings and common failures where users encounter them, while keeping detailed troubleshooting in `docs/common-problems.md`.
- Verify repository-relative links and local media targets.
- Preserve the existing disclosure of local network, filesystem, process, and trusted-content behavior.

## Content rules

- Treat the source code, `package.json`, `manifest.json`, and build configuration as the authority for current behavior.
- Use the exact labels shown by Obsidian and the plugin UI.
- Include commands that can be run as written and state their working directory when it is not obvious.
- Avoid promising behavior the plugin does not implement.
- Link to official upstream documentation for Slidev and Node.js rather than duplicating version-sensitive guidance.
- Keep internal implementation rationale in the existing decision record instead of expanding the user-facing README.

## Verification

- Check every Markdown link and repository-relative media target.
- Compare documented scripts with `package.json` and `slidev-template/package.json`.
- Compare documented settings and commands with `SlidevSettingTab.ts` and `SlidevPlugin.ts`.
- Run formatting checks and the repository test/build pipeline after edits.
- Review the final diff for unsupported claims, placeholders, accidental changes, and secrets.

## Out of scope

- Plugin behavior changes.
- New screenshots or screencasts.
- Changes to historical plans or the accepted launcher decision record unless they contain a broken link that affects navigation.
- The pre-existing change to `slidev-template/.obsidian/workspace.json`.

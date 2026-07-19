# Changelog

## 0.2.0 - 2026-07-19

### Added

- Plugin settings are searchable in Obsidian 1.13 and newer while retaining
  the existing settings experience on older supported versions.
- A concise onboarding presentation in the bundled example vault.

### Changed

- The bundled example vault now opens the onboarding presentation and uses
  current plugin metadata.

## 0.1.0 - 2026-07-16

### Added

- One-click **Set up Slidev** onboarding in the presentation view and plugin
  settings.
- A vault-local `.slidev` starter with pinned dependencies, live progress,
  retry support, setup logs, verification, and automatic configuration.

### Changed

- New installations lead with quick setup while preserving the existing
  manually configured project workflow.
- Setup and troubleshooting documentation now explains npm, network,
  filesystem, and install-script behavior before users opt in.

### Security

- npm runs through the discovered Node.js runtime with structured arguments
  and no shell.
- Quick setup refuses symlinked or unowned `.slidev` content, bounds retained
  process output, and supports standard Windows, POSIX, and Homebrew npm
  layouts.

# Community Review Cleanup Design

## Goal

Resolve all actionable findings reported for Slidev 0.0.18 by the Obsidian community plugin review while preserving plugin behavior and avoiding maintenance work on third-party declarations.

## Scope

- Remove the redundant product name from the plugin manifest description.
- Add explanations to required lint directive comments.
- Use the active document and its window for popout-compatible DOM events and timers.
- Replace direct browser local storage access with Obsidian's vault-scoped application storage API.
- Replace dependencies flagged by the review when direct platform or existing alternatives are available.
- Stop publishing the unsupported release zip.
- generate GitHub artifact attestations for the three supported release assets.
- Remove obsolete vendored type declarations if repository usage and the full build confirm they are unnecessary; otherwise exclude third-party declaration findings without weakening checks on first-party source.

Direct filesystem and shell execution warnings are intrinsic to launching a local Slidev process and managing its generated project files. They will remain because eliminating those capabilities would remove the plugin's core function.

## Implementation

Changes will follow existing repository patterns and stay limited to metadata, source locations named by the review, dependency configuration, release automation, and focused validation where useful. Existing unrelated working-tree changes will not be modified.

For window compatibility, event registration will use Obsidian's active document, and timers will be called through the relevant document window or global window as appropriate. Hot-module reload state will use `App#loadLocalStorage` and `App#saveLocalStorage`, retaining the existing restore-on-completion behavior.

The release workflow will upload only `main.js`, `manifest.json`, and `styles.css`. It will request the minimum GitHub permission required to create attestations and attest those exact built files before creating the draft release.

## Validation

- Run formatting, linting, type checking, tests, build, and build-asset verification through `pnpm ci`.
- Confirm no reviewed first-party patterns remain with targeted searches.
- Validate workflow syntax and inspect the final diff for unrelated changes.
- Confirm third-party typing files are not needed before deleting them.

## Success Criteria

The next release contains only supported assets with attestations, both reported errors are eliminated, all feasible first-party recommendations and warnings are resolved, and the full local CI pipeline passes. Any remaining community-review warnings are explicitly limited to capabilities required by the plugin's stated purpose.

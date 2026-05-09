## Why

The built-in runtime debug panel is not useful enough to justify remaining in the core framework. Mini-game platform tools already provide equivalent or better runtime performance and environment inspection, while the current module adds framework API surface and lifecycle work that every project carries.

## What Changes

- **BREAKING** Remove the `tyou.debug` public framework entry and its lifecycle calls.
- **BREAKING** Delete the framework debug panel implementation under `Client/assets/ty-framework/core/debug/`.
- Update framework documentation so startup/module references no longer list `debug` as a core module.
- Keep unrelated diagnostics, platform tooling, logging, and external mini-game debug workflows outside this change.

## Capabilities

### New Capabilities

- `framework-runtime`: Runtime framework module composition and lifecycle expectations after removing the built-in debug module.

### Modified Capabilities

- None.

## Impact

- Affected framework code: `Client/assets/ty-framework/Tyou.ts`, `Client/assets/ty-framework/core/debug/`.
- Affected API: `tyou.debug` will no longer exist; any business code calling `tyou.debug.enable()`, `disable()`, `toggle()`, or `isEnabled` must stop doing so.
- Affected docs: `tyou-dev` architecture reference and any AI workflow/module documentation that lists `debug` as a framework module.
- Risk: this is a framework-level breaking change and requires developer confirmation before implementation.

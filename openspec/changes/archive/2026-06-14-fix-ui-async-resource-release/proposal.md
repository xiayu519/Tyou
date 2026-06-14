## Why

UI helper resources can complete after their owning UI has already been released. In that race, assets loaded by `UIBase` may miss the normal auto-release pass and keep their resource reference, causing long-lived SpriteFrame or SpriteAtlas retention.

## What Changes

- Add a lifecycle guard so `UIBase` immediately releases dynamic assets that arrive after the UI has been released.
- Ensure `UIBase.getSpriteFromAtlas()` releases a loaded atlas when the requested SpriteFrame is missing.
- Ensure `tyou.res.loadSpriteFromAtlas()` releases a loaded atlas when the requested SpriteFrame is missing.
- Keep normal UI-open, resource-load, UI-close behavior unchanged.
- Recheck resource helper paths for similar addRef/decRef pairing gaps.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-resource-safety`: UI dynamic resources that arrive after owner release must still be paired with `tyou.res.decRef`.
- `runtime-ui-lifecycle`: UI release state must prevent late async resource registration from leaking lifecycle-owned assets.

## Impact

- Affected code: `Client/assets/ty-framework/module/ui/UIBase.ts`, `Client/assets/ty-framework/module/loader/ResourceModule.ts`.
- Affected behavior: UI image helper lifecycle cleanup for late async completions and atlas sprite lookup failures.
- No public API additions are intended; `addAutoReleaseAsset()` may return a registration result for internal helper use.

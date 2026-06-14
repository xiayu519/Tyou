## Context

`UIBase` registers dynamic UI resources in `_dynamicsAssets`, and `UIBase.onRelease()` releases the set through `tyou.res.decRef()`. The normal path works when resources finish loading before the window is closed. The gap is the async race where a helper awaits `tyou.res.*`, the window closes, and the resource is registered after `onRelease()` already ran.

The same helper also has an atlas lookup edge: `getSpriteFromAtlas()` can load and retain an atlas, fail to find the requested SpriteFrame, then return before registering or releasing that atlas.

## Goals / Non-Goals

**Goals:**

- Preserve normal UI dynamic resource auto-release behavior.
- Release UI helper resources that arrive after `UIBase.onRelease()` has already run.
- Release an atlas loaded by `getSpriteFromAtlas()` when the requested SpriteFrame is missing.
- Release an atlas loaded by `tyou.res.loadSpriteFromAtlas()` when the requested SpriteFrame is missing.
- Recheck resource module helper paths for similar lifecycle pairing gaps.

**Non-Goals:**

- Do not change resource index generation, bundle loading, or `tyou.res` public loading semantics.
- Do not introduce a new cancellation-token API for sprite assignment in this change.
- Do not change Prefab, Scene, Cocos meta, or generated UI scripts.

## Decisions

1. Track UI release state inside `UIBase`.
   - `UIWindow` already exposes `isDestroyed`, but `UIBase` helpers live on the base class and should not depend on subclass state.
   - `onRelease()` will mark the base as released before clearing existing resources.

2. Let `addAutoReleaseAsset()` return whether the asset was registered.
   - Existing callers may ignore the return value.
   - UI helper methods can return `null` when registration fails because the UI has been released.
   - If the UI has already been released, `addAutoReleaseAsset()` immediately calls `tyou.res.decRef(asset)`.

3. Keep `SpriteAssignService` unchanged.
   - It already protects stale request and invalid-target paths.
   - The owner-lifecycle guard belongs in `UIBase`, which owns dynamic resource registration.

4. Fix the atlas missing-sprite branch locally in `getSpriteFromAtlas()`.
   - The loaded atlas is the retained asset; the returned SpriteFrame is derived from it.
   - If lookup fails, release the atlas immediately.

5. Apply the same missing-sprite release rule to `ResourceModule.loadSpriteFromAtlas()`.
   - This is the resource facade equivalent of the UI helper failure branch.
   - Successful loads keep existing behavior unchanged.

## Risks / Trade-offs

- [Risk] Returning `null` from a helper after late-release can change continuation behavior for code that expected the loaded asset even after UI close. -> Mitigation: this only applies when the UI owner has already released; continuing to use that asset would be outside the UI lifecycle.
- [Risk] `addAutoReleaseAsset()` now has side effects after release. -> Mitigation: this matches the lifecycle contract that assets entering a released UI owner must be immediately paired with `decRef`.
- [Risk] Similar scene lifecycle races may exist. -> Mitigation: include a focused resource-module and lifecycle-container review task; do not expand implementation unless the same UI-requested scope requires it.
- [Risk] Managed loader cache-hit owner reference semantics may need a broader review. -> Mitigation: report it from this review but keep this change focused on late UI registration and lookup-failure release pairing.

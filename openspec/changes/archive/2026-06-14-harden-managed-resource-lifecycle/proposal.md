## Why

Tyou's managed resource cache must preserve a delay window between framework `decRef` calls and Cocos Creator's asynchronous release manager, while still keeping `addRef/decRef` ownership exact. The current loader mixes caller ownership and cache bookkeeping, which can either keep cached resources alive too long or under-count multiple owners created through cache hits and pending-load fan-out.

## What Changes

- Rework managed resource ownership so cache entries are reuse indexes, not independent long-lived owners.
- Keep Tyou's delayed release guard, but delay the Cocos release trigger until the resource has remained at `refCount === 0` for the configured delay.
- Ensure every successful returned managed resource has a caller-owned reference, including cache hits and coalesced pending loads.
- Add explicit lifecycle handling for runtime remote `SpriteFrame` resources and their generated texture/image assets.
- Tighten atlas sprite-frame ownership and async error paths so resources loaded successfully are released when assignment or holder setup fails.
- Non-goal: do not force release resources through Cocos `assetManager.releaseAsset` while normal owners may still exist.
- Non-goal: do not change asset-index generation, Luban data, Prefabs, Scenes, or Cocos meta assets.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-resource-safety`: Managed resource cache, pending-load fan-out, delayed release, remote sprite-frame lifecycle, and atlas sprite-frame ownership requirements change.
- `runtime-ui-lifecycle`: UI dynamic resources must continue to release late-arriving resources after a UI is closed while relying on the hardened resource ownership contract.

## Impact

- Affected framework files:
  - `Client/assets/ty-framework/module/loader/ManagedAssetLoader.ts`
  - `Client/assets/ty-framework/module/loader/ReleaseScheduler.ts`
  - `Client/assets/ty-framework/module/loader/ResourceModule.ts`
  - `Client/assets/ty-framework/module/loader/SpriteAssignService.ts`
  - `Client/assets/ty-framework/module/ui/UIBase.ts`
- The public `tyou.res.addRef/decRef`, `loadAssetAsync`, `loadDirAsync`, `loadSprite`, `loadAtlas`, `loadSpriteFromAtlas`, and `setSpriteAsync` APIs keep their names, but their lifecycle guarantees become stricter.
- Verification must include OpenSpec validation, whitespace diff checks, and targeted static review of resource ownership paths.

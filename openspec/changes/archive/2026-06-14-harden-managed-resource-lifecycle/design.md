## Context

Tyou runs on Cocos Creator 3.8.7. In Cocos, `Asset.decRef()` defaults to `decRef(true)`, which submits the asset to `ReleaseManager.tryRelease()`; the release manager then frees assets asynchronously on the next tick if the ref count and dependency graph allow it. Tyou already has a delayed release scheduler because framework ownership and Cocos release timing are not synchronous.

The current managed loader blurs two concepts:

- caller ownership: the reference returned to UI, Audio, Pool, Table, or business code;
- cache bookkeeping: the map entry that allows short-term reuse of a recently loaded asset.

That blur means cache references can keep assets alive indefinitely, while cache hits and pending-load fan-out can return resources without a new caller reference.

## Goals / Non-Goals

**Goals:**

- Preserve Tyou's delayed release window before handing a zero-ref asset to Cocos release.
- Make every successful returned managed resource own exactly one caller reference.
- Keep cache entries as reuse indexes rather than permanent resource owners.
- Make pending-load coalescing safe for multiple callers.
- Explicitly release runtime resources created for remote SpriteFrames.
- Tighten atlas and async holder failure paths so successful loads are paired with release when use fails.

**Non-Goals:**

- Do not force-release normal managed assets while any owner may still exist.
- Do not change asset-index generation or bundle indexing rules.
- Do not edit Prefab, Scene, Cocos `.meta`, Luban source, or generated data.
- Do not introduce a new external resource-management dependency.

## Decisions

### Decision: Cache maps are reuse indexes, not retained owners

`ManagedAssetLoader` will keep valid loaded assets in `_assetCache` and `_dirCache`, but inserting into these maps will not add an extra Cocos reference. The reference returned by Cocos load remains the first caller's owner reference. A cache hit will explicitly `addRef` before returning because it creates a new caller owner.

Alternative considered: keep one cache reference and track cache-ref count separately. This works but makes every release check depend on "only cache refs remain" state and keeps old complexity alive. A reuse-index cache matches the delay-window intent more directly.

### Decision: Framework `decRef` does not immediately trigger Cocos release

`ReleaseScheduler.decRef(asset)` will call `asset.decRef(false)` so Tyou can observe the post-release ref count during its configured delay window. Only after the asset remains at `refCount === 0` for `releaseDelay` will the scheduler remove managed cache entries and trigger Cocos release for that asset.

Alternative considered: keep using `asset.decRef()` and rely on cache refs to block Cocos release. This preserves safety only by keeping extra refs around and makes memory reclamation harder to reason about.

### Decision: Pending-load fan-out owns references per consumer

The pending-load table will count consumers waiting on a coalesced request. When one underlying Cocos load completes, the first successful result uses the Cocos-provided callback reference. Additional waiting consumers receive explicit `addRef` calls before completion callbacks or Promise resolution. Directory loads apply the same rule per asset in the returned array.

### Decision: Runtime remote SpriteFrames are managed as a resource group

Remote image-to-SpriteFrame creation constructs runtime-only objects (`ImageAsset`, `Texture2D`, `SpriteFrame`) that are not normal bundle dependency assets. The loader will track the generated texture/image for each remote SpriteFrame and release or destroy them when the SpriteFrame reaches delayed zero-ref release.

### Decision: Atlas helper returns caller-owned SpriteFrame

`loadSpriteFromAtlas` will return a SpriteFrame with its own caller reference and release the temporary atlas owner after lookup. UI atlas helpers can then register the returned SpriteFrame instead of relying on callers knowing that atlas ownership backs the result.

## Risks / Trade-offs

- Cache hit now increments owner refs explicitly -> callers that fail to release will leak more accurately and visibly. Mitigation: keep all framework helpers registering returned resources into holders or auto-release sets.
- `asset.decRef(false)` delays Cocos cleanup until the scheduler runs. Mitigation: keep existing short defaults and keep `setReleaseConfig` behavior.
- Runtime remote texture destruction is sensitive if the same SpriteFrame is reused. Mitigation: only destroy runtime texture/image for SpriteFrames created by Tyou's remote SpriteFrame path and only after the SpriteFrame reaches delayed zero-ref release.
- Atlas SpriteFrame ownership is tricky because SpriteFrames are sub-assets. Mitigation: retain the SpriteFrame returned to the caller and release the atlas owner after lookup; do not force-release the atlas or texture while the SpriteFrame still has refs.

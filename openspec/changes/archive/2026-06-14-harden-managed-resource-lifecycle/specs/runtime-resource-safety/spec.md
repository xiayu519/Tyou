## ADDED Requirements

### Requirement: Managed helper failures release loaded owners
The runtime resource API MUST release caller-owned resources when a helper loads an asset successfully but cannot attach, instantiate, assign, or register it into the intended lifecycle owner.

#### Scenario: Prefab instantiate or holder setup fails
- **WHEN** `tyou.res.loadGameObjectAsync` loads a Prefab but fails before returning a managed node
- **THEN** the loaded Prefab owner reference is released through `tyou.res.decRef`

#### Scenario: Spine target cannot keep loaded data
- **WHEN** a Spine helper loads SkeletonData but the target is invalid or holder setup fails
- **THEN** the loaded SkeletonData owner reference is released through `tyou.res.decRef`

## MODIFIED Requirements

### Requirement: UI window resources follow UI lifecycle
The runtime resource safety contract MUST treat UI Prefabs and UI dynamic assets as lifecycle-owned resources released by the UI close path, including dynamic assets that finish loading after their UI owner has already been released.

#### Scenario: UI window loads a Prefab
- **WHEN** a UI window loads its Prefab through `tyou.res.loadGameObjectAsync`
- **THEN** the resulting node owns the Prefab reference through `ResourceHolder`
- **AND** destroying the UI node releases that Prefab through the resource lifecycle

#### Scenario: UI registers dynamic assets
- **WHEN** a UI window loads SpriteFrames, SpriteAtlases, atlas SpriteFrames, or remote SpriteFrames through UIBase helpers
- **THEN** successful caller-owned assets are registered for UI auto-release
- **AND** closing the UI releases those assets through `tyou.res.decRef`

#### Scenario: UI dynamic asset arrives after release
- **WHEN** a UIBase helper finishes loading a dynamic asset after `UIBase.onRelease()` has already run
- **THEN** the asset is not registered into the released UI asset set
- **AND** the loaded asset is released through `tyou.res.decRef`

#### Scenario: UI atlas sprite lookup fails
- **WHEN** `UIBase.getSpriteFromAtlas()` loads a SpriteAtlas but cannot find the requested SpriteFrame
- **THEN** the loaded SpriteAtlas is released through `tyou.res.decRef`
- **AND** the helper returns `null`

#### Scenario: Resource atlas sprite lookup fails
- **WHEN** `tyou.res.loadSpriteFromAtlas()` loads a SpriteAtlas but cannot find the requested SpriteFrame
- **THEN** the loaded SpriteAtlas is released through `tyou.res.decRef`
- **AND** the helper returns `null`

#### Scenario: Resource atlas sprite lookup succeeds
- **WHEN** `tyou.res.loadSpriteFromAtlas()` loads a SpriteAtlas and finds the requested SpriteFrame
- **THEN** the returned SpriteFrame owns a caller reference that can be released through `tyou.res.decRef`
- **AND** the temporary SpriteAtlas owner reference is released through `tyou.res.decRef`

#### Scenario: UI load is cancelled
- **WHEN** a UI Prefab load completes after the UI was closed or cancelled
- **THEN** the loaded node is destroyed instead of being attached as an active managed window
- **AND** its resource holder can release the Prefab reference normally

### Requirement: Managed asset loading coalesces duplicate in-flight requests
The runtime resource API MUST avoid starting duplicate Cocos load operations for the same normalized resource request while a request is already in flight, and MUST give each successful caller its own owner reference.

#### Scenario: Duplicate asset requests share one in-flight load
- **WHEN** two callers request the same normalized asset before the first request completes
- **THEN** the resource API uses one underlying Cocos load operation
- **AND** both callers receive the loaded asset result
- **AND** both successful callers receive independent owner references

#### Scenario: Cached valid asset is reused
- **WHEN** a normalized asset request has a valid cached asset
- **THEN** the resource API returns the cached asset without starting a new underlying Cocos load operation
- **AND** the cache hit creates a new caller owner reference before returning the asset

#### Scenario: Cached valid directory is reused
- **WHEN** a normalized directory request has valid cached assets
- **THEN** the resource API returns the cached directory result without starting a new underlying Cocos load operation
- **AND** each returned asset receives a caller owner reference for that caller

#### Scenario: Scene assets are not retained in managed cache
- **WHEN** a load request returns a `SceneAsset`
- **THEN** the managed asset cache does not add a managed cache entry for that scene asset

### Requirement: Resource release remains delayed and ref-count aware
The runtime resource API MUST preserve delayed release semantics so managed assets are only removed from the managed cache and submitted to Cocos release after framework `decRef`, delay expiration, and a stable `refCount === 0` state.

#### Scenario: decRef queues asset for delayed release
- **WHEN** `tyou.res.decRef(asset)` is called for a valid asset
- **THEN** the asset reference count is decreased when possible without immediately triggering Cocos release
- **AND** the asset is added to the pending release queue when delayed release is enabled

#### Scenario: Pending asset starts delay after refCount reaches zero
- **WHEN** the release scheduler checks a pending valid asset whose `refCount` is greater than zero
- **THEN** the asset remains pending
- **AND** the zero-ref delay timer is not considered complete

#### Scenario: Pending asset is released only after stable zero
- **WHEN** a pending valid asset has remained at `asset.refCount === 0` for at least the configured release delay
- **THEN** the asset is removed from the managed cache
- **AND** the asset is submitted to Cocos release through the normal non-force release path

#### Scenario: addRef cancels pending release
- **WHEN** `tyou.res.addRef(asset)` is called for an asset currently waiting in the pending release queue
- **THEN** the asset is removed from the pending release queue

### Requirement: Managed release cancels matching in-flight requests
The runtime resource API MUST prevent in-flight managed loads from re-entering the managed cache after `releaseAll` has released their matching cache scope.

#### Scenario: releaseAll cancels pending managed asset load
- **WHEN** `tyou.res.releaseAll()` is called while a managed asset request is still in flight
- **THEN** the pending request does not add a managed cache entry after it completes
- **AND** it does not return a live owner reference to cancelled callers

#### Scenario: Bundle-scoped releaseAll cancels matching pending loads
- **WHEN** `tyou.res.releaseAll(bundle)` is called while managed asset or directory requests for that bundle are still in flight
- **THEN** pending requests for that bundle do not add managed cache entries after they complete
- **AND** pending requests for other bundles remain active

#### Scenario: releaseAll does not force active owners
- **WHEN** `tyou.res.releaseAll(bundle)` removes managed cache entries for assets that are still owned by UI, Audio, Pool, or other lifecycle holders
- **THEN** those active owner references are not force-released
- **AND** final Cocos release is deferred until normal owner `decRef` reaches stable zero

### Requirement: Remote SpriteFrame creation is lifecycle-managed
The runtime resource API MUST ensure SpriteFrames created from remote images have a managed caller reference and release their runtime-created texture resources after delayed zero-ref release.

#### Scenario: Remote image becomes SpriteFrame
- **WHEN** `tyou.res.setSpriteAsync` receives a remote image `url`
- **THEN** the created SpriteFrame is retained through the resource release scheduler before it is returned
- **AND** the caller can pair it with `tyou.res.decRef` or UI auto-release

#### Scenario: Remote SpriteFrame reaches stable zero
- **WHEN** a remote-created SpriteFrame has remained at `refCount === 0` for the configured release delay
- **THEN** the managed resource system releases the SpriteFrame through the normal release path
- **AND** it destroys or releases the runtime Texture2D/ImageAsset created only for that SpriteFrame

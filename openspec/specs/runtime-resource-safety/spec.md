# runtime-resource-safety Specification

## Purpose
Define the Tyou runtime resource-safety contract for asynchronous Sprite assignment and UI auto-release integration.
## Requirements
### Requirement: Sprite async assignment ignores stale requests
The runtime resource API MUST provide a Sprite assignment path that prevents stale asynchronous image loads from overwriting the latest request for the same Sprite.

#### Scenario: Older sprite request finishes last
- **WHEN** two async sprite assignments target the same Sprite and the older request completes after the newer request
- **THEN** the older request does not replace the SpriteFrame set by the newer request
- **AND** any SpriteFrame loaded only for the stale request is released through the resource lifecycle path

#### Scenario: Sprite target is destroyed before completion
- **WHEN** an async sprite assignment completes after its Sprite target becomes invalid
- **THEN** the API reports failure and does not assign a SpriteFrame
- **AND** any SpriteFrame loaded for that failed assignment is released through the resource lifecycle path

### Requirement: UI sprite helper keeps auto release
The UI base class MUST expose a sprite assignment helper that preserves UI dynamic resource auto-release behavior.

#### Scenario: UI assigns sprite safely
- **WHEN** a UI uses the safe sprite assignment helper and the latest request succeeds
- **THEN** the assigned SpriteFrame is registered for UI auto-release

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

### Requirement: AudioClip resources follow audio playback lifecycle
The runtime resource safety contract MUST treat AudioClip cache and playback ownership as lifecycle-owned resources released by the audio module.

#### Scenario: AudioClip is cached for playback
- **WHEN** the audio runtime loads an AudioClip through `tyou.res.loadAssetAsync`
- **THEN** the clip is tracked in the audio cache
- **AND** successful playback ownership increments audio playback reference state

#### Scenario: Audio playback ends
- **WHEN** an AudioSource playback stops, is preempted, completes, or the audio module is destroyed
- **THEN** the AudioClip playback ownership is released exactly once
- **AND** unused cached AudioClips are released through `tyou.res.decRef`

### Requirement: Managed helper failures release loaded owners
The runtime resource API MUST release caller-owned resources when a helper loads an asset successfully but cannot attach, instantiate, assign, or register it into the intended lifecycle owner.

#### Scenario: Prefab instantiate or holder setup fails
- **WHEN** `tyou.res.loadGameObjectAsync` loads a Prefab but fails before returning a managed node
- **THEN** the loaded Prefab owner reference is released through `tyou.res.decRef`

#### Scenario: Spine target cannot keep loaded data
- **WHEN** a Spine helper loads SkeletonData but the target is invalid or holder setup fails
- **THEN** the loaded SkeletonData owner reference is released through `tyou.res.decRef`

### Requirement: Resource API preserves indexed logical-name loading
The runtime resource API MUST resolve string resource names through `AssetIndexManager` before loading assets, while preserving the existing fallback diagnostics for missing or unknown index entries.

#### Scenario: Indexed logical name resolves to indexed asset info
- **WHEN** `tyou.res.loadAssetAsync("AssetName")` receives a string name that exists in `AssetIndexManager`
- **THEN** the resource API loads using the indexed `path`, `bundle`, and `type`

#### Scenario: SpriteFrame logical name appends spriteFrame suffix
- **WHEN** a string name resolves to an indexed `SpriteFrame` type
- **THEN** the resource API loads the indexed path with `/spriteFrame` appended

#### Scenario: Missing asset index entry keeps current fallback
- **WHEN** a string name does not exist in `AssetIndexManager`
- **THEN** the resource API logs `[ResourceModule] Asset index missing: <name>`
- **AND** it falls back to loading the original name as an `Asset`

#### Scenario: Unknown indexed type keeps current fallback
- **WHEN** a string name resolves to an indexed type that is not registered by the resource type registry
- **THEN** the resource API logs an unknown-type warning
- **AND** it falls back to loading the asset as `Asset`

### Requirement: Resource facade remains stable for existing callers
The runtime resource module MUST keep the supported `tyou.res.*` facade methods used by current framework and business code after replacing the old `LoaderManager` internals.

#### Scenario: Existing resource callers keep using tyou.res
- **WHEN** existing code calls supported resource facade methods such as `loadAssetAsync`, `loadDirAsync`, `loadGameObjectAsync`, `loadSprite`, `loadAtlas`, `setSpriteAsync`, `preload`, `loadBundleAsync`, `reloadBundleAsync`, `addRef`, or `decRef`
- **THEN** the methods remain available on `tyou.res`
- **AND** callers do not instantiate `LoaderManager` or access `tyou.res.loader`

#### Scenario: Legacy LoaderManager entry is absent
- **WHEN** framework or business code needs resource loading
- **THEN** it uses `tyou.res.*` and the internal resource services
- **AND** the old `LoaderManager` source file is not kept as a public or compatibility entry

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

### Requirement: Node pool Prefab references follow resource lifecycle
The runtime resource safety contract MUST treat Prefabs retained by node pools as lifecycle-owned resources that are released through `tyou.res`.

#### Scenario: Node pool loads a Prefab
- **WHEN** a node pool initializes and loads its Prefab through `tyou.res.loadAssetAsync`
- **THEN** the pool owns that Prefab reference until the pool is destroyed

#### Scenario: Node pool is destroyed
- **WHEN** a node pool is destroyed after loading a Prefab
- **THEN** the pool releases that Prefab through `tyou.res.decRef`
- **AND** it does not directly bypass the resource module cache or bundle lifecycle

### Requirement: Bundle operations keep existing behavior
The runtime resource API MUST preserve the existing bundle load, reload, remove, release, and unused-release behavior exposed through `tyou.res`.

#### Scenario: Bundle is loaded through facade
- **WHEN** a caller invokes `tyou.res.loadBundle` or `tyou.res.loadBundleAsync`
- **THEN** the resource API loads the requested bundle with the same default bundle and version semantics as before the refactor

#### Scenario: Bundle reload refreshes resource data
- **WHEN** a caller invokes `tyou.res.reloadBundleAsync`
- **THEN** the resource API refreshes the bundle resource config and replaces the old loaded bundle data using the existing reload semantics

#### Scenario: Bundle removal and resource release remain available
- **WHEN** a caller invokes `tyou.res.removeBundle`, `tyou.res.release`, or `tyou.res.releaseUnused`
- **THEN** the corresponding Cocos bundle resource operation remains available through `tyou.res`
- **AND** `tyou.res.releaseAll` remains available for releasing managed cached resources through the resource facade

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

### Requirement: UI Spine helpers preserve indexed logical-name loading
The UI resource helper path for Spine MUST resolve string resource names through the runtime resource index before loading `sp.SkeletonData`.

#### Scenario: UI Spine helper receives an indexed logical name
- **WHEN** `UIBase.loadSpineAsync()` or `UIBase.loadSpineEffectAsync()` receives a logical Spine resource name that exists in `AssetIndexManager`
- **THEN** the helper loads through `tyou.res.loadAssetAsync("<name>")`
- **AND** the indexed bundle, path, and type are used by the resource resolver

#### Scenario: UI Spine helper keeps owner lifecycle guards
- **WHEN** a UI Spine request completes after its UI owner has recycled, released, or issued a newer Spine request for the same target
- **THEN** the loaded `sp.SkeletonData` is not assigned to the target
- **AND** the loaded resource is released through `tyou.res.decRef`

### Requirement: Asset index generation recognizes local Spine JSON conservatively
The asset index generator MUST classify local Spine JSON files as `sp.SkeletonData` only when they satisfy conservative Spine structure and sidecar-file checks, while ordinary JSON files remain `JsonAsset`.

#### Scenario: Spine JSON with sidecars is indexed as SkeletonData
- **WHEN** `assetool` scans a `.json` file whose JSON contains Spine skeleton structure
- **AND** the same directory contains a same-basename `.atlas` or `.txt` atlas sidecar
- **AND** the same directory contains at least one same-basename image sidecar
- **THEN** the generated asset index entry uses type `sp.SkeletonData`

#### Scenario: Ordinary JSON remains JsonAsset
- **WHEN** `assetool` scans a `.json` file that does not satisfy the Spine JSON structure and sidecar checks
- **THEN** the generated asset index entry uses the normal `resourceTypeMap.json` type
- **AND** ordinary JSON loading behavior is unchanged

#### Scenario: Binary Spine keeps existing mapping
- **WHEN** `assetool` scans a `.skel` file
- **THEN** the generated asset index entry continues to use the configured `sp.SkeletonData` mapping

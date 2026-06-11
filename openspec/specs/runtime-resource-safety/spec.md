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
The runtime resource API MUST avoid starting duplicate Cocos load operations for the same normalized resource request while a request is already in flight.

#### Scenario: Duplicate asset requests share one in-flight load
- **WHEN** two callers request the same normalized asset before the first request completes
- **THEN** the resource API uses one underlying Cocos load operation
- **AND** both callers receive the loaded asset result

#### Scenario: Cached valid asset is reused
- **WHEN** a normalized asset request has a valid cached asset
- **THEN** the resource API returns the cached asset without starting a new underlying Cocos load operation

#### Scenario: Scene assets are not retained in managed cache
- **WHEN** a load request returns a `SceneAsset`
- **THEN** the managed asset cache does not add a long-lived retained reference for that scene asset

### Requirement: Resource release remains delayed and ref-count aware
The runtime resource API MUST preserve delayed release semantics so assets are only removed from the managed cache after `decRef`, delay expiration, and `refCount === 0`.

#### Scenario: decRef queues asset for delayed release
- **WHEN** `tyou.res.decRef(asset)` is called for a valid asset
- **THEN** the asset reference count is decreased when possible
- **AND** the asset is added to the pending release queue when delayed release is enabled

#### Scenario: Pending asset is released only after refCount reaches zero
- **WHEN** the release scheduler checks a pending valid asset
- **THEN** it removes the asset from the managed cache only if the configured delay has elapsed and `asset.refCount === 0`

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
- **AND** it does not add a retained managed reference after it completes

#### Scenario: Bundle-scoped releaseAll cancels matching pending loads
- **WHEN** `tyou.res.releaseAll(bundle)` is called while managed asset or directory requests for that bundle are still in flight
- **THEN** pending requests for that bundle do not add managed cache entries after they complete
- **AND** pending requests for other bundles remain active

### Requirement: Remote SpriteFrame creation is lifecycle-managed
The runtime resource API MUST ensure SpriteFrames created from remote images have a managed reference that can be released by UI or scene auto-release containers.

#### Scenario: Remote image becomes SpriteFrame
- **WHEN** `tyou.res.setSpriteAsync` receives a remote image `url`
- **THEN** the created SpriteFrame is retained through the resource release scheduler before it is returned
- **AND** the caller can pair it with `tyou.res.decRef` or UI auto-release

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Remote SpriteFrame creation is lifecycle-managed
The runtime resource API MUST ensure SpriteFrames created from remote images have a managed reference that can be released by UI or scene auto-release containers.

#### Scenario: Remote image becomes SpriteFrame
- **WHEN** `tyou.res.setSpriteAsync` receives a remote image `url`
- **THEN** the created SpriteFrame is retained through the resource release scheduler before it is returned
- **AND** the caller can pair it with `tyou.res.decRef` or UI auto-release

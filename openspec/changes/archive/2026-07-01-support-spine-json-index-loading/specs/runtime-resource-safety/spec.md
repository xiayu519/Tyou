## ADDED Requirements

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

## ADDED Requirements

### Requirement: Resource module loads Spine through remote bundle
The resource module SHALL expose an API that loads a specified bundle with an optional version before resolving a Spine asset as `sp.SkeletonData`.

The API surface SHALL include `loadRemoteBundleSpineDataAsync`, `loadRemoteBundleSpineAsync`, and `loadRemoteBundleSpineEffectAsync`.

#### Scenario: Load Spine from configured remote bundle
- **WHEN** a caller requests a Spine logical asset name with bundle `spine` and version `v1`
- **THEN** the resource module MUST load bundle `spine` with version `v1` before loading the Spine asset as `sp.SkeletonData`

#### Scenario: Remote bundle load fails
- **WHEN** the specified bundle cannot be loaded
- **THEN** the resource module MUST return null and avoid assigning invalid Spine data

### Requirement: UIBase assigns remote bundle Spine safely
UIBase SHALL expose helpers that assign Spine data loaded through a specified bundle while preserving owner epoch, per-target request ordering, and automatic release behavior.

The UIBase helper surface SHALL include `loadRemoteBundleSpineAsync` and `loadRemoteBundleSpineEffectAsync`.

#### Scenario: UI owner is recycled before Spine completes
- **WHEN** a remote bundle Spine request completes after the UI owner epoch has changed
- **THEN** UIBase MUST not assign the stale `sp.SkeletonData` and MUST release the loaded asset reference

#### Scenario: Later request supersedes earlier request
- **WHEN** two remote bundle Spine requests target the same `sp.Skeleton`
- **THEN** only the latest request MUST assign data to the target

### Requirement: Naked Spine file URLs are out of scope
The system SHALL NOT treat a single remote `.json` or `.skel` URL as a complete Spine resource in this capability.

#### Scenario: Caller needs naked Spine URL assembly
- **WHEN** a caller has separate `.json` or `.skel`, `.atlas`, and texture URLs
- **THEN** this capability MUST require a separate loader design instead of using the remote bundle Spine API

## ADDED Requirements

### Requirement: UI window resources follow UI lifecycle
The runtime resource safety contract MUST treat UI Prefabs and UI dynamic assets as lifecycle-owned resources released by the UI close path.

#### Scenario: UI window loads a Prefab
- **WHEN** a UI window loads its Prefab through `tyou.res.loadGameObjectAsync`
- **THEN** the resulting node owns the Prefab reference through `ResourceHolder`
- **AND** destroying the UI node releases that Prefab through the resource lifecycle

#### Scenario: UI registers dynamic assets
- **WHEN** a UI window loads SpriteFrames, SpriteAtlases, or remote SpriteFrames through UIBase helpers
- **THEN** successful assets are registered for UI auto-release
- **AND** closing the UI releases those assets through `tyou.res.decRef`

#### Scenario: UI load is cancelled
- **WHEN** a UI Prefab load completes after the UI was closed or cancelled
- **THEN** the loaded node is destroyed instead of being attached as an active managed window
- **AND** its resource holder can release the Prefab reference normally

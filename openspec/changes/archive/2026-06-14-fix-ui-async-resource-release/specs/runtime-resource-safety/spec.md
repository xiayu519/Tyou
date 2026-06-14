## MODIFIED Requirements

### Requirement: UI window resources follow UI lifecycle
The runtime resource safety contract MUST treat UI Prefabs and UI dynamic assets as lifecycle-owned resources released by the UI close path, including dynamic assets that finish loading after their UI owner has already been released.

#### Scenario: UI window loads a Prefab
- **WHEN** a UI window loads its Prefab through `tyou.res.loadGameObjectAsync`
- **THEN** the resulting node owns the Prefab reference through `ResourceHolder`
- **AND** destroying the UI node releases that Prefab through the resource lifecycle

#### Scenario: UI registers dynamic assets
- **WHEN** a UI window loads SpriteFrames, SpriteAtlases, or remote SpriteFrames through UIBase helpers
- **THEN** successful assets are registered for UI auto-release
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

#### Scenario: UI load is cancelled
- **WHEN** a UI Prefab load completes after the UI was closed or cancelled
- **THEN** the loaded node is destroyed instead of being attached as an active managed window
- **AND** its resource holder can release the Prefab reference normally

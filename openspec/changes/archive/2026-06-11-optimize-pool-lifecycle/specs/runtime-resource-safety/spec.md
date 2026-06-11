## ADDED Requirements

### Requirement: Node pool Prefab references follow resource lifecycle
The runtime resource safety contract MUST treat Prefabs retained by node pools as lifecycle-owned resources that are released through `tyou.res`.

#### Scenario: Node pool loads a Prefab
- **WHEN** a node pool initializes and loads its Prefab through `tyou.res.loadAssetAsync`
- **THEN** the pool owns that Prefab reference until the pool is destroyed

#### Scenario: Node pool is destroyed
- **WHEN** a node pool is destroyed after loading a Prefab
- **THEN** the pool releases that Prefab through `tyou.res.decRef`
- **AND** it does not directly bypass the resource module cache or bundle lifecycle

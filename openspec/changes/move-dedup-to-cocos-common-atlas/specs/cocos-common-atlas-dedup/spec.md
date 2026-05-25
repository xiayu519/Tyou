## ADDED Requirements

### Requirement: Common atlas checker entry
The Cocos editor extension SHALL expose a "🧩 检查公共图集" action in the same hierarchy context-menu group as `uitscreate` actions.

#### Scenario: Hierarchy node is selected
- **WHEN** a developer right-clicks a node in the Cocos hierarchy panel
- **THEN** the menu SHALL show "🧩 检查公共图集" at the same level as "生成UI脚本" and "检查前缀组件"
- **AND** running it SHALL scan SpriteFrame references used by the selected node tree.

#### Scenario: Prefab asset can be resolved from the hierarchy node
- **WHEN** the selected hierarchy node can be resolved back to a `.prefab` asset file
- **THEN** the checker SHALL include that prefab file as a replacement target.

### Requirement: Strong duplicate detection
The checker SHALL only treat assets as duplicates when their decoded visible pixels and SpriteFrame import semantics are identical.

#### Scenario: Transparent RGB differs only
- **WHEN** two PNG files have identical dimensions and visible pixels but differ only in RGB values where alpha is zero
- **THEN** the checker SHALL treat them as duplicate candidates.

#### Scenario: SpriteFrame border differs
- **WHEN** two PNG files have identical visible pixels but different `borderTop`, `borderBottom`, `borderLeft`, or `borderRight`
- **THEN** the checker MUST NOT treat them as duplicate candidates.

#### Scenario: Visible pixel differs
- **WHEN** two PNG files differ in any non-transparent or semi-transparent visible pixel
- **THEN** the checker MUST NOT treat them as duplicate candidates.

### Requirement: Common atlas reuse and creation
The checker SHALL prefer existing equivalent assets in `assets/asset-art/atlas/common`, and SHALL create a common asset only when no equivalent common asset exists.

#### Scenario: Equivalent common asset exists
- **WHEN** a duplicate group matches an existing common asset fingerprint
- **THEN** the checker SHALL replace checked Cocos asset references with the existing common SpriteFrame UUID.

#### Scenario: Equivalent common asset does not exist
- **WHEN** a duplicate group has no equivalent common asset
- **THEN** the checker SHALL copy one representative PNG into `assets/asset-art/atlas/common`
- **AND** the checker SHALL wait for Cocos to generate a new meta UUID
- **AND** the checker SHALL apply the representative SpriteFrame import settings to the new common asset.

### Requirement: Safe reference replacement and cleanup
The checker SHALL update references before deleting duplicate assets, and SHALL avoid deleting assets that still have references.

#### Scenario: Scene component references are replaced
- **WHEN** a checked hierarchy node tree contains Sprite components using duplicate SpriteFrame UUID references
- **THEN** the checker SHALL replace those component references with the common SpriteFrame.

#### Scenario: Prefab file references are replaced when resolvable
- **WHEN** the selected hierarchy node resolves to a `.prefab` file containing duplicate SpriteFrame UUID references
- **THEN** the checker SHALL replace those UUIDs with the common SpriteFrame UUID in the prefab file.

#### Scenario: Duplicate asset still referenced elsewhere
- **WHEN** a duplicate PNG's image UUID or SpriteFrame UUID still appears anywhere under `assets/`
- **THEN** the checker SHALL skip deleting that PNG and report the reason.

#### Scenario: Duplicate asset is unreferenced
- **WHEN** a duplicate PNG's image UUID and SpriteFrame UUID no longer appear under `assets/`
- **THEN** the checker SHALL request Cocos AssetDB to delete the duplicate PNG asset.
### Requirement: Checker report
The checker SHALL report what it changed and what it skipped.

#### Scenario: Operation completes
- **WHEN** the checker finishes
- **THEN** it SHALL show a summary including duplicate groups found, common assets reused or created, references replaced, assets deleted, and skipped items.

### Requirement: Checker progress feedback
The checker SHALL provide visible progress feedback while long-running common-atlas work is executing.

#### Scenario: Editor progress API is available
- **WHEN** a developer runs "🧩 检查公共图集"
- **THEN** the checker SHALL report staged progress through the editor progress UI.

#### Scenario: Editor progress API is unavailable
- **WHEN** the editor does not expose a supported progress API
- **THEN** the checker SHALL still log staged progress and show the final result dialog.

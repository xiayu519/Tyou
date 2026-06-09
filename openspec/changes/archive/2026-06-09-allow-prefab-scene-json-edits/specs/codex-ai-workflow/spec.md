## ADDED Requirements

### Requirement: Prefab source JSON edits are permitted under bounded workflow
The Codex workflow MUST allow Codex to create, read, update, and delete project source `.prefab` assets and necessary matching `.prefab.meta` files when the task is supervised by OpenSpec and follows the Prefab-specific Tyou rule.

#### Scenario: Prefab source asset edit is requested
- **WHEN** Codex is asked to create, inspect, modify, rename, or delete a Cocos Prefab source asset
- **THEN** Codex uses `.codex/rules/tyou-dev/prefab-workflow.md` as the Prefab-specific workflow
- **AND** it treats submitted source `.prefab` files as structured Cocos JSON object arrays rather than opaque binary files

#### Scenario: Prefab generated cache is encountered
- **WHEN** Codex encounters Cocos generated cache, imported output, build output, or temporary Prefab-derived files outside the source asset tree
- **THEN** Codex does not treat those files as normal edit targets
- **AND** it updates the source `.prefab` or asks for a tool/editor path instead

### Requirement: Scene source JSON edits are permitted under bounded workflow
The Codex workflow MUST allow Codex to create, read, update, and delete project source `.scene` assets and necessary matching `.scene.meta` files when the task is supervised by OpenSpec and follows the Scene-specific Tyou rule.

#### Scenario: Scene source asset edit is requested
- **WHEN** Codex is asked to create, inspect, modify, rename, or delete a Cocos Scene source asset
- **THEN** Codex uses `.codex/rules/tyou-dev/scene-workflow.md` as the Scene-specific workflow
- **AND** it treats submitted source `.scene` files as structured Cocos JSON object arrays rather than opaque binary files

#### Scenario: Scene edit may affect runtime startup contracts
- **WHEN** a Scene edit touches startup nodes, scene registration, Prefab instances, or resource index membership
- **THEN** Codex verifies the relevant references and synchronizes affected workflow or runtime documentation when needed

### Requirement: Prefab and Scene workflows stay separate
The Codex workflow MUST keep Prefab and Scene asset editing guidance in separate topic rules so Codex can load the minimum relevant context for each task.

#### Scenario: Prefab work begins
- **WHEN** Codex handles a Prefab task that does not require Scene semantics
- **THEN** Codex reads the Prefab workflow without needing the Scene workflow

#### Scenario: Scene work begins
- **WHEN** Codex handles a Scene task that does not require Prefab authoring details
- **THEN** Codex reads the Scene workflow without needing the Prefab creation workflow

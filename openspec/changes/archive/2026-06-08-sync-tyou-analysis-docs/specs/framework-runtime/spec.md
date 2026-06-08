## ADDED Requirements

### Requirement: Runtime documentation reflects current module tree
Framework runtime documentation MUST describe the current `tyou.*` global module tree using the implementation in `Client/assets/ty-framework/Tyou.ts` as the source of truth.

#### Scenario: Runtime modules are documented
- **WHEN** framework runtime modules are listed in README, Books, Codex rules, or OpenSpec specs
- **THEN** the list matches the modules exposed by the current Tyou entry implementation

### Requirement: Runtime documentation states required startup scene nodes
Framework runtime documentation MUST state required startup scene-node contracts when current source code treats missing nodes as startup errors.

#### Scenario: Startup scene node contract is documented
- **WHEN** project documentation describes Tyou startup or UI initialization
- **THEN** it documents the current `GameRoot`, `UICanvas`, and `UICanvas/UICamera` requirements when they are required by source code

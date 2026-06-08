# framework-runtime Specification

## Purpose
Define Tyou runtime framework module composition and lifecycle expectations after removing the built-in debug panel module.

## Requirements

### Requirement: Runtime excludes built-in debug module
The Tyou runtime framework MUST NOT expose or instantiate the removed built-in debug module.

#### Scenario: Framework startup without debug module
- **WHEN** `tyou.onCreate()` completes
- **THEN** the framework has not created, enabled, or attached a built-in debug panel

#### Scenario: Global API surface after removal
- **WHEN** business code accesses the global `tyou` framework entry
- **THEN** `tyou.debug` is not part of the supported framework API

### Requirement: Runtime lifecycle excludes debug hooks
The Tyou runtime lifecycle MUST NOT call update or destroy hooks for the removed debug module.

#### Scenario: Per-frame update
- **WHEN** `tyou.onUpdate(dt)` runs
- **THEN** no debug module update method is invoked

#### Scenario: Framework destroy
- **WHEN** `tyou.onDestroy()` runs
- **THEN** no debug module destroy method is invoked

### Requirement: Documentation reflects debug removal
Framework documentation and AI reference material MUST NOT list debug as an active core runtime module after removal.

#### Scenario: Architecture reference
- **WHEN** the AI reads the Tyou architecture reference
- **THEN** the framework module list does not include `debug`

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

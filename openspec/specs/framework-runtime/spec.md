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
Framework runtime documentation MUST describe the current `tyou.*` global module tree using the implementation in `Client/assets/ty-framework/Tyou.ts` as the source of truth, including localization when it is exposed.

#### Scenario: Runtime modules are documented
- **WHEN** framework runtime modules are listed in README, Books, Codex rules, or OpenSpec specs
- **THEN** the list matches the modules exposed by the current Tyou entry implementation

#### Scenario: Text runtime modules are documented
- **WHEN** `tyou.i18n` is exposed by `Tyou.ts`
- **THEN** framework documentation lists it as a supported runtime API

### Requirement: Runtime documentation states required startup scene nodes
Framework runtime documentation MUST state required startup scene-node contracts when current source code treats missing nodes as startup errors.

#### Scenario: Startup scene node contract is documented
- **WHEN** project documentation describes Tyou startup or UI initialization
- **THEN** it documents the current `GameRoot`, `UICanvas`, and `UICanvas/UICamera` requirements when they are required by source code

### Requirement: Popup windows can opt out of blur background
The Tyou UI runtime MUST allow non-fullscreen windows to remain normal popup windows while opting out of the shared blur background.

#### Scenario: Popup uses default blur behavior
- **WHEN** a non-fullscreen UI window is opened without an explicit blur-background override
- **THEN** it remains eligible to show the shared blur background behind it

#### Scenario: Popup disables blur background
- **WHEN** a non-fullscreen UI window is configured with `blurBackground: false`
- **THEN** the shared blur background is not shown for that window
- **AND** the runtime can continue looking below it for another eligible non-fullscreen window

#### Scenario: Fullscreen window config includes blur flag
- **WHEN** a fullscreen UI window is configured with `blurBackground`
- **THEN** the flag does not make the fullscreen window eligible for popup blur background

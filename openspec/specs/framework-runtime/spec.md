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
- **WHEN** framework runtime modules are listed in README, Books, Tyou topic references, or OpenSpec specs
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

### Requirement: UI backdrop refresh follows current popup stack
The Tyou runtime MUST keep the shared popup backdrop synchronized with the current top eligible non-fullscreen window.

#### Scenario: Top popup changes quickly
- **WHEN** UI show, hide, close, or load-failure events request multiple backdrop refreshes in quick succession
- **THEN** stale refresh work does not override the latest stack state

#### Scenario: Hidden popup is not eligible
- **WHEN** a non-fullscreen popup is hidden or destroyed
- **THEN** the shared backdrop is not placed behind that hidden or destroyed popup
- **AND** the runtime can select the next lower eligible popup

#### Scenario: Backdrop is clicked
- **WHEN** the shared backdrop is clicked behind the top eligible popup
- **THEN** the runtime closes that popup only if `bgClose` is enabled
- **AND** otherwise emits the existing popup-background-click event for custom handling

### Requirement: Network runtime cleans up through framework lifecycle
The Tyou framework runtime MUST ensure network and HTTP module-owned transient state is cleared through module close or destroy paths.

#### Scenario: Framework is destroyed
- **WHEN** `tyou.onDestroy()` runs
- **THEN** HTTP in-flight request records are aborted or cleared
- **AND** network socket nodes can be closed without leaving active reconnect or heartbeat timers

#### Scenario: Network module uses timers
- **WHEN** network runtime code schedules heartbeat, receive-timeout, or reconnect work
- **THEN** the scheduled work is owned by the network node lifecycle
- **AND** closing the node clears that work before it can drive stale state

### Requirement: Runtime destroys dependent modules before base services
The Tyou runtime MUST destroy modules that depend on resource or timer services before destroying those base services.

#### Scenario: Framework destroy releases resource-owning modules
- **WHEN** `tyou.onDestroy()` runs
- **THEN** modules that release resources through `tyou.res.decRef` are destroyed before `tyou.res.onDestroy()`

#### Scenario: Framework destroy releases timer-owning modules
- **WHEN** `tyou.onDestroy()` runs
- **THEN** modules that cancel timers through `tyou.timer.removeTimer` are destroyed before `tyou.timer.onDestroy()`

### Requirement: Runtime orchestrates table and localization startup without module cycles
The Tyou runtime MUST expose startup orchestration for Luban table loading and localization refresh while keeping low-level modules independent from application UI and each other.

#### Scenario: Startup loads tables through Tyou
- **WHEN** business startup needs Luban tables before entering the first scene
- **THEN** it can call a Tyou runtime orchestration API that loads tables and refreshes localization in order

#### Scenario: Framework modules remain directionally dependent
- **WHEN** framework runtime imports are reviewed
- **THEN** `TableModule` does not import application Loading UI or localization modules
- **AND** localization refresh is triggered by `Tyou` orchestration rather than by `TableModule`

### Requirement: Runtime cleans up FSM instances during framework destroy
The Tyou runtime MUST clear all module-owned FSM instances through the framework destroy path before base event and timer services are destroyed.

#### Scenario: Framework destroy clears FSMs
- **WHEN** `tyou.onDestroy()` runs
- **THEN** `tyou.fsm.onDestroy()` destroys and removes all tracked FSM instances
- **AND** stale FSM transition work cannot enter states after the module has been destroyed

### Requirement: Runtime clears scheduler and state service transient data
The Tyou runtime MUST clear scheduler and state service transient data through destroy paths so callbacks, event listeners, update registrations, and storage caches cannot hold stale references after framework teardown.

#### Scenario: Framework destroys scheduler services
- **WHEN** `tyou.onDestroy()` runs
- **THEN** update callbacks are cleared before event and timer services are destroyed
- **AND** event listeners and pending removals are cleared before timer and resource services are destroyed
- **AND** active timers are removed and recycled before resource service destruction finishes

#### Scenario: Framework destroys state services
- **WHEN** `tyou.onDestroy()` runs
- **THEN** storage cache state is cleared through the storage module destroy path
- **AND** the GameWorld component destroy path unschedules component-owned callbacks when Cocos destroys the component

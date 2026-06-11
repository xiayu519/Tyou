## ADDED Requirements

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

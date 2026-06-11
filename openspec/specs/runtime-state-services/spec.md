# runtime-state-services Specification

## Purpose
Define Tyou runtime state service contracts for local storage and GameWorld time state.

## Requirements
### Requirement: Storage service safely reads cached and persisted values
The runtime storage service MUST preserve existing localStorage-backed JSON storage while making cache reads, parse failures, removal, and clearing safe and diagnosable.

#### Scenario: Stored value is read
- **WHEN** business code stores a JSON-serializable value through `tyou.storage.set(key, value)`
- **THEN** `tyou.storage.get(key)` returns the same decoded value
- **AND** subsequent reads can use the in-memory cache without changing the public result

#### Scenario: Stored value is missing or corrupted
- **WHEN** a key is absent or its cached or persisted JSON cannot be parsed
- **THEN** the storage service returns `null`, `undefined`, or the provided default value according to the existing public API compatibility rules
- **AND** the failed read does not leave a bad parsed object in cache

#### Scenario: Time-scoped value is read
- **WHEN** business code reads a day-scoped or week-scoped value after the stored scope has expired
- **THEN** the storage service returns `null` to indicate the key exists but is no longer current

### Requirement: GameWorld service manages server time and day boundary events
The runtime GameWorld service MUST preserve second-based server time reads while accepting common server timestamp inputs and cleaning scheduled callbacks during destroy.

#### Scenario: Server time is synchronized
- **WHEN** `tyou.game.setServerTime(timestamp)` receives a finite Unix timestamp in seconds or milliseconds
- **THEN** `tyou.game.getServerTime()` returns the normalized Unix timestamp in seconds

#### Scenario: Time update tick runs
- **WHEN** the GameWorld scheduled one-second tick runs
- **THEN** server time advances by one second
- **AND** `GameEvent.TIME_UPDATE_SECOND` is emitted

#### Scenario: Day boundary changes
- **WHEN** the one-second tick crosses the configured day boundary
- **THEN** `GameEvent.TIME_UPDATE_NEW_DAY` is emitted once for that boundary transition

#### Scenario: GameWorld is destroyed
- **WHEN** the `GameWorld` component is destroyed
- **THEN** all scheduled callbacks owned by the component are unscheduled

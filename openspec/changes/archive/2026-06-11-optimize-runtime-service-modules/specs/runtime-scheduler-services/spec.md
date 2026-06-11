## ADDED Requirements

### Requirement: Timer service preserves heap scheduling and lifecycle cleanup
The runtime timer service MUST preserve existing timer scheduling APIs while supporting safe cleanup, query, pause, resume, restart, and reset behavior.

#### Scenario: Timer callback fires after delay
- **WHEN** business code calls `tyou.timer.addTimer(callback, delaySeconds)`
- **THEN** the callback is invoked after the elapsed framework update time reaches the delay
- **AND** the timer is removed after dispatch when it is not a loop timer

#### Scenario: Loop timer uses positive interval
- **WHEN** a loop timer reaches its dispatch time
- **THEN** the timer is rescheduled by its configured interval when the interval is greater than zero
- **AND** the timer is removed instead of spinning forever when the interval is zero or negative

#### Scenario: Timer module is destroyed
- **WHEN** `tyou.timer.onDestroy()` runs
- **THEN** all active timers are removed
- **AND** recycled timer objects no longer retain callback, target argument, or heap state references

### Requirement: Event service supports nested dispatch safely
The runtime event service MUST preserve priority ordering, `once`, `waitFor`, batch binding, target cleanup, and safe listener removal during nested event dispatch.

#### Scenario: Same event emits recursively
- **WHEN** a listener emits the same event type while the outer event dispatch is still running
- **THEN** listener removals requested during either dispatch are delayed until the outermost dispatch for that event type completes

#### Scenario: Once listener dispatches
- **WHEN** a listener registered with `tyou.event.once()` is invoked
- **THEN** it is removed after the dispatch pass
- **AND** other listeners in the same snapshot continue to run even if one listener throws

#### Scenario: Dynamic argument event dispatch
- **WHEN** business code needs to emit an event from an existing argument array
- **THEN** it can call a runtime event API that dispatches those arguments without changing existing `emit(type, arg0, arg1, arg2, arg3, arg4)` behavior

### Requirement: Update service uses stable update snapshots
The runtime update service MUST execute registered update callbacks from a stable frame snapshot and defer structural changes until the current update pass finishes.

#### Scenario: Callback is added during update
- **WHEN** an update callback registers another target while `tyou.update.onUpdate(dt)` is running
- **THEN** the new callback does not run until a later update pass

#### Scenario: Callback is removed during update
- **WHEN** an update callback removes itself or another target while `tyou.update.onUpdate(dt)` is running
- **THEN** the removed target is skipped for the remainder of the current pass when it has not run yet
- **AND** it is absent after the current pass finishes

#### Scenario: All callbacks are cleared during update
- **WHEN** `tyou.update.clearAll()` is called while the update service is iterating callbacks
- **THEN** current-frame dispatch stops for remaining callbacks
- **AND** all callbacks are removed after the current pass finishes

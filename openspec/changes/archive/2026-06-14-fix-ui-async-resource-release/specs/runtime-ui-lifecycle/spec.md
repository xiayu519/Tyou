## MODIFIED Requirements

### Requirement: UI release clears lifecycle-owned state
The Tyou UI runtime MUST clear all UI-owned listeners, timers, dynamic assets, and node references when a window is destroyed, and MUST keep a released UI owner from retaining late-arriving dynamic assets.

#### Scenario: Window is closed
- **WHEN** a prepared UI window is closed
- **THEN** button listeners registered through `onRegisterEvent` are removed
- **AND** UI dynamic assets registered through UIBase are released through `tyou.res.decRef`
- **AND** `tyou.event.targetOff(window)` is called
- **AND** hide-to-close and button-throttle timers owned by the window are cancelled

#### Scenario: Dynamic asset completes after release
- **WHEN** an async UIBase dynamic-resource helper completes after the UI has been released
- **THEN** the late asset is released through `tyou.res.decRef`
- **AND** the helper does not leave the asset in UI lifecycle state

#### Scenario: Module shuts down
- **WHEN** `tyou.ui.onDestroy()` runs
- **THEN** every managed window is destroyed through the same release path
- **AND** Tip and shared blur background state are destroyed

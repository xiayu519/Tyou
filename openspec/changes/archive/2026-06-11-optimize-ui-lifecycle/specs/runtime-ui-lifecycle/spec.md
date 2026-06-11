## ADDED Requirements

### Requirement: UI facade remains simple
The Tyou UI runtime MUST preserve the existing simple public UI usage while improving lifecycle behavior internally.

#### Scenario: Business opens and closes a UI
- **WHEN** business code calls `tyou.ui.showUIAsync(name, ...args)` and later `tyou.ui.closeWindow(name)` or `window.close()`
- **THEN** the UI runtime keeps the supported public API available
- **AND** business code does not need to manage window handles, loading tokens, or lease objects

#### Scenario: Generated UI script uses existing hooks
- **WHEN** a generated UI class extends `UIWindow` and implements `bindMemberProperty`, `registerEvent`, `onCreate`, `onRefresh`, or `onClosed`
- **THEN** the runtime continues to call those hooks in the documented lifecycle order

### Requirement: UI loading is coalesced and cancellable
The Tyou UI runtime MUST avoid duplicate same-window loads and MUST settle loading records when a window is closed or loading fails.

#### Scenario: Same window opens while loading
- **WHEN** `showUIAsync(name, argsA)` is called and the same `name` is requested again before loading completes
- **THEN** the runtime uses one in-flight load for that UI
- **AND** the final refresh uses the latest arguments

#### Scenario: Loading window is closed before completion
- **WHEN** a UI is closed while its Prefab load is still in flight
- **THEN** the runtime removes the pending window record
- **AND** any node that completes after cancellation is destroyed through the normal resource holder path

#### Scenario: UI load returns no node
- **WHEN** UI Prefab loading fails or returns null
- **THEN** the runtime removes the window from the stack, instance map, and loading map
- **AND** subsequent `showUIAsync` calls can retry normally

### Requirement: UI release clears lifecycle-owned state
The Tyou UI runtime MUST clear all UI-owned listeners, timers, dynamic assets, and node references when a window is destroyed.

#### Scenario: Window is closed
- **WHEN** a prepared UI window is closed
- **THEN** button listeners registered through `onRegisterEvent` are removed
- **AND** UI dynamic assets registered through UIBase are released through `tyou.res.decRef`
- **AND** `tyou.event.targetOff(window)` is called
- **AND** hide-to-close and button-throttle timers owned by the window are cancelled

#### Scenario: Module shuts down
- **WHEN** `tyou.ui.onDestroy()` runs
- **THEN** every managed window is destroyed through the same release path
- **AND** Tip and shared blur background state are destroyed

### Requirement: UI bind-node diagnostics prevent silent overwrite
The Tyou UI runtime MUST not silently overwrite duplicate generated bind-node names while preserving simple name-based access.

#### Scenario: Bind node names are unique
- **WHEN** a UI Prefab contains unique supported bind-node names
- **THEN** `this.get(name)` returns the matching node as before

#### Scenario: Bind node name is duplicated
- **WHEN** a UI Prefab contains multiple supported bind nodes with the same name
- **THEN** the first scanned node remains the default `this.get(name)` result
- **AND** the runtime records duplicate diagnostics with readable node paths
- **AND** developers can use `getAll(name)` or `getByPath(path)` for explicit access

#### Scenario: Required bind node is missing
- **WHEN** UI code calls `getRequired(name)` for a missing bind node
- **THEN** the runtime logs an actionable error containing the UI name and bind node name

### Requirement: UI bind prefixes match generated UI configuration
The Tyou UI runtime MUST recognize the same bind-node prefixes that the UI generation workflow supports.

#### Scenario: Generated prefix appears in Prefab
- **WHEN** a UI Prefab contains supported generated prefixes such as `m_scroll`, `m_toggle`, `m_slider`, `m_progress`, or `m_rt`
- **THEN** runtime node scanning can collect those bind nodes

### Requirement: UI stack and visibility stay deterministic
The Tyou UI runtime MUST keep window stack order, sibling order, full-screen hiding, and top-window lookup deterministic after show, hide, close, or failed load.

#### Scenario: Fullscreen window is shown
- **WHEN** a prepared fullscreen UI is on top of lower layer or lower stack windows
- **THEN** lower windows hidden by that fullscreen window are inactive

#### Scenario: Hidden window expires
- **WHEN** a hidden window reaches `hideTimeToClose`
- **THEN** it is closed through the normal close path
- **AND** stack order, instance records, and backdrop state are refreshed

### Requirement: Tip lifecycle returns borrowed objects
The Tyou UI Tip runtime MUST return borrowed pool nodes and class-pool objects even when playback work fails.

#### Scenario: Tip animation completes
- **WHEN** a Tip is played successfully
- **THEN** its temporary `Vec3` is returned to the class pool
- **AND** its node is returned to the Tip node pool

#### Scenario: Tip playback throws
- **WHEN** Tip node setup or animation rejects after a node is rented
- **THEN** the runtime still returns any borrowed `Vec3`
- **AND** it returns or destroys the Tip node through the pool lifecycle

## ADDED Requirements

### Requirement: UIWidget provides a reusable child UI lifecycle
The Tyou UI runtime SHALL provide a general `UIWidget` lifecycle for child UI units owned by a `UIWindow` or another `UIWidget`.

#### Scenario: child widget is created from an existing node
- **WHEN** a parent UI creates a `UIWidget` from an existing child node
- **THEN** the widget records the parent UI and node
- **AND** the widget scans and binds its own child nodes
- **AND** the widget registers its own events
- **AND** the widget receives its create and refresh lifecycle callbacks without being registered as a top-level `UIWindow`

#### Scenario: child widget is loaded from a prefab
- **WHEN** a parent UI dynamically loads a prefab as a `UIWidget`
- **THEN** the widget is registered under the parent UI
- **AND** parent UI update drives the widget update while it remains active
- **AND** releasing the widget destroys the owned prefab node so prefab resources can be released by the normal node lifecycle

#### Scenario: parent UI is released
- **WHEN** a parent `UIWindow` or `UIWidget` is released
- **THEN** every child `UIWidget` owned by that parent is released through the same UI lifecycle cleanup path
- **AND** child widget event listeners, timers, dynamic assets, and node references are cleared

### Requirement: widget boundaries isolate bind-node scanning
The Tyou UI runtime MUST prevent parent UI bind-node scanning from recursively collecting fields that belong to child widget boundaries.

#### Scenario: parent scans a list item boundary
- **WHEN** a parent UI scans a Prefab containing `m_listRewards/content/m_itemReward/m_textName`
- **THEN** the parent UI collects the `m_listRewards` bind node
- **AND** the parent UI does not collect `m_textName` from inside `m_itemReward`
- **AND** the generated item widget can collect `m_textName` when it scans `m_itemReward`

### Requirement: ListView item widgets follow reuse lifecycle
The Tyou `ListView` runtime MUST invoke item widget lifecycle hooks when item nodes are created, refreshed, recycled, pooled, or destroyed.

#### Scenario: item node is shown for an index
- **WHEN** `ListView` creates or reuses an item node for list index `N`
- **THEN** the associated item `UIWidget` is created if needed
- **AND** the widget receives a refresh callback for index `N`
- **AND** legacy `renderEvent` and `update-item` notifications remain available for existing callers

#### Scenario: pooled item changes index
- **WHEN** a pooled item node that previously represented index `A` is reused for index `B`
- **THEN** the item widget receives a recycle cleanup for index `A` before it is refreshed for index `B`

#### Scenario: item leaves the visible range
- **WHEN** a virtual-list item node is removed from the visible range and returned to the internal pool
- **THEN** the item widget receives a recycle cleanup before the node enters the pool

#### Scenario: list is destroyed
- **WHEN** a `ListView` is destroyed or clears pooled item nodes
- **THEN** every item widget owned by active or pooled item nodes is released
- **AND** no item widget remains attached to an invalid node

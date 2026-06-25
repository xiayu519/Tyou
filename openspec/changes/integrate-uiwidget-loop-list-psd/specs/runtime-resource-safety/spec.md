## ADDED Requirements

### Requirement: UIWidget dynamic assets follow recycle lifecycle
The runtime resource safety contract MUST treat `UIWidget` dynamic assets as owner-scoped resources that are released when the widget is recycled or released.

#### Scenario: list item is recycled
- **WHEN** a list item `UIWidget` has loaded dynamic SpriteFrames or other assets through UI helper methods and the item is recycled for reuse
- **THEN** the widget releases those dynamic assets through `tyou.res.decRef`
- **AND** the widget starts the next refresh with an empty dynamic asset set

#### Scenario: child widget is released with its parent
- **WHEN** a parent UI is destroyed while a child `UIWidget` owns dynamic assets
- **THEN** the child widget releases its dynamic assets through `tyou.res.decRef`
- **AND** late-arriving assets for that widget are not retained by the released owner

### Requirement: widget sprite assignment rejects stale owner requests
The runtime Sprite assignment path MUST reject async sprite loads that complete after their UI owner has recycled or released, even if the Sprite target node is still valid.

#### Scenario: older item image request finishes after recycle
- **WHEN** a list item widget requests image `A` for index `1`, recycles to index `2`, and the image `A` request completes after recycle
- **THEN** image `A` is not assigned to the Sprite for index `2`
- **AND** the loaded SpriteFrame for the stale request is released through `tyou.res.decRef`

#### Scenario: newer item image request wins
- **WHEN** a list item widget requests image `A` and then requests image `B` for the same Sprite during a later refresh
- **THEN** only the latest valid request may assign to that Sprite
- **AND** any stale SpriteFrame loaded only for the older request is released through the resource lifecycle path

### Requirement: widget Spine assignment follows owner lifecycle
The runtime Spine assignment path used by `UIBase`/`UIWidget` MUST treat loaded `sp.SkeletonData` as owner-scoped dynamic resources.

#### Scenario: list item Spine is recycled
- **WHEN** a list item widget loads Spine data through the UI owner helper and the item is recycled
- **THEN** the widget clears the assigned `Skeleton.skeletonData`
- **AND** the loaded `sp.SkeletonData` is released through `tyou.res.decRef`

#### Scenario: older Spine request finishes after recycle
- **WHEN** a widget requests Spine `A`, then recycles or requests Spine `B` for the same target before `A` finishes
- **THEN** Spine `A` is not assigned to the target
- **AND** the stale `sp.SkeletonData` is released through `tyou.res.decRef`

### Requirement: ListView pool cleanup releases item-owned resources
The `ListView` runtime MUST release item-owned resources before item nodes enter the pool and before pooled nodes are destroyed.

#### Scenario: virtual item enters pool
- **WHEN** `ListView` returns an item node to its internal `NodePool`
- **THEN** the item widget's current dynamic resources are released before the node is pooled

#### Scenario: pooled nodes are cleared
- **WHEN** `ListView` clears its `NodePool` during destruction
- **THEN** any item widget attached to pooled nodes is released before the nodes are destroyed

#### Scenario: non-virtual item is deleted
- **WHEN** `ListView` deletes a non-virtual item node through its item deletion path
- **THEN** the item widget is released before the node is destroyed

# runtime-pool-lifecycle Specification

## Purpose
Define the Tyou runtime node-pool contract for Prefab ownership, node lease tracking, release behavior, pending work, destruction, and diagnostics.

## Requirements

### Requirement: Node pools use stable pool identity
The runtime pool module MUST use one stable pool identity for creation, node lease tracking, release, lookup, diagnostics, and destruction.

#### Scenario: Pool has custom poolName
- **WHEN** a node is rented from a pool created with `assetPath` and a custom `poolName`
- **THEN** the node is tracked using the actual `poolName`
- **AND** `tyou.pool.releaseNode(node)` returns it to that pool

#### Scenario: Pool is looked up by asset path
- **WHEN** existing code requests a node by `assetPath` without a custom pool name
- **THEN** the pool module keeps the previous default behavior by using `assetPath` as the pool identity

### Requirement: Node pool facade remains easy to use
The runtime pool module MUST preserve simple node-pool usage through both the global `tyou.pool` facade and direct `NodePool` instances.

#### Scenario: Node is rented through facade
- **WHEN** code calls `tyou.pool.instantiateAsync(assetPath)` and later calls `tyou.pool.releaseNode(node)`
- **THEN** the node is returned to its owning pool without requiring a lease object

#### Scenario: Node is rented from direct pool object
- **WHEN** code obtains a `NodePool` from `tyou.pool.getOrCreateNodePool(config)` and calls `pool.getAsync()`
- **THEN** the node can be returned through either `pool.release(node)` or `tyou.pool.releaseNode(node)`
- **AND** business code does not need to manually register node ownership

### Requirement: Node pool lifecycle rejects stale pending work
The runtime pool module MUST make pending node requests and queued instantiation work settle when a pool is destroyed or becomes unusable.

#### Scenario: Pool is destroyed with pending get requests
- **WHEN** a node pool is destroyed while callers are waiting for nodes
- **THEN** pending requests are rejected
- **AND** their timeout handles are cleared

#### Scenario: Pool is destroyed with queued instantiation work
- **WHEN** a node pool is destroyed while preload or instantiation tasks are queued
- **THEN** queued tasks are rejected
- **AND** no further nodes are created for that pool

### Requirement: Node pool diagnostics expose ownership and capacity
The runtime pool module MUST expose enough diagnostics to inspect pool ownership, asset source, capacity, active nodes, available nodes, and pending work.

#### Scenario: Pool status is requested
- **WHEN** code calls the pool status APIs
- **THEN** each pool reports its `poolName`, `assetPath`, state, total count, active count, available count, capacity, queued instantiation count, pending request count, and prefab loaded state

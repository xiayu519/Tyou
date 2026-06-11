## ADDED Requirements

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

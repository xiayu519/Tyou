# runtime-fsm-lifecycle Specification

## Purpose
Define the Tyou runtime FSM contract for asynchronous state transitions, lifecycle cleanup, stable module iteration, and ergonomic management helpers.

## Requirements
### Requirement: FSM serializes asynchronous transitions
The runtime FSM MUST execute asynchronous state transitions for the same FSM instance sequentially, so that `onExit` and `onEnter` callbacks from different transition requests do not overlap.

#### Scenario: Multiple transitions are requested quickly
- **WHEN** business code calls `fsm.changeState(A)` and then `fsm.changeState(B)` before the first transition completes
- **THEN** the FSM executes the transition to `A` before the transition to `B`
- **AND** each caller receives a `Promise<boolean>` for its own transition result

### Requirement: FSM supports sync and async state callbacks
The runtime FSM state interface MUST allow `onEnter` and `onExit` callbacks to be either synchronous or asynchronous.

#### Scenario: Synchronous state is registered
- **WHEN** a state implements `onEnter` or `onExit` without returning a Promise
- **THEN** the FSM treats the callback as completed after the method returns

#### Scenario: Asynchronous state is registered
- **WHEN** a state implements `onEnter` or `onExit` with a Promise
- **THEN** the FSM waits for the Promise before completing the transition

### Requirement: FSM lifecycle cancels stale waits and transitions
The runtime FSM MUST clear pending wait conditions and prevent stale asynchronous transition work from writing state after reset or destroy.

#### Scenario: FSM is destroyed while transition waits
- **WHEN** `fsm.destroy()` runs while a transition is waiting for a condition
- **THEN** the waiting transition resolves as failed
- **AND** queued transitions do not enter a new state after destroy
- **AND** the destroyed FSM is removed from module tracking

#### Scenario: FSM is reset while transitions are queued
- **WHEN** `fsm.resetAsync(initialState)` runs after transition requests were queued
- **THEN** stale queued transitions do not write over the reset result

### Requirement: FSM module updates through a stable snapshot
The runtime FSM module MUST update and destroy FSM instances through stable snapshots so that creating or destroying FSMs during iteration does not corrupt the current pass.

#### Scenario: FSM is destroyed during update
- **WHEN** a state update destroys its FSM or another FSM
- **THEN** the module completes the current update pass without skipping unrelated FSMs or throwing due to map mutation

#### Scenario: Owner FSMs are destroyed in batch
- **WHEN** `tyou.fsm.destroyAllFSMByOwner(owner)` runs
- **THEN** every FSM belonging to that owner at the start of the batch is destroyed and removed

### Requirement: FSM exposes ergonomic management helpers
The runtime FSM MUST expose helper APIs for common state and instance management without forcing business code to inspect internal maps.

#### Scenario: Business code queries state registration
- **WHEN** business code calls `fsm.hasState(state)` or `fsm.getState(state)`
- **THEN** it receives the registration status or state object without mutating the FSM

#### Scenario: Business code destroys by id
- **WHEN** business code calls `tyou.fsm.destroyFSMById(id)` or `tyou.fsm.destroyFSM(id)`
- **THEN** the module destroys and removes the matching FSM when it exists

## ADDED Requirements

### Requirement: Runtime cleans up FSM instances during framework destroy
The Tyou runtime MUST clear all module-owned FSM instances through the framework destroy path before base event and timer services are destroyed.

#### Scenario: Framework destroy clears FSMs
- **WHEN** `tyou.onDestroy()` runs
- **THEN** `tyou.fsm.onDestroy()` destroys and removes all tracked FSM instances
- **AND** stale FSM transition work cannot enter states after the module has been destroyed

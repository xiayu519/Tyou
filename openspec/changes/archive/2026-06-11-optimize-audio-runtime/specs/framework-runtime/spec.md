## ADDED Requirements

### Requirement: Runtime destroys dependent modules before base services
The Tyou runtime MUST destroy modules that depend on resource or timer services before destroying those base services.

#### Scenario: Framework destroy releases resource-owning modules
- **WHEN** `tyou.onDestroy()` runs
- **THEN** modules that release resources through `tyou.res.decRef` are destroyed before `tyou.res.onDestroy()`

#### Scenario: Framework destroy releases timer-owning modules
- **WHEN** `tyou.onDestroy()` runs
- **THEN** modules that cancel timers through `tyou.timer.removeTimer` are destroyed before `tyou.timer.onDestroy()`

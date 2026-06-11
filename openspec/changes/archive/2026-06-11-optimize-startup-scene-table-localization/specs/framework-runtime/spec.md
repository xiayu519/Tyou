## ADDED Requirements

### Requirement: Runtime orchestrates table and localization startup without module cycles
The Tyou runtime MUST expose startup orchestration for Luban table loading and localization refresh while keeping low-level modules independent from application UI and each other.

#### Scenario: Startup loads tables through Tyou
- **WHEN** business startup needs Luban tables before entering the first scene
- **THEN** it can call a Tyou runtime orchestration API that loads tables and refreshes localization in order

#### Scenario: Framework modules remain directionally dependent
- **WHEN** framework runtime imports are reviewed
- **THEN** `TableModule` does not import application Loading UI or localization modules
- **AND** localization refresh is triggered by `Tyou` orchestration rather than by `TableModule`

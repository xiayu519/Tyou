## ADDED Requirements

### Requirement: Live dashboard launcher restarts stale backend
The Codex workflow MUST make the live dashboard launcher stop any stale dashboard backend before starting a new server.

#### Scenario: Launcher starts while old backend is running
- **WHEN** the developer runs `open-harness-dashboard.bat` and port `8787` is already listening
- **THEN** the launcher stops the old listener before starting a new dashboard server

#### Scenario: Launcher starts after pid file exists
- **WHEN** the dashboard pid file exists
- **THEN** the launcher attempts to stop that process and removes the stale pid file before starting a new server

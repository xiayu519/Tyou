## REMOVED Requirements

### Requirement: Codex observability dashboard is generated locally
The Codex workflow MUST provide a local static dashboard/report path for reviewing OpenSpec change state without external services.

#### Scenario: Dashboard is generated for a change
- **WHEN** Codex or a developer runs the dashboard generator for an OpenSpec change
- **THEN** it produces a Markdown dashboard in the change directory or caller-provided output path

#### Scenario: Dashboard output is reviewed
- **WHEN** the generated dashboard is used during review or archive preparation
- **THEN** it summarizes the change, task progress, validation commands, sensor results, git status, and remaining risks without replacing source review

### Requirement: Codex harness web dashboard is local and read-only
The Codex workflow MUST provide a local read-only web dashboard path for visualizing Tyou harness state without changing the core OpenSpec workflow.

#### Scenario: Web dashboard is generated
- **WHEN** Codex or a developer runs the web dashboard generator
- **THEN** the workflow produces a static HTML file under `.codex/harness-dashboard/`

#### Scenario: Web dashboard is opened
- **WHEN** a developer opens the generated HTML dashboard
- **THEN** the page presents current harness state as review-only information

### Requirement: Web dashboard preserves token efficiency
The Codex workflow MUST treat the web dashboard as a human review surface rather than a required Codex context source.

#### Scenario: Normal Codex task runs
- **WHEN** Codex handles an unrelated implementation task
- **THEN** it does not need to read generated dashboard HTML unless the developer explicitly asks for dashboard analysis

#### Scenario: Dashboard evidence is needed
- **WHEN** Codex prepares a workflow review or archive and dashboard evidence is relevant
- **THEN** Codex may cite the underlying generator output or sensor summaries instead of loading the full HTML

### Requirement: Web dashboard reports missing integrations honestly
The Codex workflow MUST show local harness integration status without pretending unavailable integrations are connected.

#### Scenario: Optional source is absent
- **WHEN** staging, runtime, observability, release, or external MCP state is not available in the local repository
- **THEN** the dashboard marks that card as `missing` or `not connected`

#### Scenario: Local evidence exists
- **WHEN** OpenSpec artifacts, tasks, run reports, sensors, memory, rules, or wiki-sync evidence exists
- **THEN** the dashboard marks the corresponding card as `connected`, `partial`, or `healthy` according to the evidence found

### Requirement: Codex harness dashboard supports local live refresh
The Codex workflow MUST provide a local live dashboard mode that updates browser-visible harness state without requiring manual HTML regeneration.

#### Scenario: Live dashboard starts
- **WHEN** the developer runs the dashboard launcher
- **THEN** it starts a local-only web server at `http://127.0.0.1:<port>/`
- **AND** it opens the dashboard URL in the default browser

#### Scenario: Workflow state changes while page is open
- **WHEN** OpenSpec changes, tasks, run reports, memory, rules, or sensor-visible state changes
- **THEN** the open dashboard refreshes its displayed state from `/api/state` without requiring the developer to rerun the launcher

### Requirement: Live dashboard has click-through details
The Codex workflow MUST make the live dashboard more than a static report by allowing developers to inspect summarized evidence.

#### Scenario: Lifecycle card is clicked
- **WHEN** the developer clicks a lifecycle card
- **THEN** the dashboard shows status, metric, evidence paths, and related local state details for that card

#### Scenario: Change row is clicked
- **WHEN** the developer clicks an OpenSpec change row
- **THEN** the dashboard shows task progress, run-report presence, sensor summary, risks, scope, and local path

### Requirement: Live dashboard preserves low token cost
The Codex workflow MUST keep the live dashboard human-facing and must not make generated page content part of normal Codex context.

#### Scenario: Normal Codex task runs while dashboard is open
- **WHEN** Codex handles a normal task
- **THEN** it does not read the live dashboard page or `/api/state` unless the developer explicitly asks for dashboard analysis

#### Scenario: Developer reviews dashboard manually
- **WHEN** the developer uses the dashboard in the browser
- **THEN** token usage does not increase because the browser and local server handle refresh outside model context

### Requirement: Live dashboard is readable in Chinese
The Codex workflow MUST make project-facing live dashboard labels and explanatory text readable in Chinese while preserving literal technical identifiers.

#### Scenario: Developer views live dashboard
- **WHEN** the developer opens the live harness dashboard
- **THEN** navigation labels, table headings, visible status labels, details prompts, and explanatory text are shown in Chinese
- **AND** file paths, commands, API names, and raw technical identifiers remain unchanged where they are useful for debugging

#### Scenario: Dashboard detail JSON is shown
- **WHEN** the developer opens a detail panel that contains raw collected state
- **THEN** the panel may preserve stable English keys and technical values
- **AND** the surrounding heading and visible summary remain Chinese

### Requirement: Live dashboard launcher restarts stale backend
The Codex workflow MUST make the live dashboard launcher stop any stale dashboard backend before starting a new server.

#### Scenario: Launcher starts while old backend is running
- **WHEN** the developer runs `open-harness-dashboard.bat` and port `8787` is already listening
- **THEN** the launcher stops the old listener before starting a new dashboard server

#### Scenario: Launcher starts after pid file exists
- **WHEN** the dashboard pid file exists
- **THEN** the launcher attempts to stop that process and removes the stale pid file before starting a new server

## ADDED Requirements

### Requirement: Codex harness remains command-based without visualization
The Codex workflow MUST keep the retained harness focused on run reports, deterministic sensor checks, memory/rule synchronization, and OpenSpec archive gates, without requiring local dashboards or browser panels.

#### Scenario: L3 or L4 change is reviewed
- **WHEN** Codex prepares review evidence for an L3 or L4 OpenSpec change
- **THEN** it uses `run-report.md`, `codex-observability-check.ps1`, OpenSpec status/validation, and relevant memory or rule updates
- **AND** it does not require dashboard generation or a browser panel

#### Scenario: Developer asks about workflow state
- **WHEN** the developer asks for current Codex workflow state
- **THEN** Codex summarizes the underlying files and command outputs directly instead of asking the developer to open a dashboard

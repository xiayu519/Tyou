## ADDED Requirements

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

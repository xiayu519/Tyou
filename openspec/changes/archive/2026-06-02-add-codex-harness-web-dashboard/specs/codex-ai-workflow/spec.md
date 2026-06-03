## ADDED Requirements

### Requirement: Codex harness web dashboard is local and read-only
The Codex workflow MUST provide a local read-only web dashboard path for visualizing Tyou harness state without changing the core OpenSpec workflow.

#### Scenario: Web dashboard is generated
- **WHEN** Codex or a developer runs the web dashboard generator
- **THEN** the workflow produces a static HTML file under `.codex/harness-dashboard/`
- **AND** the generator reads local workflow artifacts without modifying business code, Cocos assets, Prefab/Scene/meta files, Luban data, or generated config

#### Scenario: Web dashboard is opened
- **WHEN** a developer opens the generated HTML dashboard
- **THEN** it displays Tyou-local harness sections for intent, control, flow, signal, continuity, lifecycle cards, active changes, archived changes, and sensor summaries

### Requirement: Web dashboard preserves token efficiency
The Codex workflow MUST treat the web dashboard as a human review surface rather than a required Codex context source.

#### Scenario: Normal Codex task starts
- **WHEN** Codex begins an ordinary L1, L2, L3, or L4 task
- **THEN** it does not need to read generated dashboard HTML unless the developer explicitly asks for dashboard analysis

#### Scenario: Review or archive preparation starts
- **WHEN** Codex prepares a workflow review or archive and dashboard evidence is relevant
- **THEN** it may use compact sensor output, `run-report.md`, and OpenSpec artifacts before reading the generated HTML page

### Requirement: Web dashboard reports missing integrations honestly
The Codex workflow MUST show connected, partial, missing, warning, and healthy states based on local evidence instead of implying unavailable integrations exist.

#### Scenario: Integration source is absent
- **WHEN** no local evidence exists for a lifecycle card such as CI/CD, release, staging, production runtime, or monitoring
- **THEN** the dashboard marks that card as `missing` or `not connected`

#### Scenario: Local evidence exists
- **WHEN** OpenSpec artifacts, tasks, run reports, sensors, memory, rules, or wiki-sync evidence exists
- **THEN** the dashboard marks the corresponding card as `connected`, `partial`, or `healthy` according to the evidence found

### Requirement: Completed OpenSpec changes archive without redundant confirmation
The Codex workflow MUST archive a clearly selected completed OpenSpec change without asking for an extra developer confirmation when all archive gates are already satisfied.

#### Scenario: Completed change is ready to archive
- **WHEN** the change name is clear, artifacts are complete, tasks are all checked, delta specs are synced to main specs, required validations pass, and no blocking risk exists
- **THEN** Codex archives the change directly to `openspec/changes/archive/YYYY-MM-DD-<change-name>/`

#### Scenario: Archive gate is not satisfied
- **WHEN** the change is ambiguous, artifacts or tasks are incomplete, delta specs are unsynced, validation fails, the archive target already exists, or a developer-confirmed risk is required
- **THEN** Codex pauses and asks the developer before archiving

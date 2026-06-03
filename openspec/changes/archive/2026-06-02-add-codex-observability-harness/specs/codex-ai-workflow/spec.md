## ADDED Requirements

### Requirement: Codex changes produce local run evidence
The Codex workflow MUST require L3 and L4 OpenSpec changes to maintain local run evidence that summarizes agent actions, touched surfaces, validation commands, sensor results, and residual risks.

#### Scenario: L3 or L4 implementation is performed
- **WHEN** Codex applies an OpenSpec change classified as L3 or L4
- **THEN** the change directory contains or updates `run-report.md`
- **AND** the report records the change name, task level, touched files or directories, completed tasks, validation commands, sensor summary, and remaining risks

#### Scenario: L1 or L2 task is performed
- **WHEN** Codex handles an L1 task or a lightweight L2 task
- **THEN** the workflow does not require a run report unless the developer asks for one or the task reveals reusable workflow risk

### Requirement: Codex observability uses deterministic sensors first
The Codex workflow MUST provide local deterministic sensor entrypoints for workflow checks before relying on AI-only review.

#### Scenario: Workflow sensor check runs
- **WHEN** Codex validates a workflow change or a developer requests Codex observability checks
- **THEN** a local script can inspect OpenSpec status, change artifacts, task progress, protected-path changes, workflow file presence, and run-report shape
- **AND** the output distinguishes passed checks, warnings, and failures

#### Scenario: Sensor cannot prove semantic correctness
- **WHEN** a sensor only verifies file shape, presence, or local command state
- **THEN** the workflow treats the result as supporting evidence rather than proof that the implementation is semantically correct

### Requirement: Codex observability dashboard is generated locally
The Codex workflow MUST provide a local static dashboard/report path for reviewing OpenSpec change state without external services.

#### Scenario: Dashboard is generated for a change
- **WHEN** Codex or a developer runs the dashboard generator for an OpenSpec change
- **THEN** it produces a Markdown report summarizing change metadata, OpenSpec status, task progress, run-report content, sensor results, and git status

#### Scenario: Dashboard output is reviewed
- **WHEN** the generated dashboard is used during review or archive preparation
- **THEN** it is treated as a review aid and not as a replacement for OpenSpec tasks, specs, or required validation commands

### Requirement: Codex observability feeds local correction loops
The Codex workflow MUST feed repeated observability findings into local Tyou correction loops instead of retaining them only in transient reports.

#### Scenario: Reusable issue is found
- **WHEN** a report, sensor, or dashboard exposes a recurring pitfall, confirmed workflow decision, user feedback, or useful external reference
- **THEN** Codex records it in the appropriate `.codex/memory/` category and updates `.codex/memory/INDEX.md`

#### Scenario: Documentation drift is found
- **WHEN** observability evidence shows workflow documentation, skills, rules, README, Books, or OpenSpec specs are inconsistent
- **THEN** Codex uses the existing OpenSpec and wiki-sync guarded workflow to update the stale documents

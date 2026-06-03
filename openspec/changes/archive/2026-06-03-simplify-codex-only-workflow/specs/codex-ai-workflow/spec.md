## ADDED Requirements

### Requirement: Workflow documentation uses current Codex wording
The Codex workflow MUST describe only the current Codex entrypoints and execution path.

#### Scenario: Active workflow docs are updated
- **WHEN** active workflow documentation is edited
- **THEN** it states the current Codex entrypoints and rules directly
- **AND** it avoids obsolete history or reverse descriptions of removed paths

### Requirement: Workflow archive records may be pruned
The Codex workflow MUST allow outdated workflow archive records to be removed when their rules have been superseded by current authoritative docs and specs.

#### Scenario: Obsolete workflow archive records remain
- **WHEN** archived workflow records duplicate outdated guidance
- **THEN** Codex may delete those archive records after preserving the current authoritative behavior in active specs, rules, docs, and templates

### Requirement: Codex harness uses command evidence
The Codex workflow MUST use run reports, deterministic sensor checks, OpenSpec status, and structured memory rules as the current review evidence.

#### Scenario: L3 or L4 change is reviewed
- **WHEN** Codex prepares review evidence for an L3 or L4 OpenSpec change
- **THEN** it uses `run-report.md`, `codex-observability-check.ps1`, OpenSpec status or validation output, and relevant structured memory rules

# ai-workflow-adapters Delta

## Modified Requirements

### Requirement: Workflow changes keep adapter behavior aligned

AI workflow changes MUST keep Codex and Claude Code adapter behavior aligned unless the change is explicitly CLI-specific.

#### Scenario: Adapter content is compared

- **WHEN** Codex and Claude Code adapter files define task levels, OpenSpec gates, Tyou constraints, source-of-truth rules, validation steps, or end-of-task checks
- **THEN** their required behavior is equivalent
- **AND** differences are limited to CLI-native trigger mechanisms, command names, permission settings, and memory mechanisms

#### Scenario: CLI-specific capability changes

- **WHEN** a workflow change only applies to one CLI because the other CLI lacks that feature
- **THEN** the artifact or documentation states that the change is CLI-specific
- **AND** the shared `.ai/rules/` behavior remains unchanged unless both CLIs can follow it

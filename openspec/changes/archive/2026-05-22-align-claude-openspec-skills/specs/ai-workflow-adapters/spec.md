# ai-workflow-adapters Delta

## Modified Requirements

### Requirement: Workflow changes keep adapter behavior aligned

AI workflow changes MUST keep Codex and Claude Code adapter behavior aligned unless the change is explicitly CLI-specific.

#### Scenario: OpenSpec skill adapter content is compared

- **WHEN** Codex and Claude Code adapter files define OpenSpec propose, apply, archive, or explore behavior
- **THEN** their required workflow behavior, pause conditions, artifact handling, task handling, and guardrails are equivalent
- **AND** differences are limited to CLI-native trigger mechanisms, command names, permission settings, and memory mechanisms

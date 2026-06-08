## ADDED Requirements

### Requirement: External analysis reports are verified before synchronization
The Codex workflow MUST treat non-source reference material as input that requires local verification before it changes Tyou documentation, rules, OpenSpec specs, or memory.

#### Scenario: Codex uses non-source reference material
- **WHEN** Codex reads an analysis report outside the project root for a Tyou documentation or workflow update
- **THEN** Codex verifies the relevant claims against current source code, current workspace diff, local tools, or existing OpenSpec specs before writing project documentation

#### Scenario: External claim cannot be verified locally
- **WHEN** a report claim cannot be verified from Tyou source code, tools, current workspace changes, or existing project documentation
- **THEN** Codex does not write that claim as an authoritative project fact

## MODIFIED Requirements

### Requirement: Reference material is verified before synchronization
The Codex workflow MUST treat non-source reference material as input that requires local verification before it changes Tyou documentation, rules, OpenSpec specs, or memory.

#### Scenario: Codex uses non-source reference material
- **WHEN** Codex reads material that is not current Tyou source code, current tool output, current workspace diff, or existing OpenSpec specs for a documentation or workflow update
- **THEN** Codex verifies the relevant claims against current source code, current workspace diff, local tools, or existing OpenSpec specs before writing project documentation

#### Scenario: Reference claim cannot be verified locally
- **WHEN** a reference claim cannot be verified from Tyou source code, tools, current workspace changes, or existing project documentation
- **THEN** Codex does not write that claim as an authoritative project fact

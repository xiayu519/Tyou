## MODIFIED Requirements

### Requirement: Codex rules are maintained once
Tyou Codex workflow MUST keep project-specific development rules in `.codex/rules/` and keep Codex skill files focused on trigger and routing behavior.

#### Scenario: Tyou rule is updated
- **WHEN** a rule about Tyou architecture, UI, resources, Prefab, PSD workflow, Luban, OpenSpec, battle design, or workflow recovery changes
- **THEN** the canonical content is updated in `.codex/rules/`
- **AND** Codex entry and skill files route to that Codex project rule content without duplicating full reference content

### Requirement: Codex workflow file set is explicit
The project MUST maintain a concise Codex workflow made of `AGENTS.md`, `.agents/skills/*`, `.codex/rules/`, `openspec/`, and `.codex/memory/`.

#### Scenario: Current AI workflow is inspected
- **WHEN** a developer checks the repository workflow entrypoints
- **THEN** the maintained workflow files are `AGENTS.md`, `.agents/skills/*`, `.codex/rules/`, `openspec/`, and `.codex/memory/`

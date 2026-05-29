## MODIFIED Requirements

### Requirement: Codex workflow uses Codex files
The Codex workflow MUST use `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, `openspec/`, and `.codex/memory/`.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses `AGENTS.md` and `.agents/skills/*`
- **AND** it may read shared `.ai/rules/` and `openspec/` files

#### Scenario: Codex workflow files are updated
- **WHEN** `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, README/Books workflow docs, or OpenSpec workflow specs are updated
- **THEN** the change checks Codex workflow consistency

### Requirement: Codex workflow stays concise
The Codex workflow MUST keep entry files focused on executable constraints and route detailed topic rules to `.ai/rules/`.

#### Scenario: AI workflow task begins
- **WHEN** Codex handles an AI workflow documentation, routing, OpenSpec, memory, or task classification change
- **THEN** the workflow preserves Codex entrypoints and shared rules
- **AND** it avoids duplicating long topic reference content in entry files

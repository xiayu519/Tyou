## MODIFIED Requirements

### Requirement: Codex adapter is isolated from Claude Code
The Codex workflow MUST use Codex-native files as its adapter layer and MUST NOT depend on, synchronize with, or require Claude Code-specific workflow files.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses `AGENTS.md` and `.agents/skills/*`
- **AND** it may read shared `.ai/rules/` and `openspec/` files
- **AND** it does not require `CLAUDE.md` or `.claude/` files

#### Scenario: Codex workflow files are updated
- **WHEN** `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, README/Books workflow docs, or OpenSpec workflow specs are updated
- **THEN** the change checks Codex workflow consistency
- **AND** it does not require a matching Claude Code adapter update

## ADDED Requirements

### Requirement: Codex workflow remains sole maintained AI workflow
The Codex workflow MUST be treated as the only maintained AI workflow for this repository.

#### Scenario: AI workflow task begins
- **WHEN** Codex handles an AI workflow documentation, routing, OpenSpec, memory, or task classification change
- **THEN** the workflow preserves Codex entrypoints and shared rules
- **AND** it does not recreate Claude Code workflow adapters unless the developer explicitly starts a new change to restore Claude support

## MODIFIED Requirements

### Requirement: README links the workflow files
The project README MUST keep the AI workflow section short and point readers to the maintained workflow files.

#### Scenario: Reader checks README for AI workflow
- **WHEN** a developer reads the README
- **THEN** they can find `AGENTS.md`, `.codex/rules/`, `.codex/memory/`, `openspec/`, and the human-readable workflow document

### Requirement: README avoids duplicate mechanics
The README MUST NOT duplicate Codex-native mechanics or long task flow details already maintained in `AGENTS.md` and `Books/AI-Development-Workflow.md`.

#### Scenario: Codex user reads README
- **WHEN** a developer reads the README workflow section
- **THEN** the section remains a concise file map and OpenSpec boundary statement

### Requirement: README states OpenSpec boundary
The README MUST state that non-L1 modifications enter OpenSpec before implementation.

#### Scenario: Reader evaluates workflow guarantees
- **WHEN** a developer reads the workflow section
- **THEN** they understand typo/comment/log/single-line non-framework renames can skip OpenSpec and other modifications enter a change first

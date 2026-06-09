## MODIFIED Requirements

### Requirement: Codex workflow stays concise
The Codex workflow MUST keep entry files focused on executable constraints and route detailed topic rules to `.codex/rules/`.

#### Scenario: Codex workflow task begins
- **WHEN** Codex handles a Codex workflow documentation, routing, OpenSpec, memory, or task classification change
- **THEN** the workflow preserves Codex entrypoints and Codex project rules
- **AND** it avoids duplicating long topic reference content in entry files

#### Scenario: Skill entrypoint is updated
- **WHEN** `.agents/skills/tyou-dev/SKILL.md` is updated
- **THEN** it remains a concise router for Tyou-specific topics and specialized skills
- **AND** detailed execution steps stay in `.codex/rules/tyou-dev/` or the specialized skill documents

### Requirement: Wiki synchronization is configured and guarded
The Codex workflow MUST use `wiki-sync.yaml` and local scripts for Wiki/documentation scanning, query, reporting, and guarded write operations.

#### Scenario: Wiki scan is requested
- **WHEN** Codex scans documentation coverage or drift
- **THEN** it uses `wiki-sync.yaml` to discover source paths, documentation includes, mappings, ignores, and conflict strategy
- **AND** generated caches are excluded when they are not durable source or documentation inputs

#### Scenario: Wiki query is requested
- **WHEN** Codex performs a local documentation query
- **THEN** it searches the document set configured by `wiki-sync.yaml` before falling back to default paths

#### Scenario: Wiki write is requested
- **WHEN** Codex writes a Wiki sync report, TODO, or synchronized documentation output
- **THEN** `write_enabled` or an explicit write flag is required
- **AND** backups and sensitive-pattern handling are treated as required safeguards

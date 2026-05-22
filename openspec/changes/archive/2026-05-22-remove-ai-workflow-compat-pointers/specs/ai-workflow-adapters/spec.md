# ai-workflow-adapters Delta

## Modified Requirements

### Requirement: Shared rules are maintained once

Tyou AI workflow adapters MUST keep project-specific development rules in `.ai/rules/` and MUST NOT retain legacy duplicated or compatibility reference trees under CLI-specific skill directories.

#### Scenario: Tyou rule is updated

- **WHEN** a rule about Tyou architecture, UI, resources, Prefab, PSD workflow, Luban, OpenSpec, battle design, or workflow recovery changes
- **THEN** the canonical content is updated in `.ai/rules/`
- **AND** Codex and Claude adapter files only route to that shared content

#### Scenario: Legacy reference tree is considered

- **WHEN** a CLI-specific adapter has an old reference directory that only points to `.ai/rules/`
- **THEN** the directory is removed instead of kept for compatibility

### Requirement: Workflow changes keep adapter behavior aligned

AI workflow changes MUST keep Codex and Claude Code adapter behavior aligned unless the change is explicitly CLI-specific.

#### Scenario: Shared rule changes

- **WHEN** `.ai/rules/` changes in a way that affects task classification, OpenSpec gates, routing, memory behavior, or development constraints
- **THEN** the same change evaluates `AGENTS.md`, `.agents/skills/*`, `CLAUDE.md`, `.claude/skills/*`, and `.claude/commands/*`
- **AND** updates both adapters where their behavior should remain equivalent

#### Scenario: Adapter trigger changes

- **WHEN** a CLI adapter changes trigger words, command names, skill routing, OpenSpec entrypoints, or workflow self-checks
- **THEN** the corresponding adapter for the other CLI is reviewed in the same OpenSpec change
- **AND** either updated to equivalent behavior or documented as intentionally CLI-specific

#### Scenario: CLI-specific capability changes

- **WHEN** a workflow change only applies to one CLI because the other CLI lacks that feature
- **THEN** the artifact or documentation states that the change is CLI-specific
- **AND** the shared `.ai/rules/` behavior remains unchanged unless both CLIs can follow it

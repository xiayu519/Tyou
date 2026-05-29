## MODIFIED Requirements

### Requirement: Shared rules are maintained once

Tyou Codex workflow adapters MUST keep project-specific development rules in `.ai/rules/` and MUST NOT retain legacy duplicated or compatibility reference trees under CLI-specific skill directories.

#### Scenario: Tyou rule is updated

- **WHEN** a rule about Tyou architecture, UI, resources, Prefab, PSD workflow, Luban, OpenSpec, battle design, or workflow recovery changes
- **THEN** the canonical content is updated in `.ai/rules/`
- **AND** Codex adapter files only route to that shared content

#### Scenario: Codex adapter file is updated

- **WHEN** `AGENTS.md` or `.agents/skills/*` is updated
- **THEN** it describes Codex-specific triggering or routing behavior
- **AND** it does not duplicate full Tyou development reference content

#### Scenario: Legacy reference tree is considered

- **WHEN** a CLI-specific adapter has an old reference directory that only points to `.ai/rules/`
- **THEN** the directory is removed instead of kept for compatibility

## ADDED Requirements

### Requirement: Codex is the only maintained AI workflow adapter

The project MUST maintain Codex CLI as the only AI workflow adapter and MUST NOT require Claude Code workflow files for current AI task execution.

#### Scenario: Current AI workflow is inspected

- **WHEN** a developer checks the repository workflow entrypoints
- **THEN** the maintained entrypoints are `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, `openspec/`, and `.codex/memory/`
- **AND** `CLAUDE.md` and `.claude/` are not required as current workflow files

### Requirement: Codex uses native skill trigger mechanisms

The workflow MUST preserve Codex's native skill activation model instead of relying only on ordinary Markdown instructions.

#### Scenario: Codex handles a Tyou task

- **WHEN** a Tyou task matches Codex skill descriptions or explicit skill names
- **THEN** Codex uses `.agents/skills/` as its native skill adapter
- **AND** the Codex skill routes to shared `.ai/rules/` content

### Requirement: OpenSpec entrypoints are Codex-specific

OpenSpec change artifacts and specs MUST remain shared project artifacts, while current AI execution invokes them through Codex adapter mechanisms.

#### Scenario: Codex starts OpenSpec work

- **WHEN** Codex handles an L2 or higher implementation task
- **THEN** it uses the Codex OpenSpec skill adapters under `.agents/skills/openspec-*`
- **AND** those adapters follow shared `.ai/rules/tyou-dev/openspec-workflow.md`

### Requirement: Codex memory records reusable workflow issues

The workflow MUST use `.codex/memory/` for reusable Codex pitfalls and documentation/source mismatch records.

#### Scenario: Codex records a reusable issue

- **WHEN** Codex discovers a reusable pitfall or documentation/source mismatch
- **THEN** it records the issue in `.codex/memory/` according to the shared workflow recovery rule

## REMOVED Requirements

### Requirement: Workflow changes keep adapter behavior aligned

**Reason**: The project no longer maintains a Claude Code adapter, so cross-CLI behavior alignment is no longer a current requirement.
**Migration**: AI workflow changes must instead check Codex entrypoints, Codex skills, shared `.ai/rules/`, README/Books documentation, and current OpenSpec specs for consistency.

### Requirement: Codex and Claude adapters stay isolated

**Reason**: Claude Code adapter files are removed from the current workflow surface.
**Migration**: Codex remains isolated by using only `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, `openspec/`, and `.codex/memory/`.

### Requirement: Both CLIs use native trigger mechanisms

**Reason**: The maintained workflow no longer supports multiple CLI adapters.
**Migration**: Use the new Codex native trigger requirement.

### Requirement: OpenSpec remains shared but entrypoints are CLI-specific

**Reason**: The maintained AI workflow now has only Codex OpenSpec entrypoints.
**Migration**: Use the new Codex OpenSpec entrypoint requirement.

### Requirement: Memory mechanisms remain CLI-specific

**Reason**: The maintained AI workflow now has only Codex memory.
**Migration**: Use `.codex/memory/` for reusable Codex pitfalls.

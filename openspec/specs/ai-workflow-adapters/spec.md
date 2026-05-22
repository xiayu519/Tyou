# ai-workflow-adapters Specification

## Purpose

Define how Tyou supports Codex CLI and Claude Code CLI in parallel while keeping Tyou/OpenSpec development rules in a single shared rule source and preventing the two CLI-specific workflows from depending on each other.

## Requirements

### Requirement: Shared rules are maintained once

Tyou AI workflow adapters MUST keep project-specific development rules in `.ai/rules/` and MUST NOT retain legacy duplicated or compatibility reference trees under CLI-specific skill directories.

#### Scenario: Tyou rule is updated

- **WHEN** a rule about Tyou architecture, UI, resources, Prefab, PSD workflow, Luban, OpenSpec, battle design, or workflow recovery changes
- **THEN** the canonical content is updated in `.ai/rules/`
- **AND** Codex and Claude adapter files only route to that shared content

#### Scenario: CLI adapter file is updated

- **WHEN** `AGENTS.md`, `.agents/skills/*`, `CLAUDE.md`, `.claude/skills/*`, or `.claude/commands/*` is updated
- **THEN** it describes CLI-specific triggering, permissions, or routing behavior
- **AND** it does not duplicate full Tyou development reference content

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

#### Scenario: Adapter content is compared

- **WHEN** Codex and Claude Code adapter files define task levels, OpenSpec gates, Tyou constraints, source-of-truth rules, validation steps, or end-of-task checks
- **THEN** their required behavior is equivalent
- **AND** differences are limited to CLI-native trigger mechanisms, command names, permission settings, and memory mechanisms

#### Scenario: OpenSpec skill adapter content is compared

- **WHEN** Codex and Claude Code adapter files define OpenSpec propose, apply, archive, or explore behavior
- **THEN** their required workflow behavior, pause conditions, artifact handling, task handling, and guardrails are equivalent
- **AND** differences are limited to CLI-native trigger mechanisms, command names, permission settings, and memory mechanisms

#### Scenario: CLI-specific capability changes

- **WHEN** a workflow change only applies to one CLI because the other CLI lacks that feature
- **THEN** the artifact or documentation states that the change is CLI-specific
- **AND** the shared `.ai/rules/` behavior remains unchanged unless both CLIs can follow it

### Requirement: Codex and Claude adapters stay isolated

Codex-specific files MUST NOT depend on Claude-specific workflow files, and Claude-specific files MUST NOT depend on Codex-specific workflow files.

#### Scenario: Codex workflow routes to rules

- **WHEN** Codex reads `AGENTS.md` or `.agents/skills/*`
- **THEN** those files may reference `.ai/rules/` and `openspec/`
- **AND** they do not require reading `.claude/`

#### Scenario: Claude Code workflow routes to rules

- **WHEN** Claude Code reads `CLAUDE.md`, `.claude/skills/*`, `.claude/commands/*`, or `.claude/settings.local.json`
- **THEN** those files may reference `.ai/rules/` and `openspec/`
- **AND** they do not require reading `.agents/`

### Requirement: Both CLIs use native trigger mechanisms

The workflow MUST preserve each CLI's native activation model instead of relying only on ordinary Markdown instructions.

#### Scenario: Codex handles a Tyou task

- **WHEN** a Tyou task matches Codex skill descriptions or explicit skill names
- **THEN** Codex uses `.agents/skills/` as its native skill adapter
- **AND** the Codex skill routes to shared `.ai/rules/` content

#### Scenario: Claude Code handles a Tyou task

- **WHEN** a Tyou task matches Claude Code skill descriptions, slash commands, or permissions
- **THEN** Claude Code uses `.claude/skills/`, `.claude/commands/`, and `.claude/settings.local.json` as its native workflow adapter
- **AND** the Claude adapter routes to shared `.ai/rules/` content

### Requirement: OpenSpec remains shared but entrypoints are CLI-specific

OpenSpec change artifacts and specs MUST remain shared project artifacts, while Codex and Claude Code invoke them through their own adapter mechanisms.

#### Scenario: Codex starts OpenSpec work

- **WHEN** Codex handles an L2 or higher implementation task
- **THEN** it uses the Codex OpenSpec skill adapters under `.agents/skills/openspec-*`
- **AND** those adapters follow shared `.ai/rules/tyou-dev/openspec-workflow.md`

#### Scenario: Claude Code starts OpenSpec work

- **WHEN** Claude Code handles an L2 or higher implementation task or receives `/opsx:*`
- **THEN** it uses Claude Code commands under `.claude/commands/opsx/` or Claude skills under `.claude/skills/openspec-*`
- **AND** those adapters follow shared `.ai/rules/tyou-dev/openspec-workflow.md`

### Requirement: Memory mechanisms remain CLI-specific

The workflow MUST keep Codex and Claude memory mechanisms separate while sharing only the rule that reusable pitfalls should be recorded.

#### Scenario: Codex records a reusable issue

- **WHEN** Codex discovers a reusable pitfall or documentation/source mismatch
- **THEN** it records the issue in `.codex/memory/` according to the shared workflow recovery rule

#### Scenario: Claude Code records a reusable issue

- **WHEN** Claude Code discovers a reusable pitfall or documentation/source mismatch
- **THEN** it records the issue through the Claude Code memory mechanism or `.claude/agent-memory/` according to the shared workflow recovery rule

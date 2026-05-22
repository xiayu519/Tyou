# ai-workflow-adapters Specification

## Purpose

Define how Tyou supports Codex CLI and Claude Code CLI in parallel while keeping Tyou/OpenSpec development rules in a single shared rule source and preventing the two CLI-specific workflows from depending on each other.

## Requirements

### Requirement: Shared rules are maintained once

Tyou AI workflow adapters MUST keep project-specific development rules in a neutral shared rule source instead of duplicating them separately under Codex-only or Claude-only directories.

#### Scenario: Tyou rule is updated

- **WHEN** a rule about Tyou architecture, UI, resources, Prefab, PSD workflow, Luban, OpenSpec, battle design, or workflow recovery changes
- **THEN** the canonical content is updated in `.ai/rules/`
- **AND** Codex and Claude adapter files only route to that shared content

#### Scenario: CLI adapter file is updated

- **WHEN** `AGENTS.md`, `.agents/skills/*`, `CLAUDE.md`, `.claude/skills/*`, or `.claude/commands/*` is updated
- **THEN** it describes CLI-specific triggering, permissions, or routing behavior
- **AND** it does not duplicate full Tyou development reference content

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

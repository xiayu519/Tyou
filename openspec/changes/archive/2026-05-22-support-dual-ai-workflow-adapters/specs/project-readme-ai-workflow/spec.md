# project-readme-ai-workflow Delta

## Modified Requirements

### Requirement: README documents dual AI workflow adapters

The project README MUST describe Tyou's local AI workflow as a dual-adapter setup for Codex CLI and Claude Code CLI, with shared rules maintained once.

#### Scenario: Reader checks README for AI workflow

- **WHEN** a developer reads the README
- **THEN** they can find the Codex entrypoints, Claude Code entrypoints, shared rule location, and detailed workflow documentation

### Requirement: README distinguishes adapters without implying equivalence

The README MUST state that Codex and Claude Code use different CLI-specific trigger mechanisms while sharing the same Tyou/OpenSpec rule content.

#### Scenario: Codex user reads README

- **WHEN** a developer using Codex reads the workflow section
- **THEN** they understand Codex uses `AGENTS.md` and `.agents/skills/*`
- **AND** they are not told to use `.claude/` files

#### Scenario: Claude user reads README

- **WHEN** a developer using Claude Code reads the workflow section
- **THEN** they understand Claude Code uses `CLAUDE.md`, `.claude/skills/*`, `.claude/commands/*`, and `.claude/settings.local.json`
- **AND** they are not told to use `.agents/` files

### Requirement: README states OpenSpec and shared rules accurately

The README MUST describe OpenSpec as a shared supervision layer and `.ai/rules/` as the shared rule source without claiming technical hard enforcement or guaranteed universal token reduction.

#### Scenario: Reader evaluates workflow guarantees

- **WHEN** a developer reads the workflow section
- **THEN** they understand L2+ work should enter OpenSpec, L1 can skip it, shared rules reduce duplicate maintenance, and token savings are a design goal rather than a universal guarantee

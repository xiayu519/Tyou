## MODIFIED Requirements

### Requirement: README states OpenSpec and shared rules accurately
The README MUST describe OpenSpec as a Codex workflow supervision layer and `.ai/rules/` as the shared Tyou rule source without claiming technical hard enforcement or guaranteed universal token reduction.

#### Scenario: Reader evaluates workflow guarantees
- **WHEN** a developer reads the workflow section
- **THEN** they understand L2+ Codex work should enter OpenSpec, L1 can skip it, shared rules reduce duplicate maintenance, and token savings are a design goal rather than a universal guarantee

## ADDED Requirements

### Requirement: README documents Codex-only AI workflow
The project README MUST describe Tyou's maintained local AI workflow as Codex CLI only.

#### Scenario: Reader checks README for AI workflow
- **WHEN** a developer reads the README
- **THEN** they can find the Codex entrypoints, shared rule location, memory location, and detailed workflow documentation
- **AND** they are not told that Claude Code workflow files are current entrypoints

#### Scenario: README links detailed workflow docs
- **WHEN** the README links `Books/AI-Development-Workflow.md`
- **THEN** the link text describes it as local detailed Codex workflow documentation rather than external project difference documentation

### Requirement: README distinguishes removed Claude workflow from current Codex workflow
The README MUST state that the current maintained workflow uses Codex files and does not maintain Claude Code workflow adapters.

#### Scenario: Codex user reads README
- **WHEN** a developer using Codex reads the workflow section
- **THEN** they understand Codex uses `AGENTS.md` and `.agents/skills/*`
- **AND** they are not told to use `.claude/` files

#### Scenario: Claude workflow support is considered
- **WHEN** a developer looks for Claude Code workflow support
- **THEN** the README does not describe `CLAUDE.md`, `.claude/skills/*`, `.claude/commands/*`, or `.claude/settings.local.json` as maintained current workflow files

## REMOVED Requirements

### Requirement: README documents dual AI workflow adapters

**Reason**: The project no longer maintains Claude Code workflow adapters.
**Migration**: README must describe Codex-only workflow entrypoints.

### Requirement: README distinguishes adapters without implying equivalence

**Reason**: There is no longer a second maintained adapter to distinguish.
**Migration**: README must clarify current Codex entrypoints and avoid directing users to `.claude/`.

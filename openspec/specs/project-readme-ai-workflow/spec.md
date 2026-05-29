# project-readme-ai-workflow Specification

## Purpose
Define how the project README describes the local Codex AI workflow without overstating guarantees.

## Requirements

### Requirement: README documents Codex workflow
The project README MUST describe the maintained local AI workflow as a concise Codex workflow.

#### Scenario: Reader checks README for AI workflow
- **WHEN** a developer reads the README
- **THEN** they can find the Codex entrypoints, shared rule location, memory location, and detailed workflow documentation

### Requirement: README states Codex entrypoints clearly
The README MUST state the current Codex workflow files.

#### Scenario: Codex user reads README
- **WHEN** a developer using Codex reads the workflow section
- **THEN** they understand Codex uses `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, `openspec/`, and `.codex/memory/`

### Requirement: README states OpenSpec and shared rules accurately
The README MUST describe OpenSpec as a Codex workflow supervision layer and `.ai/rules/` as the Tyou rule source without claiming technical hard enforcement or guaranteed universal token reduction.

#### Scenario: Reader evaluates workflow guarantees
- **WHEN** a developer reads the workflow section
- **THEN** they understand L2+ Codex work should enter OpenSpec, L1 can skip it, shared rules reduce duplicate maintenance, and token savings are a design goal rather than a universal guarantee

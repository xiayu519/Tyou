## ADDED Requirements

### Requirement: README documents GPT/Codex AI workflow
The project README MUST include a localized, factual introduction to the current GPT/Codex AI workflow.

#### Scenario: Reader checks README for AI workflow
- **WHEN** a developer reads the README
- **THEN** they can find the local GPT/Codex workflow entry points and understand where detailed workflow documentation lives

### Requirement: README distinguishes Codex from Claude
The README MUST state that the documented workflow targets GPT/Codex and differs from Claude Code workflows.

#### Scenario: Claude user reads README
- **WHEN** a developer using Claude Code reads the workflow section
- **THEN** the README does not imply the Codex `.agents/skills` workflow applies to Claude unchanged

### Requirement: README states OpenSpec and token behavior accurately
The README MUST describe OpenSpec supervision and token strategy without claiming technical hard enforcement or guaranteed universal token reduction.

#### Scenario: Reader evaluates workflow guarantees
- **WHEN** a developer reads the workflow section
- **THEN** they understand L2+ work should enter OpenSpec, L1 can skip it, and token savings are a design goal rather than a universal guarantee

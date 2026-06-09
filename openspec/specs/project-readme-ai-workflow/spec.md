# project-readme-ai-workflow Specification

## Purpose
Define how the project README stays focused on project usage and avoids hosting Codex workflow mechanics.

## Requirements

### Requirement: README excludes Codex workflow mechanics
The project README MUST describe project usage and user-facing project facts without hosting Codex workflow mechanics, reference maps, memory workflow, OpenSpec gates, archive history, or sensor behavior.

#### Scenario: Reader checks README for project usage
- **WHEN** a reader opens the README
- **THEN** the README describes project setup, runtime assumptions, project tooling, and usage-oriented facts
- **AND** it does not include a Codex workflow section or Codex reference map

### Requirement: Codex workflow docs live outside README
The project MUST keep Codex workflow mechanics in Codex-owned workflow files rather than README.

#### Scenario: Codex workflow guidance is maintained
- **WHEN** Codex workflow references, task levels, OpenSpec gates, memory workflow, or sensors are documented
- **THEN** they are maintained in `AGENTS.md`, `.agents/skills/*`, `.agents/skills/tyou-dev/references/`, `Books/AI-Development-Workflow.md`, or `openspec/specs/codex-ai-workflow/`

### Requirement: README and Codex specs have separate responsibilities
The project README and OpenSpec workflow specs MUST keep separate documentation responsibilities.

#### Scenario: Documentation responsibilities are checked
- **WHEN** README or workflow specs are updated
- **THEN** README stays focused on project usage and user-facing project facts
- **AND** OpenSpec specs describe long-term workflow behavior rather than short-lived implementation details

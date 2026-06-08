# project-readme-ai-workflow Specification

## Purpose
Define how the project README points to the local Codex workflow without restating tool-native behavior.

## Requirements

### Requirement: README names the Codex workflow
The project README MUST name the workflow as the Tyou Codex development workflow instead of a generic AI workflow.

#### Scenario: Reader checks README workflow heading
- **WHEN** a developer reads the README workflow section
- **THEN** the section heading and introductory sentence identify Codex as the active coding-agent workflow

### Requirement: README links the workflow files
The project README MUST keep the Codex workflow section short and point readers to the maintained workflow files.

#### Scenario: Reader checks README for Codex workflow
- **WHEN** a developer reads the README
- **THEN** they can find `AGENTS.md`, `.agents/skills/`, `.codex/rules/`, `.codex/memory/INDEX.md`, `openspec/`, and the human-readable workflow document

### Requirement: README avoids duplicate mechanics
The README MUST NOT duplicate Codex-native mechanics or long task flow details already maintained in `AGENTS.md` and `Books/AI-Development-Workflow.md`.

#### Scenario: Codex user reads README
- **WHEN** a developer reads the README workflow section
- **THEN** the section remains a concise file map and OpenSpec boundary statement

### Requirement: README states OpenSpec boundary
The README MUST state that non-L1 modifications enter OpenSpec before implementation.

#### Scenario: Reader evaluates workflow guarantees
- **WHEN** a developer reads the workflow section
- **THEN** they understand typo/comment/log/single-line non-framework renames can skip OpenSpec and other modifications enter a change first

### Requirement: README separates project overview from Codex workflow
The README MUST keep project positioning/runtime overview content separate from the concise Codex workflow section so readers can distinguish framework facts from coding-agent process.

#### Scenario: Reader checks README sections
- **WHEN** a reader opens README
- **THEN** the project overview describes Tyou runtime and tooling facts
- **AND** the Codex workflow section remains a short entrypoint map and OpenSpec boundary statement

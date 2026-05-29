# ai-workflow-adapters Specification

## Purpose

Define the concise Codex workflow file set and its relationship to shared Tyou rules.

## Requirements

### Requirement: Shared rules are maintained once

Tyou Codex workflow MUST keep project-specific development rules in `.ai/rules/` and keep Codex skill files focused on trigger and routing behavior.

#### Scenario: Tyou rule is updated

- **WHEN** a rule about Tyou architecture, UI, resources, Prefab, PSD workflow, Luban, OpenSpec, battle design, or workflow recovery changes
- **THEN** the canonical content is updated in `.ai/rules/`
- **AND** Codex entry and skill files route to that shared content without duplicating full reference content

### Requirement: Codex workflow file set is explicit

The project MUST maintain a concise Codex workflow made of `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, `openspec/`, and `.codex/memory/`.

#### Scenario: Current AI workflow is inspected

- **WHEN** a developer checks the repository workflow entrypoints
- **THEN** the maintained workflow files are `AGENTS.md`, `.agents/skills/*`, `.ai/rules/`, `openspec/`, and `.codex/memory/`

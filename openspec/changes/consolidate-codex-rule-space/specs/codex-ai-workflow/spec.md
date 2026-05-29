## MODIFIED Requirements

### Requirement: Tyou project rules remain authoritative
OpenSpec artifacts MUST follow Tyou rules from `AGENTS.md`, `.agents/skills/tyou-dev/SKILL.md`, and Codex project rules under `.codex/rules/`.

#### Scenario: OpenSpec artifact conflicts with Tyou rules
- **WHEN** an OpenSpec artifact suggests behavior that conflicts with Tyou framework, UI, resource, Luban, prefab, or Codex AI workflow constraints
- **THEN** the Tyou rule takes precedence and the artifact is updated before implementation continues

### Requirement: Codex workflow uses Codex files
The Codex workflow MUST use `AGENTS.md`, `.agents/skills/*`, `.codex/rules/`, `openspec/`, and `.codex/memory/`.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses `AGENTS.md` and `.agents/skills/*`
- **AND** it may read `.codex/rules/` and `openspec/` files as routed project context

#### Scenario: Codex workflow files are updated
- **WHEN** `AGENTS.md`, `.agents/skills/*`, `.codex/rules/`, README/Books workflow docs, or OpenSpec workflow specs are updated
- **THEN** the change checks Codex workflow consistency

### Requirement: Codex workflow stays concise
The Codex workflow MUST keep entry files focused on executable constraints and route detailed topic rules to `.codex/rules/`.

#### Scenario: AI workflow task begins
- **WHEN** Codex handles an AI workflow documentation, routing, OpenSpec, memory, or task classification change
- **THEN** the workflow preserves Codex entrypoints and Codex project rules
- **AND** it avoids duplicating long topic reference content in entry files

### Requirement: Codex rules route to project rules
The Codex workflow MUST treat `.codex/rules/` as the canonical source for detailed Tyou development rules.

#### Scenario: Codex skill needs topic details
- **WHEN** `.agents/skills/tyou-dev/SKILL.md` routes a task to topic details
- **THEN** it points to the corresponding `.codex/rules/tyou-dev/*.md` file
- **AND** it does not duplicate detailed topic rules inside the skill file

### Requirement: Workflow correction loop remains local and factual
The Codex workflow MUST document local correction mechanisms that actually exist, and MUST mark unimplemented mechanisms as optional enhancements.

#### Scenario: Code and reference conflict
- **WHEN** source code, tools, or generated output contradict workflow/reference documentation
- **THEN** Codex verifies the source behavior, updates `.codex/rules/` or Codex adapter documentation when appropriate, and records reusable pitfalls in `.codex/memory/`

#### Scenario: Optional enhancement is mentioned
- **WHEN** workflow documentation mentions wiki sync, hard gates, or other unimplemented controls
- **THEN** it labels them as optional future enhancements rather than current behavior

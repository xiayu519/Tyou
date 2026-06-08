## MODIFIED Requirements

### Requirement: Codex workflow uses Codex files
The Codex workflow MUST use `AGENTS.md`, applicable directory `AGENTS.override.md` files, `.agents/skills/*`, `.codex/rules/`, and `openspec/` as its repository-local workflow sources.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses root `AGENTS.md`, applicable directory `AGENTS.override.md` files, and `.agents/skills/*`
- **AND** it may read `.codex/rules/` and `openspec/` files as routed project context

### Requirement: Repository memory stays as a clean baseline
The Codex workflow MUST keep the repository-level `.codex/memory/` system for a fresh Tyou framework checkout while avoiding process-only memory entries.

#### Scenario: L2 or higher task starts
- **WHEN** Codex begins an L2, L3, or L4 task
- **THEN** it reads `.codex/memory/INDEX.md`
- **AND** an empty index is treated as a valid clean baseline

#### Scenario: Process-only memory candidate is found
- **WHEN** a candidate memory is recoverable from source, git, OpenSpec archive, current conversation state, or command logs
- **THEN** Codex does not create a memory entry

#### Scenario: Reusable memory is recorded
- **WHEN** a pitfall, decision, feedback, or reference is genuinely reusable across sessions
- **THEN** Codex records it under `.codex/memory/` and updates `.codex/memory/INDEX.md`

### Requirement: Workflow archive records may be pruned
The Codex workflow MUST allow historical OpenSpec archive records to be removed from a fresh framework delivery after their current authoritative behavior is preserved in active specs, rules, docs, and templates.

#### Scenario: Fresh framework delivery is prepared
- **WHEN** archived workflow records duplicate outdated or historical guidance
- **THEN** Codex may delete those archive records while preserving the `openspec/changes/archive/` directory for future changes

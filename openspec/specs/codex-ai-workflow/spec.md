# codex-ai-workflow Specification

## Purpose
Define the mandatory Codex workflow for the Tyou Cocos Creator project, including OpenSpec supervision, Tyou-specific rule precedence, local correction loops, and token-efficient task routing over `.codex/rules/` content.
## Requirements
### Requirement: Codex replies in Chinese
The Codex workflow MUST require project-facing proposals and answers to be written in Chinese, while preserving literal code identifiers, commands, file paths, API names, and logs in their original language.

#### Scenario: Project-facing response is produced
- **WHEN** Codex writes a proposal, clarification, progress update, explanation, summary, or final answer for this project
- **THEN** the human-facing prose is written in Chinese

#### Scenario: Literal technical text is included
- **WHEN** Codex includes code identifiers, commands, file paths, API names, or log output in a response
- **THEN** those literal technical values remain unchanged unless the user explicitly asks for translation or rewriting

### Requirement: OpenSpec gates implementation tasks
The Codex workflow MUST require OpenSpec supervision before any L2 or higher implementation task modifies code, resources, prefabs, configuration, workflow documents, or framework behavior.

#### Scenario: L2 or higher task begins
- **WHEN** a Codex task is classified as L2, L3, or L4 and requires implementation
- **THEN** the workflow checks OpenSpec CLI availability and repository initialization before implementation

#### Scenario: OpenSpec is unavailable
- **WHEN** the OpenSpec CLI or repository initialization is missing
- **THEN** the workflow pauses implementation and asks the developer to confirm installation or initialization

### Requirement: Tyou project rules remain authoritative
OpenSpec artifacts MUST follow Tyou rules from `AGENTS.md`, applicable directory `AGENTS.override.md` files, `.agents/skills/*`, Codex project rules under `.codex/rules/`, and relevant structured memory under `.codex/memory/`.

#### Scenario: OpenSpec artifact conflicts with Tyou rules
- **WHEN** an OpenSpec artifact suggests behavior that conflicts with Tyou framework, UI, resource, Luban, prefab, or Codex AI workflow constraints
- **THEN** the Tyou rule takes precedence and the artifact is updated before implementation continues

### Requirement: Codex workflow uses Codex files
The Codex workflow MUST use `AGENTS.md`, applicable directory `AGENTS.override.md` files, `.agents/skills/*`, `.codex/rules/`, `openspec/`, and structured memory under `.codex/memory/`.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses root `AGENTS.md`, applicable directory `AGENTS.override.md` files, and `.agents/skills/*`
- **AND** it may read `.codex/rules/`, `.codex/memory/INDEX.md`, and `openspec/` files as routed project context

#### Scenario: Codex enters a specialized directory
- **WHEN** Codex works with current directory under `Client/extensions/` or `Client/assets/ty-framework/`
- **THEN** the corresponding `AGENTS.override.md` provides the directory-specific constraints after the root instructions

#### Scenario: Codex workflow files are updated
- **WHEN** `AGENTS.md`, `**/AGENTS.override.md`, `.agents/skills/*`, `.codex/rules/`, `.codex/memory/`, README/Books workflow docs, or OpenSpec workflow specs are updated
- **THEN** the change checks Codex workflow consistency

### Requirement: Codex workflow stays concise
The Codex workflow MUST keep entry files focused on executable constraints and route detailed topic rules to `.codex/rules/`.

#### Scenario: Codex workflow task begins
- **WHEN** Codex handles a Codex workflow documentation, routing, OpenSpec, memory, or task classification change
- **THEN** the workflow preserves Codex entrypoints and Codex project rules
- **AND** it avoids duplicating long topic reference content in entry files

### Requirement: Codex rules route to project rules
The Codex workflow MUST treat `.codex/rules/` as the canonical source for detailed Tyou development rules.

#### Scenario: Codex skill needs topic details
- **WHEN** `.agents/skills/tyou-dev/SKILL.md` routes a task to topic details
- **THEN** it points to the corresponding `.codex/rules/tyou-dev/*.md` file
- **AND** it does not duplicate detailed topic rules inside the skill file

### Requirement: Workflow docs stay local and factual
The workflow documentation MUST describe Tyou's current Codex adapter behavior directly and MUST NOT keep external project comparison sections or unrelated external engine concepts.

#### Scenario: Updating Tyou workflow docs
- **WHEN** workflow documentation is updated
- **THEN** it states the local Tyou/Codex adapter behavior directly and excludes external project comparison language

### Requirement: Workflow correction loop remains local and factual
The Codex workflow MUST document local correction mechanisms that actually exist, and MUST mark unimplemented mechanisms as optional enhancements.

#### Scenario: Code and reference conflict
- **WHEN** source code, tools, or generated output contradict workflow/reference documentation
- **THEN** Codex verifies the source behavior, updates `.codex/rules/` or Codex adapter documentation when appropriate, and records reusable pitfalls in the appropriate `.codex/memory/` category

#### Scenario: Optional enhancement is mentioned
- **WHEN** workflow documentation mentions hard gates or other unimplemented controls
- **THEN** it labels them as optional future enhancements rather than current behavior

### Requirement: Structured memory is indexed
The Codex workflow MUST keep reusable memory discoverable through `.codex/memory/INDEX.md` and typed memory folders rather than relying on a single chronological log.

#### Scenario: L2 or higher task starts
- **WHEN** Codex begins an L2, L3, or L4 task
- **THEN** it reads `.codex/memory/INDEX.md`
- **AND** it opens only the relevant `problems/`, `decisions/`, `feedback/`, or `references/` entries needed for the task

#### Scenario: New reusable memory is recorded
- **WHEN** Codex records a reusable pitfall, decision, user feedback, or external reference
- **THEN** it writes a typed memory entry under `.codex/memory/`
- **AND** it updates `.codex/memory/INDEX.md`

### Requirement: OpenSpec phases have hard boundaries
The Codex OpenSpec workflow MUST keep explore read-only for implementation surfaces, apply task-driven, and archive guarded by task/artifact/spec-sync checks.

#### Scenario: Explore mode is active
- **WHEN** Codex is exploring a requirement, bug, or design
- **THEN** it may read source and docs
- **AND** it does not modify code, assets, Prefabs, Scene files, meta files, generated config, or workflow docs unless the user explicitly asks to capture an OpenSpec artifact

#### Scenario: Apply reveals unsafe scope
- **WHEN** implementation reveals unclear tasks, design conflicts, ty-framework changes, Prefab/Scene/meta ambiguity, or incompatible Luban changes
- **THEN** Codex pauses and asks for confirmation or artifact updates before continuing

#### Scenario: Archive is requested
- **WHEN** Codex archives a change
- **THEN** it checks artifact status, task completion, and any delta specs under `openspec/changes/<name>/specs/` before moving the change

### Requirement: Specialized workflow skills are explicit
The Codex workflow MUST expose specialized skills for Luban configuration, read-only Wiki/documentation query, and controlled Wiki/documentation synchronization.

#### Scenario: Luban configuration work is requested
- **WHEN** Codex handles configuration table schema, data, export, or compatibility work
- **THEN** it routes to `luban-dev`

#### Scenario: Documentation lookup is requested
- **WHEN** Codex needs to locate or answer from project documentation without changing it
- **THEN** it routes to `wiki-query`

#### Scenario: Documentation/code drift is requested
- **WHEN** Codex needs to scan, diff, or synchronize project documentation with implementation behavior
- **THEN** it routes to `wiki-sync`

### Requirement: Wiki synchronization is configured and guarded
The Codex workflow MUST use `wiki-sync.yaml` and local scripts for Wiki/documentation scanning, query, reporting, and guarded write operations.

#### Scenario: Wiki scan is requested
- **WHEN** Codex scans documentation coverage or drift
- **THEN** it uses `wiki-sync.yaml` to discover source paths, documentation includes, mappings, ignores, and conflict strategy

#### Scenario: Wiki query is requested
- **WHEN** Codex performs a local documentation query
- **THEN** it searches the document set configured by `wiki-sync.yaml` before falling back to default paths

#### Scenario: Wiki write is requested
- **WHEN** Codex writes a Wiki sync report, TODO, or synchronized documentation output
- **THEN** `write_enabled` or an explicit write flag is required
- **AND** backups and sensitive-pattern handling are treated as required safeguards

### Requirement: Luban work has executable helpers
The Codex workflow MUST provide executable Luban helpers for Tyou configuration table inspection, validation, reference checks, and guarded edits.

#### Scenario: Luban table inspection is requested
- **WHEN** Codex needs table, field, row, enum, or bean information
- **THEN** it may use `.agents/skills/luban-dev/scripts/luban_helper.py` in read-only mode

#### Scenario: Luban table edit is requested
- **WHEN** Codex edits `Design/config/#*.xlsx`
- **THEN** the helper requires an explicit `--write` flag and the task follows OpenSpec gating

#### Scenario: Luban compatibility risk exists
- **WHEN** a field, row, type, table, enum, or bean change may break references
- **THEN** Codex runs reference or validation checks before proposing the edit

### Requirement: Skill behavior has regression examples
The Codex workflow MUST keep Tyou skill regression examples for AI behavior checks.

#### Scenario: Tyou skill behavior is reviewed
- **WHEN** Codex workflow or Tyou rules change
- **THEN** `.agents/skills/tyou-dev/evals/evals.json` provides expected and forbidden response patterns for core workflows

### Requirement: Token efficiency remains explicit
The workflow MUST keep L1 tasks outside OpenSpec and MUST route Codex project rules by topic so OpenSpec does not increase token cost for trivial work.

#### Scenario: L1 task is requested
- **WHEN** the task is a typo, comment, log, or single-line non-framework rename
- **THEN** Codex may skip OpenSpec and Codex rule loading

### Requirement: Source search has a fallback
The Codex AI workflow MUST treat `rg` as the preferred source search tool, not as a mandatory environment dependency. When `rg` is unavailable, the workflow MUST continue source or documentation lookup with an available fallback such as VS Code `grep_search` or PowerShell `Select-String`.

#### Scenario: rg is unavailable during workflow investigation
- **WHEN** Codex needs to locate source code, Codex project rules, or workflow documentation and the `rg` command is unavailable in the current environment
- **THEN** Codex continues the lookup with VS Code `grep_search` or PowerShell `Select-String` instead of blocking the task on `rg`

#### Scenario: Workflow documentation describes source lookup
- **WHEN** workflow documentation instructs Codex to verify behavior by searching source code or documentation
- **THEN** it states that `rg` is preferred and names at least one fallback path for environments where `rg` is unavailable

### Requirement: Battle design follows composition-first mini-game constraints
The Codex AI workflow MUST require battle-related design work to prefer composition over inheritance, evaluate the existing Tyou ECS before introducing a new battle architecture, and account for WeChat, Douyin, and similar mini-game JavaScript runtime constraints.

#### Scenario: Battle design task begins
- **WHEN** Codex handles a battle, combat, skill, Buff, damage, projectile, hit, AI behavior, or battle-state design task
- **THEN** the workflow routes the task to the battle design reference and treats composition-first modeling as the default design constraint

#### Scenario: Existing ECS is evaluated
- **WHEN** Codex considers architecture for battle entities, components, systems, or high-frequency battle updates
- **THEN** Codex evaluates the existing `tyou.ecs` implementation before proposing a custom ECS or inheritance-heavy model

#### Scenario: Existing ECS is unsuitable
- **WHEN** the existing `tyou.ecs` implementation does not fit the battle requirement, performance profile, or interface constraints
- **THEN** Codex may propose a lightweight custom design and MUST explain why the existing ECS was not used

#### Scenario: Mini-game runtime constraints apply
- **WHEN** Codex designs battle APIs or high-frequency runtime logic for this project
- **THEN** the design avoids unnecessary deep inheritance, broad abstract interfaces, reflection-like dynamic dispatch, runtime code generation, and avoidable per-frame allocation

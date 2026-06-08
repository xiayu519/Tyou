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
The workflow documentation MUST describe Tyou's current Codex behavior directly and exclude source-comparison sections or unrelated engine lineage concepts.

#### Scenario: Updating Tyou workflow docs
- **WHEN** workflow documentation is updated
- **THEN** it states the local Tyou/Codex behavior directly and excludes source-comparison language

### Requirement: Workflow documentation uses current Codex wording
The Codex workflow MUST describe the current Codex entrypoints and execution path directly.

#### Scenario: Active workflow docs are updated
- **WHEN** active workflow documentation is edited
- **THEN** it states the current Codex entrypoints and rules directly
- **AND** it avoids obsolete history or reverse descriptions of removed paths

### Requirement: Workflow correction loop remains local and factual
The Codex workflow MUST document local correction mechanisms that actually exist, and MUST mark unimplemented mechanisms as optional enhancements.

#### Scenario: Code and reference conflict
- **WHEN** source code, tools, or generated output contradict workflow/reference documentation
- **THEN** Codex verifies the source behavior, updates `.codex/rules/` or Codex workflow documentation when appropriate, and records reusable pitfalls in the appropriate `.codex/memory/` category

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
- **WHEN** Codex records a reusable pitfall, decision, user feedback, or reference material
- **THEN** it writes a typed memory entry under `.codex/memory/`
- **AND** it updates `.codex/memory/INDEX.md`

### Requirement: Structured memory entries use frontmatter
The Codex workflow MUST store active memory entries with typed frontmatter so Codex can route memory without reading every full entry.

#### Scenario: Memory entry is recorded
- **WHEN** Codex records a reusable memory entry under `.codex/memory/`
- **THEN** the entry has frontmatter fields `type`, `description`, `status`, `last_verified`, and `source`
- **AND** `type` is one of `problem`, `decision`, `feedback`, or `reference`

#### Scenario: Existing active memory is maintained
- **WHEN** Codex updates an active memory entry
- **THEN** it keeps the frontmatter current

### Requirement: Memory writes exclude recoverable or unstable facts
The Codex workflow MUST prevent memory from becoming a duplicate source of truth for code, git history, temporary task state, or unverified guesses.

#### Scenario: Codex considers writing memory
- **WHEN** Codex decides whether to write `.codex/memory/`
- **THEN** it writes only reusable pitfalls, decisions, user feedback, or reference material that cannot be reliably recovered from source search, OpenSpec artifacts, git history, or current conversation state

#### Scenario: Candidate memory is recoverable elsewhere
- **WHEN** the candidate memory is a code pattern, file path detail, recent modification, temporary task state, full log, or unverified guess
- **THEN** Codex does not write it to memory

### Requirement: Memory is verified before use when stale-prone
The Codex workflow MUST treat memory as historical supporting context rather than current truth.

#### Scenario: Memory mentions stale-prone facts
- **WHEN** a memory entry mentions tool behavior, workflow state, reference material, file paths, functions, flags, or dates
- **THEN** Codex verifies the current source, rule, OpenSpec, or referenced material before acting on that memory

#### Scenario: Memory conflicts with authoritative sources
- **WHEN** memory conflicts with source code, current tool output, OpenSpec specs, or `.codex/rules/`
- **THEN** Codex follows the authoritative source and updates or marks the memory entry stale or superseded when appropriate

### Requirement: Memory index stays compact
The Codex workflow MUST keep `.codex/memory/INDEX.md` short enough to remain a routing index rather than a memory body.

#### Scenario: Memory index is updated
- **WHEN** Codex updates `.codex/memory/INDEX.md`
- **THEN** each memory entry is represented by one concise line
- **AND** long explanations stay in the typed memory entry

#### Scenario: Memory index approaches size limits
- **WHEN** `.codex/memory/INDEX.md` approaches 80 lines or 12 KB
- **THEN** Codex consolidates, shortens, or splits entries instead of appending long summaries

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
- **WHEN** Codex handles configuration table schema, data, export, or breaking-change safety work
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

#### Scenario: Luban breaking-change risk exists
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

### Requirement: L2 OpenSpec changes stay lightweight
The Codex workflow MUST keep L2 OpenSpec changes lightweight so small tasks do not inherit L3/L4 evidence overhead.

#### Scenario: L2 change is proposed
- **WHEN** Codex creates an L2 OpenSpec change
- **THEN** proposal, tasks, and any spec delta stay minimal and directly tied to the single-module change
- **AND** `run-report.md` is not required unless the developer asks for it or the task reveals reusable workflow risk

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

### Requirement: Codex changes produce local run evidence
The Codex workflow MUST require L3 and L4 OpenSpec changes to maintain local run evidence that summarizes agent actions, touched surfaces, validation commands, sensor results, and residual risks.

#### Scenario: L3 or L4 implementation is performed
- **WHEN** Codex applies an OpenSpec change classified as L3 or L4
- **THEN** the change directory contains or updates `run-report.md`
- **AND** the report records an executive summary, change name, task level, touched files or directories, completed tasks, validation commands, sensor summary, and remaining risks

### Requirement: Run reports begin with an executive summary
The Codex workflow MUST make L3/L4 run reports efficient to reread.

#### Scenario: Run report is created
- **WHEN** Codex creates `openspec/changes/<change-name>/run-report.md`
- **THEN** it includes `## Executive Summary` before detailed scope, progress, validation, and risk sections
- **AND** the summary states the goal, current state, validation outcome, and remaining risk in short bullets

#### Scenario: L1 or L2 task is performed
- **WHEN** Codex handles an L1 task or a lightweight L2 task
- **THEN** the workflow does not require a run report unless the developer asks for one or the task reveals reusable workflow risk

### Requirement: Codex observability uses deterministic sensors first
The Codex workflow MUST provide local deterministic sensor entrypoints for workflow checks before relying on AI-only review.

#### Scenario: Workflow sensor check runs
- **WHEN** Codex validates a workflow change or a developer requests Codex observability checks
- **THEN** a local script can inspect OpenSpec status, change artifacts, task progress, protected-path changes, workflow file presence, and run-report shape
- **AND** the output distinguishes passed checks, warnings, and failures

#### Scenario: Sensor cannot prove semantic correctness
- **WHEN** a sensor only verifies file shape, presence, or local command state
- **THEN** the workflow treats the result as supporting evidence rather than proof that the implementation is semantically correct

### Requirement: Codex observability feeds local correction loops
The Codex workflow MUST feed repeated observability findings into local Tyou correction loops instead of retaining them only in transient reports.

#### Scenario: Reusable issue is found
- **WHEN** a run report, sensor, or review exposes a recurring pitfall, confirmed workflow decision, user feedback, or useful reference material
- **THEN** Codex records it in the appropriate `.codex/memory/` category and updates `.codex/memory/INDEX.md`

#### Scenario: Documentation drift is found
- **WHEN** observability evidence shows workflow documentation, skills, rules, README, Books, or OpenSpec specs are inconsistent
- **THEN** Codex uses the existing OpenSpec and wiki-sync guarded workflow to update the stale documents

### Requirement: Completed OpenSpec changes archive without redundant confirmation
The Codex workflow MUST archive a clearly selected completed OpenSpec change without asking for an extra developer confirmation when all archive gates are already satisfied.

#### Scenario: Completed change is ready to archive
- **WHEN** the change name is clear, artifacts are complete, tasks are all checked, delta specs are synced to main specs, required validations pass, and no blocking risk exists
- **THEN** Codex archives the change directly to `openspec/changes/archive/YYYY-MM-DD-<change-name>/`

#### Scenario: Archive gate is not satisfied
- **WHEN** the change is ambiguous, artifacts or tasks are incomplete, delta specs are unsynced, validation fails, the archive target already exists, or a developer-confirmed risk is required
- **THEN** Codex pauses and asks the developer before archiving

### Requirement: Workflow archive records may be pruned
The Codex workflow MUST allow outdated workflow archive records to be removed when their rules have been superseded by current authoritative docs and specs.

#### Scenario: Obsolete workflow archive records remain
- **WHEN** archived workflow records duplicate outdated guidance
- **THEN** Codex may delete those archive records after preserving the current authoritative behavior in active specs, rules, docs, and templates

### Requirement: Codex harness uses command evidence
The Codex workflow MUST keep the harness focused on run reports, deterministic sensor checks, memory/rule synchronization, and OpenSpec archive gates.

#### Scenario: L3 or L4 change is reviewed
- **WHEN** Codex prepares review evidence for an L3 or L4 OpenSpec change
- **THEN** it uses `run-report.md`, `codex-observability-check.ps1`, OpenSpec status/validation, and relevant memory or rule updates

#### Scenario: Developer asks about workflow state
- **WHEN** the developer asks for current Codex workflow state
- **THEN** Codex summarizes the underlying files and command outputs directly

### Requirement: Reference material is verified before synchronization
The Codex workflow MUST treat non-source reference material as input that requires local verification before it changes Tyou documentation, rules, OpenSpec specs, or memory.

#### Scenario: Codex uses non-source reference material
- **WHEN** Codex reads material that is not current Tyou source code, current tool output, current workspace diff, or existing OpenSpec specs for a documentation or workflow update
- **THEN** Codex verifies the relevant claims against current source code, current workspace diff, local tools, or existing OpenSpec specs before writing project documentation

#### Scenario: Reference claim cannot be verified locally
- **WHEN** a reference claim cannot be verified from Tyou source code, tools, current workspace changes, or existing project documentation
- **THEN** Codex does not write that claim as an authoritative project fact

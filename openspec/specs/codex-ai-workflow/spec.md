# codex-ai-workflow Specification

## Purpose
Define the mandatory Codex CLI adapter workflow for the Tyou Cocos Creator project, including OpenSpec supervision, Tyou-specific rule precedence, local correction loops, and token-efficient task routing over shared `.ai/rules/` content.
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
OpenSpec artifacts MUST follow Tyou rules from `AGENTS.md`, `.agents/skills/tyou-dev/SKILL.md`, and shared rules under `.ai/rules/`.

#### Scenario: OpenSpec artifact conflicts with Tyou rules
- **WHEN** an OpenSpec artifact suggests behavior that conflicts with Tyou framework, UI, resource, Luban, prefab, or shared AI workflow constraints
- **THEN** the Tyou rule takes precedence and the artifact is updated before implementation continues

### Requirement: Codex adapter is isolated from Claude Code
The Codex workflow MUST use Codex-native files as its adapter layer and MUST NOT depend on Claude Code-specific workflow files.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses `AGENTS.md` and `.agents/skills/*`
- **AND** it may read shared `.ai/rules/` and `openspec/` files
- **AND** it does not require `.claude/` files

### Requirement: Codex rules route to shared rules
The Codex workflow MUST treat `.ai/rules/` as the canonical source for detailed Tyou development rules.

#### Scenario: Codex skill needs topic details
- **WHEN** `.agents/skills/tyou-dev/SKILL.md` routes a task to topic details
- **THEN** it points to the corresponding `.ai/rules/tyou-dev/*.md` file
- **AND** it does not rely on any CLI-specific legacy reference tree

### Requirement: Workflow docs stay local and factual
The workflow documentation MUST describe Tyou's current Codex adapter behavior directly and MUST NOT keep external project comparison sections or unrelated external engine concepts.

#### Scenario: Updating Tyou workflow docs
- **WHEN** workflow documentation is updated
- **THEN** it states the local Tyou/Codex adapter behavior directly and excludes external project comparison language

### Requirement: Workflow correction loop remains local and factual
The Codex workflow MUST document local correction mechanisms that actually exist, and MUST mark unimplemented mechanisms as optional enhancements.

#### Scenario: Code and reference conflict
- **WHEN** source code, tools, or generated output contradict workflow/reference documentation
- **THEN** Codex verifies the source behavior, updates shared `.ai/rules/` or Codex adapter documentation when appropriate, and records reusable pitfalls in `.codex/memory/`

#### Scenario: Optional enhancement is mentioned
- **WHEN** workflow documentation mentions wiki sync, hard gates, or other unimplemented controls
- **THEN** it labels them as optional future enhancements rather than current behavior

### Requirement: Token efficiency remains explicit
The workflow MUST keep L1 tasks outside OpenSpec and MUST route shared rules by topic so OpenSpec does not increase token cost for trivial work.

#### Scenario: L1 task is requested
- **WHEN** the task is a typo, comment, log, or single-line non-framework rename
- **THEN** Codex may skip OpenSpec and shared-rule loading

### Requirement: Source search has a fallback
The Codex AI workflow MUST treat `rg` as the preferred source search tool, not as a mandatory environment dependency. When `rg` is unavailable, the workflow MUST continue source or documentation lookup with an available fallback such as VS Code `grep_search` or PowerShell `Select-String`.

#### Scenario: rg is unavailable during workflow investigation
- **WHEN** Codex needs to locate source code, shared rules, or workflow documentation and the `rg` command is unavailable in the current environment
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

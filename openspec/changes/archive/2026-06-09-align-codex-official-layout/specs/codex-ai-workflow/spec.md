## MODIFIED Requirements

### Requirement: Codex workflow uses Codex files
The Codex workflow MUST use `AGENTS.md`, applicable directory `AGENTS.override.md` files, `.agents/skills/*`, `openspec/`, and structured project memory under `.codex/memory/`.

#### Scenario: Codex loads project workflow
- **WHEN** Codex reads project workflow instructions
- **THEN** it uses root `AGENTS.md`, applicable directory `AGENTS.override.md` files, and `.agents/skills/*`
- **AND** it may read `.agents/skills/tyou-dev/references/`, `.codex/memory/INDEX.md`, and `openspec/` files as routed project context

#### Scenario: Codex enters a specialized directory
- **WHEN** Codex works with current directory under `Client/extensions/` or `Client/assets/ty-framework/`
- **THEN** the corresponding `AGENTS.override.md` provides the directory-specific constraints after the root instructions

#### Scenario: Codex workflow files are updated
- **WHEN** `AGENTS.md`, `**/AGENTS.override.md`, `.agents/skills/*`, `.codex/memory/`, README/Books workflow docs, or OpenSpec workflow specs are updated
- **THEN** the change checks Codex workflow consistency

### Requirement: Codex workflow stays concise
The Codex workflow MUST keep entry files focused on executable constraints and route detailed topic references to skill-owned references.

#### Scenario: Codex workflow task begins
- **WHEN** Codex handles a Codex workflow documentation, routing, OpenSpec, memory, or task classification change
- **THEN** the workflow preserves Codex entrypoints and Tyou project references
- **AND** it avoids duplicating long topic reference content in entry files

#### Scenario: Skill entrypoint is updated
- **WHEN** `.agents/skills/tyou-dev/SKILL.md` is updated
- **THEN** it remains a concise router for Tyou-specific topics and specialized skills
- **AND** detailed execution steps stay in `.agents/skills/tyou-dev/references/` or the specialized skill documents

### Requirement: Workflow correction loop remains local and factual
The Codex workflow MUST document local correction mechanisms that actually exist, and MUST mark unimplemented mechanisms as optional enhancements.

#### Scenario: Code and reference conflict
- **WHEN** source code, tools, or generated output contradict workflow/reference documentation
- **THEN** Codex verifies the source behavior, updates skill-owned topic references or Codex workflow documentation when appropriate, and records reusable pitfalls in the appropriate `.codex/memory/` category

#### Scenario: Optional enhancement is mentioned
- **WHEN** workflow documentation mentions hard gates or other unimplemented controls
- **THEN** it labels them as optional future enhancements rather than current behavior

### Requirement: Prefab source JSON edits are permitted under bounded workflow
The Codex workflow MUST allow Codex to create, read, update, and delete project source `.prefab` assets and necessary matching `.prefab.meta` files when the task is supervised by OpenSpec and follows the Prefab-specific Tyou reference.

#### Scenario: Prefab source asset edit is requested
- **WHEN** Codex is asked to create, inspect, modify, rename, or delete a Cocos Prefab source asset
- **THEN** Codex uses `.agents/skills/tyou-dev/references/prefab-workflow.md` as the Prefab-specific workflow
- **AND** it treats submitted source `.prefab` files as structured Cocos JSON object arrays rather than opaque binary files

#### Scenario: Prefab generated cache is encountered
- **WHEN** Codex encounters Cocos generated cache, imported output, build output, or temporary Prefab-derived files outside the source asset tree
- **THEN** Codex does not treat those files as normal edit targets
- **AND** it updates the source `.prefab` or asks for a tool/editor path instead

### Requirement: Scene source JSON edits are permitted under bounded workflow
The Codex workflow MUST allow Codex to create, read, update, and delete project source `.scene` assets and necessary matching `.scene.meta` files when the task is supervised by OpenSpec and follows the Scene-specific Tyou reference.

#### Scenario: Scene source asset edit is requested
- **WHEN** Codex is asked to create, inspect, modify, rename, or delete a Cocos Scene source asset
- **THEN** Codex uses `.agents/skills/tyou-dev/references/scene-workflow.md` as the Scene-specific workflow
- **AND** it treats submitted source `.scene` files as structured Cocos JSON object arrays rather than opaque binary files

#### Scenario: Scene edit may affect runtime startup contracts
- **WHEN** a Scene edit touches startup nodes, scene registration, Prefab instances, or resource index membership
- **THEN** Codex verifies the relevant references and synchronizes affected workflow or runtime documentation when needed

### Requirement: Source search has a fallback
The Codex AI workflow MUST treat `rg` as the preferred source search tool, not as a mandatory environment dependency. When `rg` is unavailable, the workflow MUST continue source or documentation lookup with an available fallback such as VS Code `grep_search` or PowerShell `Select-String`.

#### Scenario: rg is unavailable during workflow investigation
- **WHEN** Codex needs to locate source code, Tyou project references, or workflow documentation and the `rg` command is unavailable in the current environment
- **THEN** Codex continues the lookup with VS Code `grep_search` or PowerShell `Select-String` instead of blocking the task on `rg`

#### Scenario: Workflow documentation describes source lookup
- **WHEN** workflow documentation instructs Codex to verify behavior by searching source code or documentation
- **THEN** it states that `rg` is preferred and names at least one fallback path for environments where `rg` is unavailable

## ADDED Requirements

### Requirement: Codex command rules keep official meaning
The Codex workflow MUST reserve `.codex/rules/*.rules` terminology for official Codex command approval policy and MUST NOT use `.codex/rules/` as the project Markdown topic-rule store.

#### Scenario: Command policy is needed
- **WHEN** Tyou needs project-local command approval policy
- **THEN** it uses official `.rules` files under a trusted `.codex/rules/` config layer
- **AND** Markdown topic references remain under skill-owned references

### Requirement: Tyou structured memory is project-owned
The Codex workflow MUST treat `.codex/memory/` as Tyou's checked-in structured project memory and distinguish it from official Codex generated user memories under the Codex home directory.

#### Scenario: L2 or higher task starts
- **WHEN** Codex begins an L2, L3, or L4 Tyou task
- **THEN** it reads `.codex/memory/INDEX.md`
- **AND** it opens only the relevant `problems/`, `decisions/`, `feedback/`, or `references/` entries needed for the task

#### Scenario: New reusable project memory is recorded
- **WHEN** Codex observes a reusable pitfall, confirms a durable decision, receives reusable user feedback, or locates reusable reference material for Tyou
- **THEN** it writes a typed project memory entry under `.codex/memory/`
- **AND** it updates `.codex/memory/INDEX.md`

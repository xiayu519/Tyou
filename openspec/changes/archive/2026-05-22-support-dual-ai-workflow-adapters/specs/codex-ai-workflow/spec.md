# codex-ai-workflow Delta

## Modified Requirements

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

### Requirement: Codex rules route to shared references

The Codex workflow MUST treat `.ai/rules/` as the canonical source for detailed Tyou development references.

#### Scenario: Codex skill needs topic details

- **WHEN** `.agents/skills/tyou-dev/SKILL.md` routes a task to a topic reference
- **THEN** it points to the corresponding `.ai/rules/tyou-dev/*.md` file
- **AND** legacy `.agents/skills/tyou-dev/references/*.md` files, if present, contain only compatibility pointers rather than duplicate reference content

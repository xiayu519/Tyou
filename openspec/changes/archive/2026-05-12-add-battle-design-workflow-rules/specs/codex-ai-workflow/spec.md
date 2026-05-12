## ADDED Requirements

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

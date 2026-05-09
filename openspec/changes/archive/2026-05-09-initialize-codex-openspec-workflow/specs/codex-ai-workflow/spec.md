## ADDED Requirements

### Requirement: OpenSpec gates implementation tasks
The Codex workflow MUST require OpenSpec supervision before any L2 or higher implementation task modifies code, resources, prefabs, configuration, workflow documents, or framework behavior.

#### Scenario: L2 or higher task begins
- **WHEN** a Codex task is classified as L2, L3, or L4 and requires implementation
- **THEN** the workflow checks OpenSpec CLI availability and repository initialization before implementation

#### Scenario: OpenSpec is unavailable
- **WHEN** the OpenSpec CLI or repository initialization is missing
- **THEN** the workflow pauses implementation and asks the developer to confirm installation or initialization

### Requirement: Tyou project rules remain authoritative
OpenSpec artifacts MUST follow Tyou rules from `AGENTS.md`, `.codex/skills/tyou-dev/SKILL.md`, and relevant references.

#### Scenario: OpenSpec artifact conflicts with Tyou rules
- **WHEN** an OpenSpec artifact suggests behavior that conflicts with Tyou framework, UI, resource, Luban, or prefab constraints
- **THEN** the Tyou rule takes precedence and the artifact is updated before implementation continues

### Requirement: Reference project concepts are not persisted
The workflow MUST use the reference Unity project only for workflow structure and MUST NOT persist Unity/TEngine runtime concepts in Tyou AI workflow requirements.

#### Scenario: Updating Tyou workflow docs
- **WHEN** workflow documentation is updated after comparing with the reference project
- **THEN** only reusable workflow structure is kept, and engine-specific reference concepts are excluded

### Requirement: Token efficiency remains explicit
The workflow MUST keep L1 tasks outside OpenSpec and MUST route references by topic so OpenSpec does not increase token cost for trivial work.

#### Scenario: L1 task is requested
- **WHEN** the task is a typo, comment, log, or single-line non-framework rename
- **THEN** Codex may skip OpenSpec and reference loading

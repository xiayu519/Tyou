## MODIFIED Requirements

### Requirement: Workflow docs stay local and factual
The workflow documentation MUST describe Tyou's current GPT/Codex workflow directly and MUST NOT keep external project comparison sections or unrelated external engine concepts.

#### Scenario: Updating Tyou workflow docs
- **WHEN** workflow documentation is updated
- **THEN** it states the local Tyou/Codex behavior directly and excludes external project comparison language

### Requirement: Workflow correction loop remains local and factual
The Codex workflow MUST document local correction mechanisms that actually exist, and MUST mark unimplemented mechanisms as optional enhancements.

#### Scenario: Code and reference conflict
- **WHEN** source code, tools, or generated output contradict workflow/reference documentation
- **THEN** Codex verifies the source behavior, updates the relevant local documentation when appropriate, and records reusable pitfalls in `.codex/memory/`

#### Scenario: Optional enhancement is mentioned
- **WHEN** workflow documentation mentions wiki sync, hard gates, or other unimplemented controls
- **THEN** it labels them as optional future enhancements rather than current behavior

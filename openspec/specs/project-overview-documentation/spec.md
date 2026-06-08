# project-overview-documentation Specification

## Purpose
Define how Tyou project overview documentation describes the current Cocos Creator framework positioning, runtime contracts, and verified reference-material usage.
## Requirements
### Requirement: README states Tyou project positioning
The project overview documentation MUST describe Tyou as a Cocos Creator 3.8.7 + TypeScript client framework without using source-comparison language or unrelated engine lineage labels.

#### Scenario: Reader checks project positioning
- **WHEN** a reader opens the project README
- **THEN** the project positioning identifies the Cocos Creator and TypeScript implementation directly
- **AND** it does not explain Tyou through unrelated source-comparison labels

### Requirement: Project overview documents local runtime contracts
The project overview documentation MUST describe current Tyou runtime contracts using local implementation facts, including the global `tyou.*` module entry, resource safety helper, Luban-backed localization, and required scene nodes when they are part of startup behavior.

#### Scenario: Reader checks runtime assumptions
- **WHEN** a reader checks the project overview for framework startup assumptions
- **THEN** the documented assumptions match current source behavior for `tyou.*`, `GameRoot`, `UICanvas`, and `UICanvas/UICamera`

#### Scenario: Reader checks text runtime APIs
- **WHEN** a reader checks the project overview for text-related runtime APIs
- **THEN** the documentation states that localization uses Luban configuration

### Requirement: Project overview excludes unverified reference content
The project overview documentation MUST NOT copy reference-material comparisons, risk claims, or recommendations into README/Books unless they have been verified against current source code, tool behavior, or OpenSpec artifacts.

#### Scenario: Reference material is used for documentation
- **WHEN** reference material suggests a project description or risk
- **THEN** documentation updates include only the parts verified against local Tyou sources or tools

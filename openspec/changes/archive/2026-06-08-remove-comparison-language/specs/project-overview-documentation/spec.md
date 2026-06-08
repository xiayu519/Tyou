## MODIFIED Requirements

### Requirement: README states Tyou project positioning
The project overview documentation MUST describe Tyou as a Cocos Creator 3.8.7 + TypeScript client framework without using source-comparison language or unrelated engine lineage labels.

#### Scenario: Reader checks project positioning
- **WHEN** a reader opens the project README
- **THEN** the project positioning identifies the Cocos Creator and TypeScript implementation directly
- **AND** it does not explain Tyou through unrelated source-comparison labels

### Requirement: Project overview excludes unverified reference content
The project overview documentation MUST NOT copy reference-material comparisons, risk claims, or recommendations into README/Books unless they have been verified against current source code, tool behavior, or OpenSpec artifacts.

#### Scenario: Reference material is used for documentation
- **WHEN** reference material suggests a project description or risk
- **THEN** documentation updates include only the parts verified against local Tyou sources or tools

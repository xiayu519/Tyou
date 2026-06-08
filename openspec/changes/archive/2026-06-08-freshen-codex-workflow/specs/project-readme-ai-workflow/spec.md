## MODIFIED Requirements

### Requirement: README excludes Codex workflow mechanics
The project README MUST describe project usage and user-facing project facts without hosting Codex workflow mechanics, rule maps, memory rules, OpenSpec gates, archive history, or sensor behavior.

#### Scenario: Reader checks README for project usage
- **WHEN** a reader opens the README
- **THEN** the README describes project setup, runtime assumptions, project tooling, and usage-oriented facts
- **AND** it does not include a Codex workflow section, Codex rule map, memory rules, or OpenSpec archive history

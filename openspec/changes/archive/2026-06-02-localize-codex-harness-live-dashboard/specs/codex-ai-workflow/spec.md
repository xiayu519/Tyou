## ADDED Requirements

### Requirement: Live dashboard is readable in Chinese
The Codex workflow MUST make project-facing live dashboard labels and explanatory text readable in Chinese while preserving literal technical identifiers.

#### Scenario: Developer views live dashboard
- **WHEN** the developer opens the live harness dashboard
- **THEN** navigation labels, table headings, visible status labels, details prompts, and explanatory text are shown in Chinese
- **AND** file paths, commands, API names, and raw technical identifiers remain unchanged where they are useful for debugging

#### Scenario: Dashboard detail JSON is shown
- **WHEN** the developer opens a detail panel that contains raw collected state
- **THEN** the panel may preserve stable English keys and technical values
- **AND** the surrounding heading and visible summary remain Chinese

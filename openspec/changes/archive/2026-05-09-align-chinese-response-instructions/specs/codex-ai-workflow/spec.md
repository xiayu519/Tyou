## ADDED Requirements

### Requirement: Codex replies in Chinese
The Codex workflow MUST require project-facing proposals and answers to be written in Chinese, while preserving literal code identifiers, commands, file paths, API names, and logs in their original language.

#### Scenario: Project-facing response is produced
- **WHEN** Codex writes a proposal, clarification, progress update, explanation, summary, or final answer for this project
- **THEN** the human-facing prose is written in Chinese

#### Scenario: Literal technical text is included
- **WHEN** Codex includes code identifiers, commands, file paths, API names, or log output in a response
- **THEN** those literal technical values remain unchanged unless the user explicitly asks for translation or rewriting
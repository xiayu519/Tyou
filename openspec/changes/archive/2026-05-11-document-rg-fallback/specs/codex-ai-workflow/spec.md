## ADDED Requirements

### Requirement: Source search has a fallback
The Codex AI workflow MUST treat `rg` as the preferred source search tool, not as a mandatory environment dependency. When `rg` is unavailable, the workflow MUST continue source or documentation lookup with an available fallback such as VS Code `grep_search` or PowerShell `Select-String`.

#### Scenario: rg is unavailable during workflow investigation
- **WHEN** Codex needs to locate source code, references, or workflow documentation and the `rg` command is unavailable in the current environment
- **THEN** Codex continues the lookup with VS Code `grep_search` or PowerShell `Select-String` instead of blocking the task on `rg`

#### Scenario: Workflow documentation describes source lookup
- **WHEN** workflow documentation instructs Codex to verify behavior by searching source code or documentation
- **THEN** it states that `rg` is preferred and names at least one fallback path for environments where `rg` is unavailable
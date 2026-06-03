## ADDED Requirements

### Requirement: Structured memory entries use frontmatter
The Codex workflow MUST store active memory entries with typed frontmatter so Codex can route memory without reading every full entry.

#### Scenario: Memory entry is recorded
- **WHEN** Codex records a reusable memory entry under `.codex/memory/`
- **THEN** the entry has frontmatter fields `type`, `description`, `status`, `last_verified`, and `source`
- **AND** `type` is one of `problem`, `decision`, `feedback`, or `reference`

#### Scenario: Existing active memory is maintained
- **WHEN** Codex updates an active memory entry
- **THEN** it keeps the frontmatter current instead of preserving legacy untyped formats

### Requirement: Memory writes exclude recoverable or unstable facts
The Codex workflow MUST prevent memory from becoming a duplicate source of truth for code, git history, temporary task state, or unverified guesses.

#### Scenario: Codex considers writing memory
- **WHEN** Codex decides whether to write `.codex/memory/`
- **THEN** it writes only reusable pitfalls, decisions, user feedback, or external references that cannot be reliably recovered from source search, OpenSpec artifacts, git history, or current conversation state

#### Scenario: Candidate memory is recoverable elsewhere
- **WHEN** the candidate memory is a code pattern, file path detail, recent modification, temporary task state, full log, or unverified guess
- **THEN** Codex does not write it to memory

### Requirement: Memory is verified before use when stale-prone
The Codex workflow MUST treat memory as historical supporting context rather than current truth.

#### Scenario: Memory mentions stale-prone facts
- **WHEN** a memory entry mentions tool behavior, workflow state, external references, file paths, functions, flags, or dates
- **THEN** Codex verifies the current source, rule, OpenSpec, or external reference before acting on that memory

#### Scenario: Memory conflicts with authoritative sources
- **WHEN** memory conflicts with source code, current tool output, OpenSpec specs, or `.codex/rules/`
- **THEN** Codex follows the authoritative source and updates or marks the memory entry stale or superseded when appropriate

### Requirement: Memory index stays compact
The Codex workflow MUST keep `.codex/memory/INDEX.md` short enough to remain a routing index rather than a memory body.

#### Scenario: Memory index is updated
- **WHEN** Codex updates `.codex/memory/INDEX.md`
- **THEN** each memory entry is represented by one concise line
- **AND** long explanations stay in the typed memory entry

#### Scenario: Memory index approaches size limits
- **WHEN** `.codex/memory/INDEX.md` approaches 80 lines or 12 KB
- **THEN** Codex consolidates, shortens, or splits entries instead of appending long summaries

### Requirement: L2 OpenSpec changes stay lightweight
The Codex workflow MUST keep L2 OpenSpec changes lightweight so small tasks do not inherit L3/L4 evidence overhead.

#### Scenario: L2 change is proposed
- **WHEN** Codex creates an L2 OpenSpec change
- **THEN** proposal, tasks, and any spec delta stay minimal and directly tied to the single-module change
- **AND** `run-report.md` is not required unless the developer asks for it or the task reveals reusable workflow risk

### Requirement: Run reports begin with an executive summary
The Codex workflow MUST make L3/L4 run reports efficient to reread.

#### Scenario: Run report is created
- **WHEN** Codex creates `openspec/changes/<change-name>/run-report.md`
- **THEN** it includes `## Executive Summary` before detailed scope, progress, validation, and risk sections
- **AND** the summary states the goal, current state, validation outcome, and remaining risk in short bullets

## MODIFIED Requirements

### Requirement: Structured memory is indexed
The Codex workflow MUST treat `.codex/memory/` as the normal local memory system for L2 and higher Tyou tasks, keeping reusable memory discoverable through `.codex/memory/INDEX.md` and typed memory folders rather than relying on a single chronological log.

#### Scenario: L2 or higher task starts
- **WHEN** Codex begins an L2, L3, or L4 task
- **THEN** it reads `.codex/memory/INDEX.md`
- **AND** it opens only the relevant `problems/`, `decisions/`, `feedback/`, or `references/` entries needed for the task

#### Scenario: New reusable memory is recorded
- **WHEN** Codex observes a reusable pitfall, confirms a durable decision, receives reusable user feedback, or locates reusable reference material
- **THEN** it writes a typed memory entry under `.codex/memory/`
- **AND** it updates `.codex/memory/INDEX.md`

### Requirement: Memory writes exclude recoverable or unstable facts
The Codex workflow MUST prevent memory from becoming a duplicate source of truth for code, git history, temporary task state, or unverified guesses.

#### Scenario: Reusable memory criteria are met
- **WHEN** Codex has a reusable pitfall, decision, user feedback, or reference material that cannot be reliably recovered from source search, OpenSpec specs, git history, or current conversation state
- **THEN** Codex records it in the appropriate `.codex/memory/` category as part of the normal workflow

#### Scenario: Candidate memory is recoverable elsewhere
- **WHEN** the candidate memory is a code pattern, file path detail, recent modification, temporary task state, full log, or unverified guess
- **THEN** Codex does not write it to memory

### Requirement: Codex observability feeds local correction loops
The Codex workflow MUST feed repeated observability findings into local Tyou correction loops instead of retaining them only in transient reports.

#### Scenario: Reusable issue is found
- **WHEN** a run report, sensor, or review exposes a recurring pitfall, confirmed workflow decision, user feedback, or useful reference material
- **THEN** Codex records it in the appropriate `.codex/memory/` category and updates `.codex/memory/INDEX.md`

#### Scenario: Documentation drift is found
- **WHEN** observability evidence shows workflow documentation, skills, rules, README, Books, or OpenSpec specs are inconsistent
- **THEN** Codex uses the existing OpenSpec and wiki-sync guarded workflow to update the stale documents

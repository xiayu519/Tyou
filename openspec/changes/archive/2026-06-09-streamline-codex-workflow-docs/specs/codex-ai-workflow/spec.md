## MODIFIED Requirements

### Requirement: Structured memory is indexed
The Codex workflow MUST treat `.codex/memory/` as Tyou's checked-in structured project memory for L2 and higher Tyou tasks, keeping reusable memory discoverable through `.codex/memory/INDEX.md` and typed memory folders rather than relying on a single chronological log or official generated Codex user memories under the Codex home directory.

#### Scenario: L2 or higher task starts
- **WHEN** Codex begins an L2, L3, or L4 Tyou task
- **THEN** it reads `.codex/memory/INDEX.md`
- **AND** it opens only the relevant `problems/`, `decisions/`, `feedback/`, or `references/` entries needed for the task

#### Scenario: New reusable project memory is recorded
- **WHEN** Codex observes a reusable pitfall, confirms a durable decision, receives reusable user feedback, or locates reusable reference material for Tyou
- **THEN** it writes a typed project memory entry under `.codex/memory/`
- **AND** it updates `.codex/memory/INDEX.md`

### Requirement: Workflow documentation uses current Codex wording
The Codex workflow MUST describe the current Codex entrypoints and execution path directly.

#### Scenario: Active workflow docs are updated
- **WHEN** active workflow documentation is edited
- **THEN** it states the current Codex entrypoints and references directly
- **AND** it avoids obsolete history or reverse descriptions of removed paths

### Requirement: Cocos source asset parser remains read-only by default
The Codex workflow MUST keep reusable Cocos asset parser helpers read-only unless a later OpenSpec change explicitly adds guarded write operations.

#### Scenario: Parser helper is used
- **WHEN** Codex runs `cocos_asset_json.py`
- **THEN** the helper inspects, summarizes, indexes, or validates files without writing project assets

#### Scenario: Asset edit is needed after inspection
- **WHEN** parser output indicates a Prefab, Scene, Atlas, meta, or asset-index edit is needed
- **THEN** Codex follows the corresponding Tyou workflow reference and OpenSpec gate before editing source assets

### Requirement: Skill behavior has regression examples
The Codex workflow MUST keep Tyou skill regression examples for AI behavior checks.

#### Scenario: Tyou skill behavior is reviewed
- **WHEN** Codex workflow or Tyou references change
- **THEN** `.agents/skills/tyou-dev/evals/evals.json` provides expected and forbidden response patterns for core workflows

### Requirement: Token efficiency remains explicit
The workflow MUST keep L1 tasks outside OpenSpec and MUST route Tyou project references by topic so OpenSpec does not increase token cost for trivial work.

#### Scenario: L1 task is requested
- **WHEN** the task is a typo, comment, log, or single-line non-framework rename
- **THEN** Codex may skip OpenSpec and Tyou topic reference loading

### Requirement: Codex observability feeds local correction loops
The Codex workflow MUST feed repeated observability findings into local Tyou correction loops instead of retaining them only in transient reports.

#### Scenario: Reusable issue is found
- **WHEN** a run report, sensor, or review exposes a recurring pitfall, confirmed workflow decision, user feedback, or useful reference material
- **THEN** Codex records it in the appropriate `.codex/memory/` category and updates `.codex/memory/INDEX.md`

#### Scenario: Documentation drift is found
- **WHEN** observability evidence shows workflow documentation, skills, topic references, README, Books, or OpenSpec specs are inconsistent
- **THEN** Codex uses the existing OpenSpec and wiki-sync guarded workflow to update the stale documents

### Requirement: Workflow archive records may be pruned
The Codex workflow MUST allow historical OpenSpec archive records to be removed from a fresh framework delivery after their current authoritative behavior is preserved in active specs, topic references, docs, and templates.

#### Scenario: Fresh framework delivery is prepared
- **WHEN** archived workflow records duplicate outdated or historical guidance
- **THEN** Codex may delete those archive records while preserving the `openspec/changes/archive/` directory for future changes

### Requirement: Codex harness uses command evidence
The Codex workflow MUST keep the harness focused on run reports, deterministic sensor checks, memory/reference synchronization, and OpenSpec archive gates.

#### Scenario: L3 or L4 change is reviewed
- **WHEN** Codex prepares review evidence for an L3 or L4 OpenSpec change
- **THEN** it uses `run-report.md`, `codex-observability-check.ps1`, OpenSpec status/validation, and relevant memory or reference updates

#### Scenario: Developer asks about workflow state
- **WHEN** the developer asks for current Codex workflow state
- **THEN** Codex summarizes the underlying files and command outputs directly

### Requirement: Reference material is verified before synchronization
The Codex workflow MUST treat non-source reference material as input that requires local verification before it changes Tyou documentation, topic references, OpenSpec specs, or memory.

#### Scenario: Codex uses non-source reference material
- **WHEN** Codex reads material that is not current Tyou source code, current tool output, current workspace diff, or existing OpenSpec specs for a documentation or workflow update
- **THEN** Codex verifies the relevant claims against current source code, current workspace diff, local tools, or existing OpenSpec specs before writing project documentation

#### Scenario: Reference claim cannot be verified locally
- **WHEN** a reference claim cannot be verified from Tyou source code, tools, current workspace changes, or existing project documentation
- **THEN** Codex does not write that claim as an authoritative project fact

## REMOVED Requirements

### Requirement: Tyou structured memory is project-owned
**Reason**: Its project-owned memory distinction is now folded into `Structured memory is indexed`, so keeping both requirements duplicates the same workflow behavior.
**Migration**: Continue using `.codex/memory/INDEX.md` and typed project memory folders exactly as before.

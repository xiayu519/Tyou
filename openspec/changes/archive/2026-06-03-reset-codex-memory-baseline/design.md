# Design

## Approach

Delete only the active memory entry files:

- `.codex/memory/decisions/codex-observability-harness.md`
- `.codex/memory/feedback/archive-without-redundant-confirmation.md`
- `.codex/memory/references/sdd-harness-articles.md`

Keep empty typed folders via `.gitkeep` and keep `.codex/memory/INDEX.md` as the new baseline entrypoint.

## Rationale

The useful workflow rules from those memory entries are already encoded in authoritative sources: `AGENTS.md`, `.codex/rules/`, `Books/AI-Development-Workflow.md`, `openspec/specs/`, and templates. Keeping duplicate memory would conflict with the new rule that memory should not duplicate existing authoritative rules.

## Validation

- Verify no active memory entries remain except `.gitkeep` and `INDEX.md`.
- Verify OpenSpec has no active changes after archive.
- Verify `openspec validate --all` passes.
- Verify sensor checks pass for this change.

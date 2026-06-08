## 1. Preserve Clean Repository Memory

- [x] 1.1 Keep `.codex/memory/` empty baseline, memory templates, and memory rules.
- [x] 1.2 Confirm mandatory memory reads/writes remain routed through `AGENTS.md`, `tyou-dev`, `wiki-sync`, `wiki-query`, `luban-dev`, Books, and Codex rules.
- [x] 1.3 Update OpenSpec specs so long-term workflow behavior preserves repository memory but rejects process-only entries.

## 2. Remove Historical Archives

- [x] 2.1 Delete existing `openspec/changes/archive/*` historical change directories while keeping the archive directory.
- [x] 2.2 Keep OpenSpec future archive behavior documented and functional.

## 3. Validation

- [x] 3.1 Run OpenSpec status/validate checks.
- [x] 3.2 Run wiki-sync scan/diff.
- [x] 3.3 Run Codex observability sensor for this change.
- [x] 3.4 Run keyword scans for stale process-memory/archive-history references and `git diff --check`.
- [x] 3.5 Confirm whether historical archive payload should stay removed or be restored before finishing.

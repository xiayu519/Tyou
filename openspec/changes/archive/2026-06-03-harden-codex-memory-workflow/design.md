# Design

## Memory Schema

Each memory entry uses YAML frontmatter:

- `type`: `problem|decision|feedback|reference`
- `description`: one short routing sentence
- `status`: `active|stale|superseded`
- `last_verified`: `YYYY-MM-DD`
- `source`: `user-confirmed|codex-observed|external-reference`

No legacy compatibility layer is required because this is a new framework project.

## Memory Use

Memory is supporting context, not authority. Use priority:

1. Source code and current tool output
2. OpenSpec specs and current change artifacts
3. `.codex/rules/` and `AGENTS.md`
4. `.codex/memory/`
5. Historical summaries and archived changes

If a memory entry mentions tool behavior, workflow state, external references, file paths, functions, flags, or dates, Codex verifies current state before acting on it.

## Memory Writes

Write only reusable items that cannot be reliably recovered from source search, OpenSpec artifacts, git history, or current conversation state. Do not write code facts, recent modifications, temporary task state, unverified guesses, or full logs.

## Index Discipline

`.codex/memory/INDEX.md` stays compact:

- one line per memory entry
- one short summary per line
- no long explanations
- target at most 80 lines and 12 KB

## Run Report

Add `## Executive Summary` near the top of `run-report.md` so later Codex runs can read a compact summary before scanning detailed sections.

## L2 Limit

L2 changes should keep proposal/tasks/spec deltas minimal and avoid `run-report.md` unless requested or risk warrants it.

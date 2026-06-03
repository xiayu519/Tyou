# Design

## Current Model

The active workflow uses Codex entrypoints:

- `AGENTS.md` is the root entrypoint.
- `.agents/skills/*` contains Codex skills.
- `.codex/rules/tyou-dev/*.md` contains topic rules.
- `.codex/memory/INDEX.md` plus typed folders contain structured memory.
- `openspec/` supervises L2+ changes.

## Cleanup

The cleanup keeps only current executable rules and removes obsolete workflow archive records. Active docs should say what Codex does now, not describe removed paths.

## Verification

- OpenSpec active list is empty after archive.
- `openspec validate --all` passes.
- Active memory contains no entries beyond the clean baseline.
- Active workflow files use current workflow wording.
- Current scripts and templates are present and executable where relevant.

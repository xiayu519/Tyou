## Executive Summary

- Goal: reduce Codex workflow token overhead while preserving the existing Tyou CLI entrypoint behavior and OpenSpec gates.
- State: duplicated memory wording was merged, legacy Tyou `rules` wording was replaced with `references`, and four OpenSpec phase skills now use short `SKILL.md` entrypoints plus skill-owned `references/workflow.md` detail.
- Validation: OpenSpec strict validation and wiki-sync scan/diff passed; static checks confirm phase skill descriptions are preserved and entrypoints are under 2.5 KB.
- Remaining risk: no known behavior-changing risk; the detailed phase procedures now require loading each skill's `references/workflow.md` when that phase is actually executed.

## Change

- Updated `openspec/specs/codex-ai-workflow/spec.md` to merge the duplicate project memory requirement into `Structured memory is indexed`.
- Updated active workflow docs/specs to use Tyou topic `references` terminology while preserving official `.codex/rules/*.rules` command policy terminology.
- Added `references/workflow.md` for `openspec-explore`, `openspec-propose`, `openspec-apply-change`, and `openspec-archive-change`.
- Shortened the four OpenSpec phase `SKILL.md` files to stable entrypoint guardrails with unchanged `name` and `description` frontmatter.

## Decisions

- Keep the root `AGENTS.md` OpenSpec gate, L1/L2/L3/L4 classification, memory workflow, wiki-sync workflow, and archive behavior unchanged.
- Keep `.codex/rules/` reserved for official Codex command approval policy, not Tyou Markdown topic references.
- Keep OpenSpec CLI field names such as `rules` in propose workflow references because they are tool output keys, not Tyou topic wording.
- Do not write new memory for this change because the reusable workflow facts are already represented in active specs, references, and this archived change.

## Validation

- `cmd /c openspec.cmd --version`: `1.3.1`.
- `cmd /c openspec.cmd validate streamline-codex-workflow-docs --strict`: passed.
- `cmd /c openspec.cmd validate --all --strict`: 8 passed, 0 failed.
- `powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 scan`: sources and wiki docs covered.
- `powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 diff`: no mapping gaps detected.
- Static legacy wording search over active workflow files found no stale `.codex/rules/tyou-dev`, Tyou topic rules, Codex rule loading, or memory/rule synchronization wording.
- Static frontmatter check passed for `openspec-explore`, `openspec-propose`, `openspec-apply-change`, and `openspec-archive-change`: `description` preserved exactly.
- Static size check passed: the four phase `SKILL.md` entrypoints are 1.4-1.9 KB and 18-19 lines each.

## Sensors

- `powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/codex-observability-check.ps1 -Change streamline-codex-workflow-docs`: pass=8, warn=1, fail=0.
- Warning was expected at that moment: `tasks-progress` reported 6/10 tasks complete because validation/report/archive tasks were still being closed.
- Follow-up sensor after validation/report closure reported pass=8, warn=1, fail=0 with only the archive task remaining.

## Risks

- Phase behavior now depends on the standard skill progressive-disclosure step of reading `references/workflow.md` after the selected phase skill loads.
- No business code, Cocos assets, Luban data, OpenSpec schema, or CLI command entrypoints were changed.

## Correction Loop

- No new `.codex/memory/` entry is needed; the durable behavior is represented in OpenSpec specs and skill references.
- wiki-sync scan/diff showed no documentation mapping gaps after the changes.

## Executive Summary

- Goal: reduce Codex workflow token overhead while preserving precise Tyou skill routing and normal guardrails.
- State: `tyou-dev` entrypoint is shortened, `wiki-sync.yaml` ignores generated Python caches, `openspec/AGENTS.md` guardrail wording is clarified, and `codex-ai-workflow` spec is synced.
- Validation: OpenSpec strict validation, wiki-sync scan/diff, static routing/cache checks, and observability sensor were run.
- Remaining risk: trigger precision still depends on Codex reading the frontmatter description; specialized skill behavior is unchanged.

## Validation

- `openspec validate optimize-codex-skill-routing --strict`: passed.
- `openspec validate --all --strict`: 8 passed, 0 failed.
- `wiki-sync.ps1 scan`: completed with configured mappings covered.
- `wiki-sync.ps1 diff`: no mapping gaps detected.
- Static search confirmed concise-entrypoint spec wording, cache ignores, and clarified OpenSpec guardrail wording.
- `tyou-dev/SKILL.md` now measures 34 lines and 2543 characters.

## Change

- Replaced `.agents/skills/tyou-dev/SKILL.md` with a shorter router-focused entrypoint.
- Added `**/*.pyc` and `**/__pycache__/**` to `wiki-sync.yaml` source ignores.
- Updated `openspec/AGENTS.md` to make two guardrails explicitly prohibitive.
- Added durable workflow requirements to `openspec/specs/codex-ai-workflow/spec.md`.

## Decisions

- Keep detailed execution steps in `.codex/rules/tyou-dev/` and specialized skills instead of duplicating them in `tyou-dev/SKILL.md`.
- Keep concrete Tyou/Cocos terms in the skill frontmatter and explicitly exclude weak generic TypeScript/text/command associations.
- Do not update `Books/AI-Development-Workflow.md`: it already describes `tyou-dev` as routing/core principles rather than detailed rule storage.

## Sensors

- `codex-observability-check.ps1 -Change optimize-codex-skill-routing`: passed core artifact, status, and protected-path checks; only pre-archive task progress remained before final archive.

## Risks

- Overly broad user requests may still require Codex judgment before loading a skill.
- Cache ignores do not change durable source mappings; they only prevent generated cache files from becoming future scan noise.

## Correction Loop

- Main OpenSpec spec was synchronized because this change affects long-term Codex workflow behavior.
- No new memory entry was added: the user request is directly represented by the active OpenSpec change and workflow spec update.

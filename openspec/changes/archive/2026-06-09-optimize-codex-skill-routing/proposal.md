## Why

Codex workflow entrypoints currently preserve normal guardrails, but `tyou-dev` carries more routing and execution detail than needed for precise skill activation. Tightening the entrypoint and excluding generated caches from Wiki scanning reduces token cost without changing Tyou development behavior.

## What Changes

- Shorten `.agents/skills/tyou-dev/SKILL.md` so it remains a precise router and points detailed workflow steps to `.codex/rules/tyou-dev/`.
- Keep shader, Luban, Prefab, Scene, resource, UI, battle, and workflow triggers precise so unrelated tasks do not load extra skills.
- Add cache ignores to `wiki-sync.yaml` so generated Python cache files are not treated as documentation sync sources.
- Clarify `openspec/AGENTS.md` guardrail wording without changing the OpenSpec workflow.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: clarify token-efficient skill entrypoints and Wiki scan ignore behavior.

## Impact

- Affects Codex workflow documentation and local skill routing only.
- Does not change business code, Cocos assets, Luban data, generated TypeScript, or `Client/assets/ty-framework/`.

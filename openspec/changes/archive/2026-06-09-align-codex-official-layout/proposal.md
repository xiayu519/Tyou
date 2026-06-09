## Why

Official Codex guidance treats `AGENTS.md` as the persistent project instruction layer, `.agents/skills` as the repository skill layer, and `.codex/rules/*.rules` as command-approval policy loaded only from trusted config layers. Tyou currently stores Markdown topic rules under `.codex/rules/tyou-dev/`, which works through custom routing but does not match the official meaning of Codex rules.

## What Changes

- Move Tyou Markdown topic rules from `.codex/rules/tyou-dev/` to `.agents/skills/tyou-dev/references/` so they live with the repo skill that routes to them.
- Update `AGENTS.md`, skill docs, memory references, `wiki-sync.yaml`, Books, and OpenSpec specs to use the official-aligned path.
- Preserve existing behavior: OpenSpec gate, memory index, wiki-sync checks, specialized skills, and topic-by-topic minimal reading remain unchanged.
- Keep `.codex/` available for project-local Codex configuration/memory, but stop describing Markdown topic docs as official Codex `.rules`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: update durable workflow layout requirements to align topic references with repo skills and reserve `.codex/rules` terminology for official Codex command policy.

## Impact

- Affects Codex workflow documentation and reference paths only.
- Does not change runtime code, generated assets, Luban data, Cocos Prefabs/Scenes, or `Client/assets/ty-framework/`.

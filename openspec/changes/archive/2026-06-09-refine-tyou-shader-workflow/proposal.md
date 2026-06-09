## Why

`D:\aipro\first-game` contains a real Cocos Creator shader/material/prefab binding sample that can make the new Tyou shader skill more grounded. The current workflow also has one broad `effect` trigger that may over-activate shader routing for non-shader gameplay effects.

## What Changes

- Add a compact `tyou-shader-dev` reference for the `actor-occlusion-outline` Cocos Effect/Material sample and its Prefab binding chain.
- Update shader workflow guidance so real project/reference samples are preferred before starter templates.
- Narrow `tyou-dev` shader trigger wording to avoid treating generic gameplay `effect` mentions as shader work.
- Keep long shader implementation details in `tyou-shader-dev/references/` rather than duplicating them in entry docs, specs, or memory.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: Tyou shader workflow routing should stay token-efficient, avoid broad generic triggers, and preserve verified local/reference Cocos Effect samples as on-demand skill references.

## Impact

- Affects only Codex workflow artifacts and skill documentation.
- No runtime TypeScript, Cocos source asset, generated cache, Luban table, or framework code changes.

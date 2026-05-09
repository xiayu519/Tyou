## Why

The project needs OpenSpec to be a real execution gate for Codex implementation tasks, not only a written recommendation. This reduces ambiguous AI changes, keeps workflow edits reviewable, and preserves the token-saving reference routing already built for Tyou.

## What Changes

- Initialize OpenSpec in the Tyou repository for Codex.
- Add project context and artifact rules to `openspec/config.yaml`.
- Keep the existing `tyou-dev` skill as the Tyou/Cocos knowledge layer.
- Add OpenSpec-generated Codex skills for propose/apply/archive/explore.
- Update AI workflow docs so L2+ implementation tasks must run under OpenSpec supervision.
- Non-goal: importing Unity/TEngine runtime concepts into Tyou.
- Non-goal: modifying `Client/assets/ty-framework/` as part of this workflow integration.

## Capabilities

### New Capabilities

- `codex-ai-workflow`: Codex sessions in Tyou are governed by AGENTS, tyou-dev references, and OpenSpec change supervision.

### Modified Capabilities

- None.

## Impact

- Adds `openspec/config.yaml` and an initial OpenSpec change.
- Adds OpenSpec Codex skills under `.codex/skills/openspec-*`.
- Updates existing AI workflow documentation only.
- Requires `openspec` CLI. On Windows PowerShell, use `cmd /c openspec.cmd ...` when `.ps1` execution is blocked.

## Why

The live harness dashboard currently exposes too much English UI text, making the workflow state hard for the developer to read quickly. The dashboard should present human-facing labels and explanations in Chinese while preserving file paths, commands, and technical identifiers.

## What Changes

- Localize visible live dashboard labels, navigation, table headings, status text, and detail prompts to Chinese.
- Keep technical paths, command names, status source values, and API names unchanged where useful.
- Preserve live refresh and click-through behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: clarify that project-facing dashboard UI should be readable in Chinese while preserving literal technical identifiers.

## Impact

- Updates `.agents/skills/tyou-dev/scripts/codex_harness_live_dashboard.py`.
- Does not modify Cocos runtime code, `Client/assets/ty-framework/`, Prefab/Scene/meta files, Luban data, generated config, or external services.

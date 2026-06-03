## Why

The live dashboard launcher can leave an old server running on port `8787`, causing the browser to show stale UI after scripts are updated. The launcher should stop an existing dashboard backend before starting a fresh one.

## What Changes

- Update `open-harness-dashboard.bat` to stop the previous pid-file process.
- Also stop any process currently listening on local port `8787`.
- Start a fresh live dashboard server after cleanup.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: launcher behavior for live dashboard restart reliability.

## Impact

- Updates `open-harness-dashboard.bat`.
- Does not modify Cocos runtime code, `Client/assets/ty-framework/`, Prefab/Scene/meta files, Luban data, generated config, or external services.

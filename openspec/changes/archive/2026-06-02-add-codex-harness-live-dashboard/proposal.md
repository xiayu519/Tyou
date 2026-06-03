## Why

The static harness dashboard is only useful as a snapshot. Developers need a local page that can stay open, refresh itself while new Codex sessions and OpenSpec changes happen, and expose details without re-running commands manually.

## What Changes

- Add a local live dashboard server at `http://127.0.0.1:8787/`.
- Serve a web page that polls `/api/state` every few seconds and updates without reopening the browser.
- Add clickable lifecycle cards, change rows, and signal rows that show details in a side panel.
- Update the `.bat` launcher to start the live server and open the URL.
- Keep the static dashboard generator as a fallback artifact generator.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: add live local dashboard requirements for auto-refresh, click-through details, launcher behavior, and token boundaries.

## Impact

- Adds a local PowerShell `HttpListener` server script under `.agents/skills/tyou-dev/scripts/`.
- Updates `open-harness-dashboard.bat`.
- Updates workflow docs/specs/rules/skill/memory.
- Does not modify Cocos runtime code, `Client/assets/ty-framework/`, Prefab/Scene/meta files, Luban data, generated config, or external services.

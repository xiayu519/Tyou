# Codex Run Report

## Change

- Change: `fix-harness-dashboard-launcher-restart`
- Task level: `L2`
- Date: `2026-06-02`
- Operator: `Codex`

## Scope

- Goal: Make `open-harness-dashboard.bat` stop stale dashboard backends before starting a new live server.
- Non-goals: Do not add a persistent background service or touch Cocos runtime code.
- Touched files/directories:
  - `open-harness-dashboard.bat`
  - `.agents/skills/tyou-dev/scripts/stop-harness-dashboard.ps1`
  - `Books/AI-Development-Workflow.md`
  - `.codex/rules/tyou-dev/openspec-workflow.md`
  - `.codex/memory/decisions/codex-observability-harness.md`
  - `openspec/specs/codex-ai-workflow/spec.md`
  - `openspec/changes/fix-harness-dashboard-launcher-restart/`
- Protected surfaces checked:
  - `Client/assets/ty-framework/`: `unchanged`
  - Prefab/Scene/meta: `unchanged`
  - Luban/generated config: `unchanged`

## Task Progress

- Completed tasks:
  - `[x] 1.1 Create OpenSpec artifacts and run report.`
  - `[x] 1.2 Update open-harness-dashboard.bat to stop stale pid and port listeners before restart.`
  - `[x] 2.1 Validate launcher contents, OpenSpec status, sensor check, and full OpenSpec validation.`
  - `[x] 2.2 Archive automatically when all gates pass.`
- Deferred tasks:
  - None.

## Decisions

- Stop the pid-file process first, then stop any listener on port `8787`, then start a fresh dashboard service.

## Validation

| Command | Result | Notes |
| --- | --- | --- |
| `cmd /c openspec.cmd --version` | `pass` | OpenSpec `1.3.1`. |
| `python -m py_compile .agents\skills\tyou-dev\scripts\codex_harness_live_dashboard.py` | `pass` | Python live server still compiles. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File .agents\skills\tyou-dev\scripts\stop-harness-dashboard.ps1 -Port 8794` | `pass` | Stop script handles an unused port without error. |
| `cmd /c openspec.cmd validate fix-harness-dashboard-launcher-restart --strict` | `pass` | Delta spec is valid. |
| `python .agents\skills\tyou-dev\scripts\codex_harness_live_dashboard.py --port 8793 --no-open` + `/api/ping`, `/api/state` | `pass` | Temporary server responded and returned live state JSON. |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | `pass` | `pass=8 warn=1 fail=0`; warning only reflected the remaining unchecked archive task before final task update. |

## Risks

- Remaining risks:
  - `open-harness-dashboard.bat` intentionally stops any process listening on local port `8787`; developers should not use that same port for unrelated tools while launching the dashboard.

## Correction Loop

- Memory updated: `yes`
- Wiki/docs sync needed: `yes, workflow docs/rules updated`
- OpenSpec archive ready: `yes`

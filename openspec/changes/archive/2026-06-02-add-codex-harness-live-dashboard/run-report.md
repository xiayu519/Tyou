# Codex Run Report

## Change

- Change: `add-codex-harness-live-dashboard`
- Task level: `L4`
- Date: `2026-06-02`
- Operator: `Codex`

## Scope

- Goal: Upgrade the Tyou Codex Harness dashboard from a static snapshot to a local live auto-refreshing panel.
- Non-goals: Do not modify Cocos runtime code, `Client/assets/ty-framework/`, Prefab/Scene/meta, Luban data, generated config, or external services.
- Touched files/directories:
  - `openspec/changes/add-codex-harness-live-dashboard/`
  - `.agents/skills/tyou-dev/scripts/`
  - `.agents/skills/tyou-dev/scripts/codex_harness_live_dashboard.py`
  - `open-harness-dashboard.bat`
  - `AGENTS.md`
  - `README.md`
  - `Books/AI-Development-Workflow.md`
  - `.agents/skills/tyou-dev/SKILL.md`
  - `.agents/skills/tyou-dev/evals/evals.json`
  - `.codex/rules/tyou-dev/openspec-workflow.md`
  - `.codex/memory/decisions/codex-observability-harness.md`
  - `openspec/specs/codex-ai-workflow/spec.md`
- Protected surfaces checked:
  - `Client/assets/ty-framework/`: `unchanged`
  - Prefab/Scene/meta: `unchanged`
  - Luban/generated config: `unchanged`

## Task Progress

- Completed tasks:
  - `[x] 1.1 Create proposal, design, delta spec, tasks, and run report.`
  - `[x] 2.1 Add a local-only PowerShell live dashboard server with /, /api/state, and /api/ping.`
  - `[x] 2.2 Reuse the existing metadata collector logic without scanning business code or Cocos assets.`
  - `[x] 3.1 Add polling refresh to keep the page current while open.`
  - `[x] 3.2 Add click-through details for lifecycle cards, changes, signals, and git status.`
  - `[x] 4.1 Update open-harness-dashboard.bat to start the live server and open the URL.`
  - `[x] 4.2 Update workflow docs/rules/specs/skill/memory/evals for live dashboard behavior and token boundary.`
  - `[x] 5.1 Validate live server syntax, static generator fallback, sensor checks, OpenSpec status, and JSON parsing.`
- Deferred tasks:
  - Archive remains in progress.

## Decisions

- Use a local PowerShell `HttpListener` server on `127.0.0.1`.
- Use Python standard library server for the official `.bat` launcher because `HttpListener` is unsupported in this execution environment.
- Keep polling and rendering in the browser so normal Codex token usage does not increase.

## Validation

| Command | Result | Notes |
| --- | --- | --- |
| `cmd /c openspec.cmd --version` | `pass` | OpenSpec `1.3.1`. |
| `cmd /c openspec.cmd list --json` | `pass` | No active changes before this change. |
| `python .agents/skills/tyou-dev/scripts/codex_harness_live_dashboard.py --port 8791 --no-open` | `pass` | `/api/ping` returned ok and `/api/state` returned active/archived summary. |
| `powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/codex-harness-web-dashboard.ps1 -JsonOnly` | `pass` | JSON summary parsed successfully. |
| `Get-Content .agents/skills/tyou-dev/evals/evals.json -Encoding UTF8 \| ConvertFrom-Json` | `pass` | Eval JSON parsed successfully. |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | `pass` | Final run expected after all tasks are checked. |

## Risks

- Remaining risks:
  - `none`
- Follow-up:
  - Use the `.bat` launcher to open the live dashboard.

## Correction Loop

- Memory updated: `no`
- Wiki/docs sync needed: `yes`
- OpenSpec archive ready: `no`

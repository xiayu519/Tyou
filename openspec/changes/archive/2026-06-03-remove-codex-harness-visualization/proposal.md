# Proposal

## Why

The developer confirmed that visualization did not provide enough value for the current Codex workflow. The useful part is the harness discipline itself: run reports, deterministic sensors, memory/rule synchronization, and automatic archive when gates are green.

## What

- Remove dashboard and web/live visualization entrypoints from the active workflow.
- Keep `run-report.md`, `codex-observability-check.ps1`, memory synchronization, OpenSpec gates, and automatic archive behavior.
- Update workflow docs, rules, skill routing, evals, memory, and specs so future Codex runs do not suggest or maintain visualization as part of the core harness.

## Non-Goals

- Do not change Cocos runtime code, resources, Prefab/Scene/meta, Luban data, or generated config.
- Do not remove archived OpenSpec history.
- Do not remove the sensor or run-report workflow.

## Impact

- Developers no longer open a local dashboard for Codex workflow state.
- Codex review evidence remains file/command based through `run-report.md` and `codex-observability-check.ps1`.

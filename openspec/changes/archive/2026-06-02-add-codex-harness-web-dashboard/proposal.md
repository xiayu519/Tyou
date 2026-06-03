## Why

Tyou now has run evidence, deterministic sensors, and Markdown dashboards, but developers still need a fast visual surface to understand AI workflow health without reading multiple files. A local web dashboard can make the harness state visible while keeping Codex's core workflow and token usage unchanged.

## What Changes

- Add a local read-only Codex Harness web dashboard generator.
- Show a Tyou-local lifecycle view modeled around OpenSpec, rules, evidence, sensors, memory, and archive state.
- Generate a static HTML artifact from repository files and local script output.
- Document that the web dashboard is a human review surface, not a new source of truth and not a required input for normal Codex tasks.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: add local web dashboard requirements for harness lifecycle visualization, token-scope preservation, and honest connected/partial/missing status display.

## Impact

- Adds local scripts under `.agents/skills/tyou-dev/scripts/`.
- Generates static dashboard output under `.codex/harness-dashboard/`.
- Updates Codex workflow docs/specs to mention the web dashboard entrypoint.
- Does not modify Cocos runtime code, `Client/assets/ty-framework/`, Prefab/Scene/meta files, Luban data, generated config, or external services.

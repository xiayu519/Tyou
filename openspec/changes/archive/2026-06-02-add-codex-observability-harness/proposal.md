## Why

Tyou's Codex workflow already has OpenSpec supervision, topic rules, memory, and wiki-sync, but long-running agent work is still hard to audit from process evidence alone. The workflow needs a local observability harness so developers can see what Codex changed, which checks ran, what risks remain, and how repeated issues feed back into rules and memory.

## What Changes

- Add Codex observability requirements to the existing `codex-ai-workflow` capability.
- Define a lightweight per-change run report for short-term traceability.
- Add a local sensor checklist and script entrypoints for deterministic workflow checks.
- Add a generated dashboard/report path for long-term review without introducing an external service.
- Document how external Harness/SDD ideas are localized to Tyou/Codex instead of copied from Unity/Claude workflows.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: add local observability harness requirements for trace reports, deterministic sensors, dashboard generation, and feedback into memory/wiki-sync/OpenSpec.

## Impact

- Affects Codex workflow documentation and specs: `AGENTS.md`, `.agents/skills/*`, `.codex/rules/tyou-dev/*.md`, `Books/AI-Development-Workflow.md`, `README.md`, and `openspec/specs/`.
- Adds local workflow helper scripts under `.agents/skills/`.
- Adds structured memory entries for the accepted external references and local design decision.
- Does not modify Cocos runtime code, Prefab/Scene/meta files, Luban data, generated config, or `Client/assets/ty-framework/`.

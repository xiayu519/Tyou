## Why

The repository now has a local GPT/Codex AI workflow, but the root README does not explain it. Developers should be able to understand the workflow from the project README without assuming the Unity/Claude reference project applies directly.

## What Changes

- Add a localized README section that introduces the current GPT/Codex workflow truthfully.
- State clearly that this workflow targets GPT/Codex and differs from Claude Code workflows.
- Reference the local files that actually exist: `AGENTS.md`, `.agents/skills/`, `.codex/memory/`, `openspec/`, and `Books/AI-Development-Workflow.md`.
- Clarify the real OpenSpec and token behavior without overclaiming hard enforcement or guaranteed token savings.
- Remove the stale README feature-list mention of the deleted runtime debug panel.

## Capabilities

### New Capabilities

- `project-readme-ai-workflow`: README-level description of the project-local GPT/Codex AI workflow.

### Modified Capabilities

- None.

## Impact

- Affected docs: `README.md`.
- No runtime code, resources, Prefab, generated UI files, or framework modules are changed.
- The documentation follows the reference project's structure at a high level only; it does not persist Unity/TEngine/Claude-specific runtime concepts.

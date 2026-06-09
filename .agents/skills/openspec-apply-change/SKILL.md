---
name: openspec-apply-change
description: 实施一个已存在的 OpenSpec change，逐项完成 tasks.md 并勾选。当用户要开始实现、继续实现、跑任务、做 propose 后的下一步时使用。会先读 proposal/design/specs/tasks 再动手，每完成一个任务立刻把 [ ] 改为 [x]。触发词：apply、实现、开始实施、继续做、跑 tasks、完成任务、做下一步、写代码（在已有 change 上）。
license: MIT
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

# OpenSpec Apply

Implement an existing OpenSpec change by reading its artifacts, completing `tasks.md` one item at a time, and marking each finished task immediately.

Follow `.agents/skills/tyou-dev/references/openspec-workflow.md` and read `references/workflow.md` before performing this phase.

## Hard Guardrails

- Select a clear change name from input, conversation context, or the single active change; prompt if ambiguous.
- Use `openspec status --change "<name>" --json` and prefer `openspec instructions apply --change "<name>" --json` for `contextFiles`, schema, progress, and task state.
- Read all CLI-provided context files before editing.
- Implement one pending task at a time; after each task is genuinely complete, immediately update that change's `tasks.md` from `- [ ]` to `- [x]`.
- Pause for unclear tasks, design conflicts, protected `Client/assets/ty-framework/` edits, ambiguous Prefab/Scene/meta changes, incompatible Luban changes, reference/source conflicts, errors, blockers, or user interruption.
- For docs/workflow changes, check `AGENTS.md`, `**/AGENTS.override.md`, `.agents/skills/*`, `.codex/memory/`, `wiki-sync.yaml`, `README.md`, `Books/AI-Development-Workflow.md`, and `openspec/specs/`; include `.codex/rules/*.rules` only for official command policy changes.

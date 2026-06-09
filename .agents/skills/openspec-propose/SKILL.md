---
name: openspec-propose
description: 创建 OpenSpec 变更提案。当用户要新增功能、修改框架行为、跨文件改动、UI/资源/配表协作、L2 及以上任务且当前没有匹配的 change 时使用。一步生成 proposal/design/specs/tasks 四件套，准备好之后交给 openspec-apply-change 实施。触发词：propose、新提案、新建变更、openspec change、规范驱动、新增功能、立项、做一个 X、想加 X 功能。
license: MIT
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

# OpenSpec Propose

Create or complete an OpenSpec change proposal and generate the artifacts required before implementation.

Follow `.agents/skills/tyou-dev/references/openspec-workflow.md` and read `references/workflow.md` before performing this phase.

## Hard Guardrails

- Require a clear change name or a clear description; derive a kebab-case name only after understanding the request.
- Create the change through `openspec new change "<name>"`.
- Use `openspec status --change "<name>" --json` and `openspec instructions <artifact-id> --change "<name>" --json` to discover artifact order, schema instructions, dependencies, and `applyRequires`.
- Create all artifacts required for implementation, typically `proposal.md`, `design.md`, `specs/`, and `tasks.md`, in dependency order.
- Treat OpenSpec `context` and `rules` fields as constraints for Codex; do not copy those blocks into generated artifacts.
- Verify each artifact exists, then stop when the change is apply-ready and point implementation to `$openspec-apply-change`.

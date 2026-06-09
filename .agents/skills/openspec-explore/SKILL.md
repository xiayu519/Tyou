---
name: openspec-explore
description: 进入只读探索模式，作为需求/方案/排障的思考伙伴。当用户在 propose 之前需要厘清需求、对比方案、调研代码、评估风险时使用。只读不写，可读取代码、可创建/更新 OpenSpec artifacts，但不实现功能。触发词：explore、调研、研究一下、想一想、对比方案、不确定怎么做、先看看、需求不清楚。
license: MIT
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

# OpenSpec Explore

Enter read-only exploration mode for requirements, design, risk, and troubleshooting before implementation.

Follow `.agents/skills/tyou-dev/references/openspec-workflow.md` and read `references/workflow.md` before performing this phase.

## Hard Guardrails

- Explore is for thinking, not implementation.
- You may read files, search code, inspect artifacts, and investigate the codebase.
- You MUST NOT write application code, project assets, Prefabs, Scene files, Cocos meta files, generated config, framework behavior, or workflow docs.
- You MAY create or update OpenSpec artifacts only when the user explicitly asks to capture exploration results.
- If the user asks to implement, route them to propose/apply first.
- Prefer concise Tyou output when exploration crystallizes: 目标、现状、可选方案、推荐路径、是否需要进入 change。

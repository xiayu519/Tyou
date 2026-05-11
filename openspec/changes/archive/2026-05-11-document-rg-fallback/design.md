## Context

Tyou 的 AI 工作流入口要求在文档与源码冲突时用搜索工具定位真实实现。现有文字默认写 `rg`，但当前 Windows 环境中 `rg` 不可用，历史记录已保存在 `.codex/memory/problem_2026-05-09.md`。如果文档继续只写 `rg`，后续 AI 会话容易在环境检查或源码定位时失败。

## Goals / Non-Goals

**Goals:**

- 将 `rg` 调整为首选搜索工具，而不是唯一搜索工具。
- 在入口规则和容错 reference 中明确可用 fallback：VS Code `grep_search` 或 PowerShell `Select-String`。
- 保持当前工作流轻量，不引入新的安装步骤作为必需条件。

**Non-Goals:**

- 不安装 `ripgrep`，不修改系统 PATH。
- 不修改业务代码、Cocos 资源、Prefab、OpenSpec CLI 行为或 `Client/assets/ty-framework/`。
- 不把所有 reference 全量改写为跨 Agent 通用版。

## Decisions

- 在文档中使用“优先 `rg`，不可用时 fallback”的表述，原因是 `rg` 仍是高效首选，但当前仓库工作流不能假设它一定存在。
- 保留 `.codex/memory/problem_2026-05-09.md`，原因是该文件已经记录了环境事实和修正动作，重复新增记录会制造噪声。
- 同步 `AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.agents/skills/tyou-dev/references/workflow-recovery.md` 和 `Books/AI-Development-Workflow.md`，原因是这些位置都直接描述源码搜索步骤，若只修一部分会让后续 AI 读到不一致规则。

## Risks / Trade-offs

- [Risk] 模型仍可能优先尝试不可用的 `rg`。→ Mitigation: 文档明确写出失败后的工具顺序，并保留 memory 记录提醒。
- [Risk] `Select-String` 在大仓库上比 `rg` 慢。→ Mitigation: 将它作为 fallback，而非首选路径。
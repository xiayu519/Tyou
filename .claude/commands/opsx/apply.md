---
name: "OPSX: Apply"
description: "实施 OpenSpec change 的 tasks"
category: Workflow
tags: [workflow, apply, openspec]
---

实施已有 OpenSpec change。共享规则见 `.ai/rules/tyou-dev/openspec-workflow.md`。

不要依赖其他 CLI 的专属适配文件。如果需要 Tyou 规范，使用 Claude Code 的 `tyou-dev` skill 并读取 `.ai/rules/tyou-dev/`。

完整 apply 行为以 Claude Code 的 `openspec-apply-change` skill 为准；本命令只作为 slash command 入口。

步骤：

1. 从参数、上下文或 `openspec list --json` 选择 change。
2. 运行 `openspec status --change "<name>" --json`。
3. 运行 `openspec instructions apply --change "<name>" --json`。
4. 读取 `contextFiles`。
5. 逐项实施 pending tasks，完成一项立刻勾选一项。
6. 全部完成后提示 `/opsx:archive`。

Windows PowerShell 若拦截 `openspec.ps1`，改用 `cmd /c openspec.cmd ...`。

---
name: "OPSX: Archive"
description: "归档已完成的 OpenSpec change"
category: Workflow
tags: [workflow, archive, openspec]
---

归档已完成 OpenSpec change。共享规则见 `.ai/rules/tyou-dev/openspec-workflow.md`。

不要依赖其他 CLI 的专属适配文件。如果需要 Tyou 规范，使用 Claude Code 的 `tyou-dev` skill 并读取 `.ai/rules/tyou-dev/`。

完整 archive 行为以 Claude Code 的 `openspec-archive-change` skill 为准；本命令只作为 slash command 入口。

步骤：

1. 从参数或 `openspec list --json` 选择 change。
2. 检查 artifact 与 tasks 完成状态。
3. 评估 delta specs 是否需要同步到 `openspec/specs/`。
4. 移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`。
5. 输出归档摘要。

Windows PowerShell 若拦截 `openspec.ps1`，改用 `cmd /c openspec.cmd ...`。

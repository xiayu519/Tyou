---
name: "OPSX: Propose"
description: "创建 OpenSpec change 并生成 proposal/design/specs/tasks"
category: Workflow
tags: [workflow, propose, openspec]
---

创建 OpenSpec change。共享规则见 `.ai/rules/tyou-dev/openspec-workflow.md`。

不要依赖其他 CLI 的专属适配文件。如果需要 Tyou 规范，使用 Claude Code 的 `tyou-dev` skill 并读取 `.ai/rules/tyou-dev/`。

完整 propose 行为以 Claude Code 的 `openspec-propose` skill 为准；本命令只作为 slash command 入口。

步骤：

1. 从 `/opsx:propose` 参数或用户描述确定 change 名称。
2. 运行 `openspec new change "<name>"`。
3. 运行 `openspec status --change "<name>" --json`。
4. 按 `openspec instructions <artifact-id> --change "<name>" --json` 生成所需 artifacts。
5. 完成后提示使用 `/opsx:apply`。

Windows PowerShell 若拦截 `openspec.ps1`，改用 `cmd /c openspec.cmd ...`。

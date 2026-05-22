---
name: "OPSX: Explore"
description: "进入 OpenSpec 只读探索模式"
category: Workflow
tags: [workflow, explore, openspec]
---

进入只读探索模式。共享规则见 `.ai/rules/tyou-dev/openspec-workflow.md`。

不要依赖其他 CLI 的专属适配文件。如果需要 Tyou 规范，使用 Claude Code 的 `tyou-dev` skill 并读取 `.ai/rules/tyou-dev/`。

完整 explore 行为以 Claude Code 的 `openspec-explore` skill 为准；本命令只作为 slash command 入口。

输入可以是一个模糊想法、具体问题、change 名称或方案对比。探索期间可以读代码和 OpenSpec artifacts，但不要实现功能；准备修改时必须先进入 change。

# AGENTS.md

请使用中文写提案和回答。
这里的"回答"包括澄清问题、进度更新、说明、总结和最终回复；代码标识、命令、路径、API 名称和日志原文保持原样。

本项目是 Cocos Creator 3.8.7 + TypeScript 的 Tyou 客户端框架。本文件是 Codex CLI 专属入口；Codex 原生 skills 位于 [.agents/skills/](.agents/skills)，相关任务 Codex 会根据描述自动激活对应 skill；如未自动激活，可显式调用：`$tyou-dev`、`$openspec-propose`、`$openspec-apply-change`、`$openspec-archive-change`、`$openspec-explore`。

具体 Tyou/OpenSpec/UI/资源/Prefab/PSD/Luban/战斗等规范正文统一维护在 [.ai/rules/](.ai/rules)。`.agents/` 只作为 Codex 适配壳，不能依赖其他 CLI 的专属适配文件。

目标：目标明确、按需读取、少上下文、少返工。

## 双壳同步准则

当 AI 工作流内容发生修改时，无论当前使用 Codex 还是 Claude Code，都必须在同一个 OpenSpec change 中同步检查两套 CLI 适配壳：

- 共享规则改动：检查 `AGENTS.md`、`.agents/skills/*`、`CLAUDE.md`、`.claude/skills/*`、`.claude/commands/*` 是否需要同步。
- 适配壳改动：修改任一 CLI 的触发词、命令名、skill 路由、OpenSpec 入口或结束自检时，必须检查另一套 CLI 是否需要等价更新。
- CLI 专属能力：如果只适用于某一个 CLI，必须在文档或 OpenSpec artifact 中明确标注"CLI 专属"以及另一套不需要同步的原因。
- 不保留旧 reference 兼容目录；规则正文只维护在 `.ai/rules/`。

## 强制工作流

### 第零步：判断任务等级

| 等级 | 判断标准 | 处理策略 |
| --- | --- | --- |
| L1 简单 | typo、注释、日志、单行无框架语义改名 | 不激活任何 skill，直接处理；不走 OpenSpec |
| L2 调用 | 单一模块局部修改、调用已知 API | 激活 `tyou-dev`，按需读 1 个共享规则；走轻量 OpenSpec change |
| L3 功能 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 激活 `tyou-dev`，读相关 2-4 个共享规则；必走 OpenSpec |
| L4 架构 | 多模块协作、框架规则、AI 工作流、重构决策 | 激活 `tyou-dev` + 必要共享规则；先 `$openspec-explore` 给方案再 propose |

不确定等级时上调一级。

### 第零点五步：OpenSpec 监督

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，必须先确认 OpenSpec 可用并进入 change：

1. 检查 `openspec --version` 和 `openspec/` 目录存在；
2. 未安装/未初始化时停止实现，请开发者确认；
3. 已初始化时，没有匹配 change 就用 `$openspec-propose` 创建，已有 change 就用 `$openspec-apply-change` 推进；
4. 完成后用 `$openspec-archive-change` 归档。

详细四阶段流程见 `$openspec-propose` / `$openspec-apply-change` / `$openspec-archive-change` / `$openspec-explore` 各 skill 自身文档；不要在本文件重复。

### 第一步：以代码为准

skill 与 `.ai/rules/` 共享规则是省 token 的精炼规范，不是最终真相。若与实际代码冲突：

1. 优先用 `rg` 定位源码；若 `rg` 不可用，使用 VS Code `grep_search` 或 PowerShell `Select-String` 后再读取源码确认真实 API；
2. 以源码实现为准；
3. 若是 AI 工作流文档过期，优先修正对应 md；
4. 在回复中说明冲突点和已修正文档；
5. 必要时记录到 [.codex/memory/problem_YYYY-MM-DD.md](.codex/memory)。

## 结束自检

每次完成任务前检查，不需要全部"是"，但必须明确"不需要"与"已完成"的区别：

1. **共享规则是否要同步**：本次发现了代码与 `.ai/rules/**/*.md` 不一致、或实际行为与现有描述不同的场景吗？是则同步修改共享规则。
2. **双壳是否要同步**：本次是否修改了 AI 工作流规则、触发、路由、OpenSpec 入口或结束自检？是则检查 Codex 与 Claude Code 两套适配壳，除非已标注 CLI 专属原因。
3. **memory 是否要记一笔**：本次是不是踩了一个可能复发的坑、或者为某个现象找到了非显而易见的根因？是则追加到 `.codex/memory/problem_YYYY-MM-DD.md`。
4. **OpenSpec 是否要推进**：如果走了 change，对应 `tasks.md` 是否都勾选了？全部完成则提示用户是否 `$openspec-archive-change`。

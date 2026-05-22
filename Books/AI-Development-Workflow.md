# Tyou AI 开发工作流

本文档说明本仓库的 AI 开发工作流。当前架构是：**Codex CLI 与 Claude Code CLI 各自使用专属适配壳，Tyou 具体规则统一维护在 `.ai/rules/`**。

目标：任务目标明确、按需读取、少上下文、少返工、少重复维护。

## 分层

```text
共享规范层
  .ai/rules/tyou-dev/*.md
  openspec/

Codex 适配壳
  AGENTS.md
  .agents/skills/*
  .codex/memory/*

Claude Code 适配壳
  CLAUDE.md
  .claude/skills/*
  .claude/commands/opsx/*
  .claude/settings.local.json
  .claude/agent-memory/*
```

`AGENTS.md` 与 `.agents/skills/` 是 Codex 专属入口，不要求读取 `.claude/`。

`CLAUDE.md` 与 `.claude/` 是 Claude Code 专属入口，不要求读取 `.agents/`。

两套壳只共享 `.ai/rules/` 与 `openspec/`。

## 入口

Codex CLI：

- `AGENTS.md`：项目级入口，负责中文输出、任务分级、OpenSpec 监督和核心红线。
- `.agents/skills/tyou-dev/SKILL.md`：Codex 原生 Tyou skill，按主题路由到 `.ai/rules/tyou-dev/*.md`。
- `.agents/skills/openspec-*`：Codex OpenSpec 四阶段 skill。

Claude Code CLI：

- `CLAUDE.md`：项目级入口，负责中文输出、任务分级、OpenSpec 监督和核心红线。
- `.claude/skills/tyou-dev/SKILL.md`：Claude Code Tyou skill，按主题路由到 `.ai/rules/tyou-dev/*.md`。
- `.claude/commands/opsx/*`：Claude Code slash commands。
- `.claude/settings.local.json`：Claude Code 权限配置。

共享规则：

- `.ai/rules/tyou-dev/architecture.md`
- `.ai/rules/tyou-dev/modules.md`
- `.ai/rules/tyou-dev/ui-lifecycle.md`
- `.ai/rules/tyou-dev/ui-patterns.md`
- `.ai/rules/tyou-dev/resource-api.md`
- `.ai/rules/tyou-dev/event-system.md`
- `.ai/rules/tyou-dev/luban-config.md`
- `.ai/rules/tyou-dev/psd2ui-workflow.md`
- `.ai/rules/tyou-dev/prefab-workflow.md`
- `.ai/rules/tyou-dev/prefab-mcp.md`
- `.ai/rules/tyou-dev/battle-design.md`
- `.ai/rules/tyou-dev/openspec-workflow.md`
- `.ai/rules/tyou-dev/workflow-recovery.md`

## Token 策略

1. L1 不读共享规则，不走 OpenSpec。
2. L2 只读一个主题。
3. L3 读取 2-4 个相关主题。
4. L4 先读必要主题并给方案，不全量加载。
5. 同一会话已读主题只复用摘要，不重复读取。
6. 壳文件只写触发方式和路由，具体规则不在 Codex/Claude 两边重复维护。
7. 共享规则与代码冲突时读源码验证，避免靠长文档猜。

这套策略不能承诺任何模型环境下绝对更省 token，但目标是让工作流增加判断质量，而不是上下文噪声。

## 工作流

```text
用户需求
  -> 当前 CLI 读取自己的入口壳
  -> 判断 L1/L2/L3/L4
  -> L2+ 检查/进入 OpenSpec
  -> 触发当前 CLI 的 tyou-dev / openspec 入口
  -> 读取最少 .ai/rules/tyou-dev/*.md
  -> 优先 rg；不可用时用可用搜索工具或 Select-String
  -> 读源码确认实际 API
  -> 实施或先给方案
  -> 运行可承受校验
  -> 总结改动、流程、验证
```

## OpenSpec 监督

除 L1 简单任务外，实现类任务必须使用 OpenSpec 监督，详细规则见 `.ai/rules/tyou-dev/openspec-workflow.md`。

Codex 使用：

- `$openspec-explore`
- `$openspec-propose`
- `$openspec-apply-change`
- `$openspec-archive-change`

Claude Code 使用：

- `/opsx:explore`
- `/opsx:propose`
- `/opsx:apply`
- `/opsx:archive`
- 或 `.claude/skills/openspec-*`

Windows PowerShell 若拦截 npm 生成的 `openspec.ps1`，统一改用 `cmd /c openspec.cmd ...`。

## 容错与同步

当源码、工具实际行为和 AI 工作流 md 不一致时，以源码和工具实际行为为准，并修正对应 md。详细规则见 `.ai/rules/tyou-dev/workflow-recovery.md`。

优先同步位置：

- 当前会话必须知道的规则：`AGENTS.md` 或 `CLAUDE.md`。
- CLI 路由和触发：`.agents/skills/*` 或 `.claude/*`。
- 具体主题规范：`.ai/rules/tyou-dev/*.md`。
- 人读工作流说明：`Books/AI-Development-Workflow.md`。
- 面向项目用户的概要说明：`README.md`。

## 强约束摘要

- `Client/assets/ty-framework/` 是框架代码，默认不改；确需修改必须先确认。
- UI 脚本创建必须优先走 `uitscreate`，不能绕开 `UIName/UIImportAll` 自动链路。
- UI 图片加载、按钮点击、事件监听必须优先用 `UIBase` 内置能力，确保关闭时统一清理。
- 资源必须走自动索引，禁止同名资源，加载找不到先检查是否执行索引生成。
- 资源引用计数必须配对，崩溃或泄漏优先查 `addRef/decRef`。
- Prefab 创建优先级：PSD 一键生成 > AI + 精简 MCP Prefab 流程 > 手动拼。
- 战斗设计遵循组合大于继承；先评估现有 `tyou.ecs` 是否适合。
- 高频战斗逻辑必须考虑微信、抖音等小游戏 JavaScript 运行成本。

## 可选增强

以下能力当前不是强制现状，需要明确实施后才能写成规则：

- 用 git hook 或 CI 检查敏感路径改动是否关联 OpenSpec change。
- 为高频 Luban 或 Prefab 任务拆独立 skill。
- 为 Cocos 编辑器生成物增加自动校验脚本。

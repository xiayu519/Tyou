## Why

战斗系统通常会快速膨胀出角色、技能、Buff、碰撞、表现、AI、数值等多维变化，如果默认用继承层级表达，后续组合和性能风险都会变高。Tyou 已有 `tyou.ecs` 基础能力，同时项目面向微信、抖音等小游戏正式环境，AI 工作流需要明确战斗设计的组合优先和小游戏运行时约束。

## What Changes

- 在 Codex AI 工作流中增加战斗设计规则：战斗对象和能力优先通过组件/数据/系统组合表达，避免深继承树。
- 要求 AI 在战斗设计前先评估现有 ECS 是否足够适配；适配时优先复用，不适配时允许从 0 设计轻量方案。
- 增加小游戏正式环境约束：接口设计必须谨慎，避免过度抽象、反射式动态接口、运行时生成和高频分配。
- 新增战斗设计 reference，并在入口文档与人读工作流中保留短规则。
- 不修改 `Client/assets/ty-framework/` 框架代码。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `codex-ai-workflow`: 增加战斗设计时的组合优先、ECS 评估和小游戏运行环境约束。

## Impact

- 影响 `AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.agents/skills/tyou-dev/references/`、`Books/AI-Development-Workflow.md` 和 `openspec/specs/codex-ai-workflow/spec.md`。
- 不影响运行时代码、Cocos Prefab、资源索引、Luban 配表或框架 API。

## Why

Claude Code 工作流目前已经接入 Tyou，但入口与 `tyou-dev` skill 的内容仍比 Codex 壳更简略。用户要求除 Claude Code 自身特性（slash commands、settings、memory 等）外，Claude Code 工作流的任务等级、OpenSpec 门禁、Tyou 红线、路由和自检内容必须与 Codex 工作流一致。

## What Changes

- 补齐 `CLAUDE.md` 中与 `AGENTS.md` 等价的 Tyou 编码红线、UI 约束、资源约束、战斗设计约束和 Prefab 优先级。
- 调整 `CLAUDE.md` L4、OpenSpec、源码搜索、结束自检表述，使其与 Codex 语义一致，只保留 Claude Code 入口特性差异。
- 补齐 `.claude/skills/tyou-dev/SKILL.md`，使其核心原则、实施节奏、结束自检和框架代码修改规则与 `.agents/skills/tyou-dev/SKILL.md` 等价。
- 清理 `.agents/skills/tyou-dev/SKILL.md` 中旧 `reference` 术语示例残留。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `ai-workflow-adapters`: 强化 Claude Code 适配壳与 Codex 适配壳的内容等价要求，仅允许 CLI 特性层差异。

## Impact

- 更新 `CLAUDE.md`。
- 更新 `.claude/skills/tyou-dev/SKILL.md`。
- 更新 `.agents/skills/tyou-dev/SKILL.md`。
- 不修改业务代码、资源、Prefab 或 `Client/assets/ty-framework/`。

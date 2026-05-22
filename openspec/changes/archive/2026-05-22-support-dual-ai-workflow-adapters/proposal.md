## Why

Tyou 当前 AI 工作流基本绑定 Codex：`AGENTS.md`、`.agents/skills/`、README 和 OpenSpec specs 都以 Codex 为中心。项目接下来需要同时支持 Codex CLI 与 Claude Code CLI，但不能让两套 CLI 互相读取对方的专属工作流，也不能把 Tyou/OpenSpec/UI/资源等规则维护成两份。

## What Changes

- 增加中性的共享规范层，承载 Tyou 开发规则、OpenSpec 流程、UI/资源/Prefab/PSD/Luban/战斗设计等真实内容。
- 将 Codex 工作流改造成 Codex 专属薄壳：`AGENTS.md` 与 `.agents/skills/*` 只描述 Codex 触发方式，并指向共享规范。
- 增加 Claude Code 专属薄壳：`CLAUDE.md`、`.claude/skills/*`、`.claude/commands/opsx/*`、`.claude/settings.local.json`，按 Claude Code CLI 特性触发 skill、slash command 和权限。
- 保持两套 CLI 互不引用：Codex 壳不引用 `.claude/`，Claude 壳不引用 `.agents/`，两者只共享 `.ai/rules/` 与 `openspec/`。
- 更新 README、Books 和 OpenSpec workflow specs，把“Codex-only”描述调整为“双适配壳 + 单一共享规范源”。

## Capabilities

### New Capabilities

- `ai-workflow-adapters`: 定义 Tyou 同时支持 Codex CLI 与 Claude Code CLI 的工作流适配规则、共享规范源和隔离边界。

### Modified Capabilities

- `codex-ai-workflow`: Codex 工作流从规则内容承载者调整为 Codex 适配壳，必须只引用共享规范源，不能依赖 Claude Code 专属目录。
- `project-readme-ai-workflow`: README 从“GPT/Codex 工作流说明”调整为“双 AI CLI 工作流说明”，准确描述 Codex 与 Claude Code 的入口差异和共享规范策略。

## Impact

- 新增 `.ai/rules/` 共享规范目录。
- 新增 `.claude/` Claude Code CLI 工作流壳。
- 更新 `AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.agents/skills/openspec-*`、README、`Books/AI-Development-Workflow.md`。
- 更新或新增 `openspec/specs/*` 工作流规格。
- 不修改 `Client/assets/ty-framework/`、业务代码、资源、Prefab 或生成物。

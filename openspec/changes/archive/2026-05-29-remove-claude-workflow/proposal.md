## Why

Claude Code 入口规则过长后会出现关键约束被忽略的问题，而当前项目实际仍以 Codex 工作流可控、稳定为主。为了降低维护成本和执行漂移风险，AI 工作流改为只保留 Codex CLI 适配壳，移除 Claude Code 工作流入口与双壳同步要求。

## What Changes

- **BREAKING**: 移除 Claude Code 工作流入口，包括 `CLAUDE.md`、`.claude/skills/*`、`.claude/commands/*`、`.claude/settings*` 等 Claude 专属适配壳。
- 将项目 README、Books 工作流说明、`.ai/rules/tyou-dev/*`、`AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md` 中的“双壳同步”改为 Codex-only 工作流规则。
- 更新 OpenSpec specs，不再要求 README 或 AI workflow specs 描述 Claude Code 支持。
- 保留 Codex 工作流：`AGENTS.md`、`.agents/skills/*`、`.ai/rules/`、`openspec/`、`.codex/memory/` 继续作为 Codex 入口、共享规则和记忆机制。
- 不修改 Tyou 运行时代码、UI、资源、Prefab、Luban、`Client/assets/ty-framework/`。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `ai-workflow-adapters`: 从 Codex + Claude 双 CLI 适配改为仅保留 Codex CLI 适配壳。
- `project-readme-ai-workflow`: README 的 AI 工作流说明从双 CLI 支持改为 Codex-only。
- `codex-ai-workflow`: 明确 Codex 工作流不需要检查、同步或依赖 Claude Code 专属文件。

## Impact

- 文档和工作流适配壳：`AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.ai/rules/tyou-dev/*.md`、`README.md`、`Books/AI-Development-Workflow.md`、`openspec/specs/*`。
- 删除 Claude Code 专属工作流文件：`CLAUDE.md` 与 `.claude/`。
- OpenSpec 规格：更新对应 delta spec，归档后需要同步到 `openspec/specs/`。
- 无运行时代码、依赖或资源变更。

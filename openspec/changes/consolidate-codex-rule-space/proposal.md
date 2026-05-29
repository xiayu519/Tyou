## Why

当前 Codex 工作流虽然已经移除了 Claude 适配层，但仍把 Tyou 规则正文放在 `.ai/rules/` 这个中立共享目录里，语义上还残留“双壳兼容”的影子。现在要按 Codex 官方 `AGENTS.md` 分层指令模型收拢为纯 Codex 工作流：入口、skill、规则正文、memory 都在 Codex 命名空间内表达。

## What Changes

- **BREAKING**: `.codex/rules/` 不再作为 Tyou/Codex 规则正文维护入口。
- 新的规则正文目录为 `.codex/rules/tyou-dev/`，由 `.agents/skills/tyou-dev/SKILL.md` 按主题路由读取。
- `AGENTS.md` 保持短入口，只写当前会话必须加载的项目约束、任务分级和 OpenSpec 门禁。
- `.agents/skills/*` 保持 Codex skill 触发与路由；具体 Tyou/OpenSpec/UI/资源/Prefab/PSD/Luban/战斗规则不在 skill 内重复维护。
- `README.md`、`Books/AI-Development-Workflow.md`、OpenSpec 规格同步改为“纯 Codex 工作流”表述。
- 迁移后清理 `.ai/rules/` 目录，避免未来继续维护中立共享规则源。

## Capabilities

### New Capabilities

### Modified Capabilities

- `codex-ai-workflow`: Codex 工作流的规则源、文件集和一致性检查从 `.codex/rules/` 改为 `.codex/rules/`。
- `ai-workflow-adapters`: 适配器规格不再描述共享中立规则源，改为纯 Codex 文件集。
- `project-readme-ai-workflow`: README 中的 AI 工作流说明改为 Codex 规则目录与 Codex 文件集。

## Impact

- 文档与规则目录：`AGENTS.md`、`.agents/skills/*`、`.codex/rules/`、`.codex/rules/`、`README.md`、`Books/AI-Development-Workflow.md`。
- OpenSpec 规格：`openspec/specs/codex-ai-workflow/spec.md`、`openspec/specs/ai-workflow-adapters/spec.md`、`openspec/specs/project-readme-ai-workflow/spec.md`。
- 不修改 `Client/assets/ty-framework/`，不修改业务代码、资源、Prefab 或 Luban 生成物。

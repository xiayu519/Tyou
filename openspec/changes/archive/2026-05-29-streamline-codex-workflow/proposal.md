## Why

上一轮已经收敛为 Codex 工作流，但部分文档仍带着过渡期解释，入口不够短、不够直接。这会稀释任务分级、OpenSpec 门禁和源码优先等核心约束，不符合“单一、精确、强执行”的目标。

## What Changes

- 精简 `AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.ai/rules/tyou-dev/*`、`README.md`、`Books/AI-Development-Workflow.md` 中面向 Codex 的工作流说明。
- 移除当前工作流文档中的过渡期解释，只保留 Codex 如何执行。
- 更新 OpenSpec specs，使规范描述 Codex 工作流的正向行为，而不是描述对其他工作流的排除。
- 不修改 Tyou 运行时代码、UI、资源、Prefab、Luban、`Client/assets/ty-framework/`。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `ai-workflow-adapters`: 改为描述精简 Codex 入口和共享规则关系。
- `project-readme-ai-workflow`: README 只保留 Codex 工作流的必要入口、任务分级和 OpenSpec 说明。
- `codex-ai-workflow`: 保留 Codex 执行约束和入口精简要求。

## Impact

- 文档：`AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.ai/rules/tyou-dev/openspec-workflow.md`、`.ai/rules/tyou-dev/workflow-recovery.md`、`README.md`、`Books/AI-Development-Workflow.md`。
- 规范：`openspec/specs/ai-workflow-adapters/spec.md`、`openspec/specs/project-readme-ai-workflow/spec.md`、`openspec/specs/codex-ai-workflow/spec.md`。
- 无运行时代码影响。

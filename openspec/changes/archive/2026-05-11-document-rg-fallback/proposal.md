## Why

当前 AI 工作流文档默认使用 `rg` 定位源码，但本机 Windows 环境未安装或未配置 `rg`，会导致模型按文档执行时遇到不必要的命令失败。需要把 `rg` 明确调整为首选工具，并记录可用 fallback，让后续 AI 会话可以继续完成搜索与源码确认。

## What Changes

- 在工作流入口、Tyou skill、人读工作流说明和容错文档中说明：优先使用 `rg`，若不可用则使用 VS Code `grep_search` 或 PowerShell `Select-String`。
- 保留现有 `.codex/memory/problem_2026-05-09.md` 记录作为环境事实，不重复新增同类问题记录。
- 不安装或引入新的命令行依赖，不修改业务代码或框架代码。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `codex-ai-workflow`: AI 工作流在源码定位与文档纠偏时必须具备搜索工具 fallback，不再假设 `rg` 一定可用。

## Impact

- 影响 `AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.agents/skills/tyou-dev/references/workflow-recovery.md` 和 `Books/AI-Development-Workflow.md` 的文字规则。
- 影响 `openspec/specs/codex-ai-workflow` 的工作流要求。
- 不影响 TypeScript 源码、Cocos 资源、Prefab、配置表或 `Client/assets/ty-framework/`。
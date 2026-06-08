## Why

非源码参考材料对 Tyou 的框架定位和若干运行时风险给出了可复核线索，但这些结论需要按本项目 Codex/OpenSpec 工作流回到源码、当前工作区改动和现有规则中复核。开发者已经手工修改了部分框架代码，本 change 用来补齐验证记录，并把确认合理的项目介绍和工作流说明同步到权威文档。

## What Changes

- 复核非源码参考材料与当前 Tyou 源码、用户已有 `ty-framework` 改动是否一致。
- 更新 README 的项目定位、运行时模块和关键契约描述，让项目介绍反映当前实现。
- 更新 Codex 工作流文档，明确非源码材料只能作为输入线索，写入项目文档前必须经源码/工具/OpenSpec 复核。
- 更新相关 OpenSpec specs，防止后续文档再次把来源对照结论当作本地事实。
- 不修改业务代码、Prefab/Scene/meta、Luban 配表或生成物。

## Capabilities

### New Capabilities

- `project-overview-documentation`: 约束 README/项目介绍如何描述 Tyou 的当前定位、模块边界和场景节点契约。

### Modified Capabilities

- `codex-ai-workflow`: 增加非源码材料进入 Tyou 文档前的本地事实复核要求。
- `framework-runtime`: 增加运行时文档必须反映当前全局模块树和固定场景节点契约的要求。
- `project-readme-ai-workflow`: 保持 README 中 Codex 工作流短入口描述，并允许指向 Books 中更完整的工作流说明。

## Impact

- 文档：`README.md`、`Books/AI-Development-Workflow.md`、`.codex/rules/tyou-dev/openspec-workflow.md`、`.codex/rules/tyou-dev/workflow-recovery.md`。
- OpenSpec：`openspec/changes/sync-tyou-analysis-docs/**`，以及归档前同步到 `openspec/specs/` 的相关 spec。
- 验证：本地源码搜索、dirty diff 审查、wiki-sync 只读扫描、OpenSpec 状态检查、Codex observability sensor。

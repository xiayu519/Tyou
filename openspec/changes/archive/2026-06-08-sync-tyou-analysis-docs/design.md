## Context

非源码参考材料包含运行时模块能力、UI/PSD 工具链和若干源码风险判断。当前工作区已有开发者手工修改的 `Client/assets/ty-framework/` 文件，覆盖了材料中提到的 Timer、HTTP、Network、Resource、Pool、UI/GameRoot 等风险点。

本项目规则要求 `ty-framework` 修改必须先确认影响；本次开发者已经完成代码修改并要求 Codex 按工作流验证和同步文档。因此本 change 不继续改框架代码，只把已验证合理的事实同步到 README、Books、Codex 规则和 OpenSpec specs。

## Goals / Non-Goals

**Goals:**

- 将非源码材料结论拆分为“可被当前源码/dirty diff 证实的项目事实”和“仅供参考的线索”。
- 更新项目介绍，让 README 直接说明 Tyou 是 Cocos Creator 3.8.7 + TypeScript 客户端框架。
- 更新工作流说明，明确非源码材料不是项目事实源，写入文档前必须复核源码、工具行为和 OpenSpec。
- 维护 L3/L4 `run-report.md` 和 sensor 验证记录。

**Non-Goals:**

- 不修改 `Client/assets/ty-framework/`、业务脚本、Prefab/Scene/meta、Luban 配表或生成物。
- 不把非源码材料里的完整对照章节、绝对私有路径或临时分析日志写进 README/Books。
- 不修复当前全量 TypeScript 编译环境的既有 Cocos/扩展声明问题。

## Decisions

- **非源码材料作为线索，不作为事实源**：材料中对 Tyou 定位的结论与源码结构一致时可写入项目介绍；材料中的风险点必须通过当前 diff 或源码验证后才能写入工作流/文档。
- **README 面向项目用户，Books 面向 Codex 协作**：README 只保留项目定位、特性和简短 Codex 入口；工作流细节放在 `Books/AI-Development-Workflow.md`、`.codex/rules/` 和 OpenSpec specs。
- **运行时契约写“当前实现”而不是“理想架构”**：文档应说明 `tyou.*` 全局模块树、`GameRoot`、`UICanvas/UICamera` 等当前强约定；设计评价或未来优化不写成已实现事实。
- **保留用户代码改动**：dirty `ty-framework` 文件视为开发者已有改动，Codex 只做审查和文档同步，不回退、不重写。

## Risks / Trade-offs

- **Risk: 参考材料语言过度进入 README** → Mitigation: README 只写本地可证实定位，不写来源对照。
- **Risk: 当前代码未经过 Cocos 编辑器运行验证** → Mitigation: `run-report.md` 记录验证命令和失败原因，最终回复说明剩余风险。
- **Risk: 文档与后续代码提交顺序不一致** → Mitigation: 文档描述以当前工作区实现为准，并通过 OpenSpec/sensor/archive 留痕。

## Migration Plan

1. 审查非源码材料、当前 dirty diff 和现有文档。
2. 更新 README、Books、Codex 规则和 OpenSpec specs。
3. 运行 wiki-sync 只读扫描、OpenSpec status、Codex observability sensor。
4. 如果 tasks/spec 同步和验证满足归档门禁，直接归档 change。

## Open Questions

- 无需开发者额外确认：本 change 不继续修改框架代码，只同步文档和 OpenSpec 记录。

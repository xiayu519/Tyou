## Why

Tyou 的本地 Codex memory 已经作为正式项目工作流启用。当前规则整体保留了 memory 能力，但部分措辞仍像临时开关，旧 archive 还保留过时 memory 语义，容易让后续 Codex 绕回临时口径。

同时，框架已经清掉此前被放弃的旧能力；文档和归档不应再用“没有某能力”这类声明占位。

## What Changes

- 将 `.codex/memory/` 明确为 L2+ 正常工作流的一部分：启动时读索引，符合写入条件时直接沉淀 typed memory，并更新 `INDEX.md`。
- 保留 memory 的边界：不写源码可查事实、临时过程、最近改动、完整日志或未验证猜测。
- 调整 `AGENTS.md`、`tyou-dev` skill、memory 规则、Books 和 OpenSpec spec，使措辞从“是否要记”改为“按正式归档条件执行”。
- 清理旧 workflow archive 中与过时 memory 语义相关的历史记录，避免新框架交付后误导检索。
- 继续保持旧能力零残留，不新增任何“本框架没有某能力”的说明。

## Impact

- 影响 Codex 工作流文档、skills、OpenSpec specs、memory 规则和旧 OpenSpec archive。
- 不影响 Cocos 运行时代码、`Client/assets/ty-framework/`、Prefab/Scene/meta、Luban 配表或生成物。

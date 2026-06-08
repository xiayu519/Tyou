## Why

Tyou 要作为一个崭新的框架交付，仓库不应携带旧分析归档、内部清理记录或过程性 memory 条目。当前 `.codex/memory/` 没有真实条目，应保留本地 memory 系统的空基线；`openspec/changes/archive/` 保留了多轮历史 change，需要清空历史 payload。

## What Changes

- 保留仓库级 Codex memory 功能、空索引、分类目录、模板和规则。
- 确认 `.codex/memory/INDEX.md` 只保留空基线，不写入过程性条目。
- 清空现有 OpenSpec archive 历史子目录，但保留 `openspec/changes/archive/` 作为未来归档目录。
- 更新 `AGENTS.md`、skills、`.codex/rules/`、Books、OpenSpec specs、`wiki-sync.yaml`，确保 memory 系统仍正常工作且不承载过程无用记录。
- 保留 OpenSpec 门禁、L2 轻/重分流、run-report/sensor、wiki-sync 和主题规则路由。

## Impact

- 影响 Codex 工作流文档、skills、OpenSpec specs、wiki-sync 配置和历史归档。
- 不影响 Cocos 运行时代码、`Client/assets/ty-framework/`、Prefab/Scene/meta、Luban 配表或生成物。

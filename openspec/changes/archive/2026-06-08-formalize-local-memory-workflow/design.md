## Context

`.codex/memory/` 已经具备 `INDEX.md`、分类目录、frontmatter 规则和模板。问题不是系统缺失，而是工作流措辞还带有临时感；旧 archive 中的过时 memory 描述也与现在的正式使用方式不一致。

## Decisions

- **正式启用本地 memory**：L2+ 任务按规则读取 `INDEX.md`，符合条件的可复用信息直接写入 typed memory。
- **边界继续保留**：memory 不替代源码、OpenSpec、规则和工具输出；只记录跨会话复用且不能稳定从权威来源恢复的信息。
- **收尾改为归档口径**：结束自检确认符合条件的信息已归档，无符合条件信息则不写。
- **过时 archive 清理**：删除旧 workflow archive payload，让当前 active spec/rules/docs 成为唯一权威描述。
- **旧能力不留占位**：不新增任何已移除能力或“无某能力”的说明。

## Risks / Mitigations

- **Risk: memory 被写成流水账** → Mitigation: 保留不写入清单、frontmatter、索引长度和 stale 复核规则。
- **Risk: 后续 Codex 把 memory 当事实源** → Mitigation: spec 和规则继续规定 memory 低于源码、OpenSpec、规则和当前工具输出。
- **Risk: archive 删除影响 OpenSpec 功能** → Mitigation: 只删除历史 payload，保留 `openspec/changes/archive/` 目录。

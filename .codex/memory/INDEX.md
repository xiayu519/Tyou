# Codex Memory Index

优先读本索引，再按任务类型读取对应条目。只记录真正可复用的信息。

索引约束：每条 memory 只占一行，长解释写在正文；目标不超过 80 行、12 KB。正文必须有 `type`、`description`、`status`、`last_verified`、`source` frontmatter。

## Problems

- `.codex/memory/problems/luban-xlsx-serial-writes.md`：修改 Luban 源 Excel 表时，同一 `.xlsx` 写入必须串行执行。

## Decisions

- 暂无。

## Feedback

- `.codex/memory/feedback/local-memory-formal-workflow.md`：本地 memory 按正式 Codex 工作流启用，符合条件时直接归档。

## References

- 暂无。

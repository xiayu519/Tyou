## Context

`.codex/memory/` 当前只有空索引与 `.gitkeep`，没有可复用条目；这是新框架应保留的 memory 空基线。历史 OpenSpec archive 记录能从 git 历史恢复，不适合作为新框架交付内容。

## Decisions

- **保留 repository memory**：Codex 继续在 L2+ 启动时读取 `.codex/memory/INDEX.md`，但当前基线不包含过程性条目。
- **限制写入范围**：只把跨会话可复用、源码和 OpenSpec 不能稳定推导的信息写入 memory。
- **清空 archive 历史**：删除 `openspec/changes/archive/*` 历史子目录，保留 `archive/` 目录供未来 workflow 使用。
- **不影响核心门禁**：OpenSpec、task level、run-report、sensor、wiki-sync 继续可用。

## Risks / Mitigations

- **Risk: 误删 memory 系统** → Mitigation: 恢复并保留 `.codex/memory/INDEX.md`、分类目录、memory 规则和模板。
- **Risk: 删除 archive 后缺少历史记录** → Mitigation: 历史可由 git 恢复；新框架交付不携带旧 change 记录。
- **Risk: memory 写入过程流水** → Mitigation: 保持 `.codex/rules/tyou-dev/memory-workflow.md` 的不写入清单和 frontmatter 约束。

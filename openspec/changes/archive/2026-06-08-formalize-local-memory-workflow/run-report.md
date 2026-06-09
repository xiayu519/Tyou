## Executive Summary

- Goal: 将 `.codex/memory/` 明确为正式 Codex 本地记忆流程，并清理会误导该流程的旧 archive payload。
- State: Applied.
- Validation: OpenSpec、wiki-sync、关键词扫描和 `git diff --check` 已通过。
- Remaining risk: 当前工作区还有此前已授权的框架运行时代码改动，sensor 会继续提示 protected paths；本 change 未新增运行时代码改动。

## Change

- `AGENTS.md`、`tyou-dev` skill、memory 规则、Books 和 `codex-ai-workflow` spec 已统一为正式 memory 流程。
- `.codex/memory/feedback/local-memory-formal-workflow.md` 已记录用户确认的 memory 协作反馈。
- 旧 workflow archive payload 已删除，`openspec/changes/archive/` 目录保留。

## Decisions

- 符合写入条件的 memory 直接归档，不走临时开关。
- 保留 frontmatter、索引长度、不写入清单和 stale 复核规则，避免 memory 变成过程流水。

## Validation

- `cmd /c openspec.cmd validate formalize-local-memory-workflow --strict`：通过。
- `cmd /c openspec.cmd validate --all --strict`：通过。
- `powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 diff`：无 mapping gaps。
- 旧能力关键词扫描：无命中。
- 旧 memory 口径关键词扫描：无命中。
- `git diff --check`：通过，仅有工作区换行提示。

## Sensors

- `codex-observability-check.ps1 -Change formalize-local-memory-workflow`：无 failure；归档前仅剩 protected-paths warning。
- protected-paths warning 来自当前工作区已有框架运行时代码改动，本 change 不修改运行时代码。

## Correction Loop

- 用户关于本地 memory 正式启用的反馈已写入 `.codex/memory/feedback/local-memory-formal-workflow.md` 并更新 `INDEX.md`。

## Risks

- 仍有 protected-paths sensor warning；来源是本次文档 change 之前已存在的框架运行时代码改动，不影响 memory 工作流文档本身的归档。

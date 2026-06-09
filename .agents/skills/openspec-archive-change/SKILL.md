---
name: openspec-archive-change
description: 把已完成实施的 OpenSpec change 归档到 openspec/changes/archive/YYYY-MM-DD-<name>/。当 tasks 全部勾选完成、用户说收尾/归档/结束变更时使用。归档前会校验 artifacts 与 tasks 完成度，并评估 specs/ delta 是否需要同步到主 specs。触发词：archive、归档、收尾、关闭变更、change 完成、结束这个 change。
license: MIT
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

# OpenSpec Archive

Archive a completed OpenSpec change to `openspec/changes/archive/YYYY-MM-DD-<name>/` after completion gates pass.

Follow `.agents/skills/tyou-dev/references/openspec-workflow.md` and read `references/workflow.md` before performing this phase.

## Hard Guardrails

- Select a clear active change; prompt if multiple changes or context is ambiguous.
- Check artifact completion with `openspec status --change "<name>" --json`.
- Check `tasks.md` for incomplete `- [ ]` items before archiving.
- If delta specs exist under `openspec/changes/<name>/specs/`, assess and sync them to `openspec/specs/` before archive unless they are already synced or the developer explicitly chooses otherwise.
- When the change is clear, artifacts are done, tasks are complete, specs are synced, validations pass, and no blocking risk remains, archive directly without extra confirmation.
- On Windows, archive with native PowerShell `Move-Item -LiteralPath` and verify the destination remains under `openspec/changes/archive/`.
- After archive, run `cmd /c openspec.cmd list --json` or `cmd /c openspec.cmd validate --all` and report the result.

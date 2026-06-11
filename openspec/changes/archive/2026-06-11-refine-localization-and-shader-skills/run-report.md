## Executive Summary

Change: `refine-localization-and-shader-skills`

本次变更收紧两个 AI 工作流：多语言新增低成本复用判断，shader skill 聚焦 Cocos Creator 3.8.7，不再保留 Unity/ShaderToy/URP 迁移入口。

## Change

- Updated `localization-dev` so new localization text first checks existing `TableLocalizationText` rows.
- Updated `tyou-shader-dev` and its references to keep the workflow focused on Cocos Creator 3.8.7 2D shader/effect work.
- Synced OpenSpec workflow specs and Tyou skill regression eval wording.

## Decisions

- Exact localization reuse requires both `zh_cn` and `en_us` to match an existing row.
- Similar localization text is only compared when the candidate set is small or already in context; otherwise exact matching is the cost ceiling.
- `tyou-shader-dev` no longer routes to non-Cocos host or pipeline migration references.
- Cocos Effect samples remain as structure references, not external project locations.

## Sensors

## Validation

- `rg -n "Unity|ShaderToy|URP|Built-in|RenderGraph|RTHandle|ShaderLab|GLSL|样本位置|外部参考|外部项目|unity_shader_dev|porting\\.md|迁移|screen 2D|屏幕级" .agents/skills/tyou-shader-dev openspec/specs .agents/skills/tyou-dev/evals/evals.json`
  - Result: no matches.
- `cmd /c openspec.cmd validate refine-localization-and-shader-skills --strict`
  - Result: passed.
- `cmd /c openspec.cmd validate --all`
  - Result: 9 passed, 0 failed.
- `$env:PYTHONUTF8='1'; python C:\Users\JuYou-123\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents\skills\localization-dev`
  - Result: passed.
- `$env:PYTHONUTF8='1'; python C:\Users\JuYou-123\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents\skills\tyou-shader-dev`
  - Result: passed.
- `powershell -ExecutionPolicy Bypass -File .agents\skills\tyou-dev\scripts\codex-observability-check.ps1 -Change refine-localization-and-shader-skills`
  - Result: pass=6, warn=3, fail=0 before final task/report update; remaining warnings were report headings, task progress, and unrelated pre-existing loader protected-path changes.
- `git diff --check`
  - Result: no whitespace errors; Git reported CRLF normalization warnings only.

## Risks

- Similar localization text may still be missed when the table is large and a semantic scan would be too expensive. This is intentional; the skill now requires Codex to say when it skipped similar-meaning comparison.
- Removing non-Cocos shader migration references narrows the skill trigger surface. That matches the project requirement to keep the workflow Cocos Creator focused.

## Correction Loop

- The observability sensor reported protected loader path changes that belong to the previously completed resource-module work already present in the working tree. This change did not edit loader source files.
- The first skill validation attempt failed because `quick_validate.py` reads UTF-8 Chinese `SKILL.md` with the Windows GBK default. The retry uses `PYTHONUTF8=1`.

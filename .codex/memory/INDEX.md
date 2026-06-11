# Codex Memory Index

优先读本索引，再按任务类型读取对应条目。只记录真正可复用的信息。

索引约束：每条 memory 只占一行，长解释写在正文；目标不超过 80 行、12 KB。正文必须有 `type`、`description`、`status`、`last_verified`、`source` frontmatter。

## Problems

- `.codex/memory/problems/luban-xlsx-serial-writes.md`：修改 Luban 源 Excel 表时，同一 `.xlsx` 写入必须串行执行。
- `.codex/memory/problems/skill-creator-chinese-utf8-gbk.md`：Windows 默认 GBK 下 skill-creator 脚本读取中文 UTF-8 `SKILL.md` 可能失败。

## Decisions

- `.codex/memory/decisions/prefab-source-asset-editing-authorized.md`：开发者已授权 AI 在受控工作流下增删改查 Cocos Prefab 源资产。
- `.codex/memory/decisions/scene-source-asset-editing-authorized.md`：开发者已授权 AI 在受控工作流下增删改查 Cocos Scene 源资产。

## Feedback

- `.codex/memory/feedback/local-memory-formal-workflow.md`：本地 memory 按正式 Codex 工作流启用，符合条件时直接归档。
- `.codex/memory/feedback/do-not-parse-luban-bin.md`：开发者明确要求不要解析 Luban `.bin`，配表问题直接看源表数据。
- `.codex/memory/feedback/tyou-shader-skill-scope.md`：Tyou shader skill 首版只关注 2D、Spine、序列帧图，并可参考 Unity Built-in 概念。

## References

- `.codex/memory/references/cocos-prefab-source-json.md`：本项目 Cocos Prefab 源文件是可解析 JSON 对象数组而非不可读二进制。
- `.codex/memory/references/cocos-scene-source-json.md`：本项目 Cocos Scene 源文件是可解析 JSON 对象数组而非不可读二进制。
- `.codex/memory/references/unity-shader-dev-localization-source.md`：`D:\gitframework\unity_shader_dev` 是后续本土化 Tyou/小游戏 shader skill 的 Unity URP 参考源。

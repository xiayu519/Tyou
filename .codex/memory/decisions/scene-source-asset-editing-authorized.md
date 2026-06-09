---
type: decision
description: 开发者已授权 AI 在受控工作流下增删改查 Cocos Scene 源资产
status: active
last_verified: 2026-06-09
source: user-confirmed
---

# Scene 源资产编辑授权

开发者已在 `2026-06-09` 明确允许 AI 操作项目 Scene 源资产，包括创建、读取、修改和删除 `Client/assets/**/*.scene` 以及必要的配套 `.scene.meta`。

使用前仍以 `.codex/rules/tyou-dev/scene-workflow.md` 为准：走 OpenSpec 门禁，结构化解析 JSON，检查 `__id__`、Prefab instance、`.meta`、启动节点契约和资源索引，不把授权扩展到 Cocos 生成缓存或构建产物。

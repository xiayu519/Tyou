---
type: decision
description: 开发者已授权 AI 在受控工作流下增删改查 Cocos Prefab 源资产
status: active
last_verified: 2026-06-09
source: user-confirmed
---

# Prefab 源资产编辑授权

开发者已在 `2026-06-09` 明确允许 AI 操作项目 Prefab 源资产，包括创建、读取、修改和删除 `Client/assets/**/*.prefab` 以及必要的配套 `.prefab.meta`。

使用前仍以 `.agents/skills/tyou-dev/references/prefab-workflow.md` 为准：走 OpenSpec 门禁，结构化解析 JSON，检查 `__id__`、`__uuid__`、`.meta` 和资源索引，不把授权扩展到 Cocos 生成缓存或构建产物。

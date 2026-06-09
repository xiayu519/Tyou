---
type: feedback
description: 开发者明确要求不要解析 Luban `.bin`，配表问题直接看源表数据
status: active
last_verified: 2026-06-09
source: user-confirmed
---

# 不解析 Luban `.bin`

开发者已明确纠偏：Luban `.bin` 是生成产物，不需要 AI 解析。配表相关问题应直接查看 `Design/config/*.xlsx`、Defines、导表脚本和生成后的 TypeScript 访问面。

后续如果在 Cocos 资产解析、资源索引或配置问题中遇到 `.bin`，不要把它纳入 `cocos-asset-json` 或通用二进制解析范围；应按 `luban-dev` 和 `.agents/skills/tyou-dev/references/luban-config.md` 处理。

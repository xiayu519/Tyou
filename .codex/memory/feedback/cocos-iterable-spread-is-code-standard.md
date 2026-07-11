---
type: feedback
description: 禁止非数组 iterable 展开是所有平台始终遵守的 Cocos TypeScript 代码规范，Web 兼容只是原因之一
status: active
last_verified: 2026-07-11
source: user-confirmed
---

# 非数组 iterable 展开是日常代码规范

## Feedback

- `Client/assets/` 运行时代码在任何平台、任何构建目标下都不得使用 `[...set]`、`[...map.keys()]`、`[...map.values()]` 或其他非明确数组 iterable 展开。
- 统一使用 `Array.from(...)` 或显式循环；只有数组、readonly 数组或 tuple 允许数组展开。
- Web 构建错误降级只是制定该规范的原因之一，不能把规则写成仅在 Web 打包或相关修改时才生效。
- 普通任务运行静态检查即可；只有任务本身是 Web 构建专项时才额外验证最终 Web 包。

## Apply

权威规则和检查命令见 `.agents/skills/tyou-dev/references/typescript-code-style.md`。

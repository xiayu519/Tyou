# Tyou Project Knowledge 工作流

`.codex/memory/` 是随仓库版本控制的 Tyou Project Knowledge，用于保存跨会话仍有价值、且不能从当前源码和稳定 reference 直接重建的决策与反馈。

它不是官方 Codex Memories。官方 Memories 位于 Codex home 的 `~/.codex/memories/`，由产品设置和 `/memories` 管理，不把生成状态手工提交到本仓库。必须稳定生效的项目规则写入 AGENTS、skills 或 references，不能只依赖任何 memory。

## 读取顺序

只有 Project Knowledge 可能影响当前判断时才读取：

1. 先看 `.codex/memory/INDEX.md`。
2. 根据索引只打开相关的 1-3 条正文。
3. stale-prone 内容用当前权威来源复核。

权威优先级：

1. 源码和当前工具输出。
2. 当前生效的 AGENTS、专项 skills 与 topic references。
3. 已核验的官方文档。
4. `.codex/memory/` Project Knowledge。
5. 历史 archive、对话摘要和旧报告。

## 写入时机

符合以下任一条件且不在“不写入”清单内时，写入对应分类并更新 `INDEX.md`：

- 可复发坑、非显而易见根因或容易误判的工具行为。
- 已确认的跨会话工作流或架构决策。
- 开发者明确纠偏、偏好或协作规则。
- 后续任务会复用、且包含 Tyou 特有取舍的外部参考；稳定官方链接本身维护在 topic reference，不在 Project Knowledge 再做镜像。

## Frontmatter

每条 active Project Knowledge 必须使用：

```yaml
---
type: problem|decision|feedback|reference
description: 一句话说明何时相关
status: active|stale|superseded
last_verified: YYYY-MM-DD
source: user-confirmed|codex-observed|reference-material
---
```

- `type` 必须与目录一致。
- `description` 保持一行，供索引和路由使用。
- `status: stale|superseded` 只能作为历史线索。
- `last_verified` 使用绝对日期。

## 分类

- `problems/`：可复发坑、根因与正确处理。
- `decisions/`：已确认的工作流或架构决策。
- `feedback/`：开发者明确纠偏与偏好。
- `references/`：无法由稳定 topic reference 替代的外部资料位置、用途与 Tyou 特有取舍；不保存官方链接清单镜像。

## 不写入

- 可用 `rg` 从源码得到的函数、路径和代码模式。
- Git 历史能恢复的最近改动。
- 当前对话、一次性 TODO、完整日志、验证流水和临时任务状态。
- 未验证猜测、模型推断或含糊偏好。
- 已在 AGENTS 或 topic references 清楚表达的重复规则。
- 密钥、token、账号信息、绝对私有路径或敏感日志。

确需跨会话的临时任务状态写 `.codex/work/<task>.md`，完成后删除。

## Stale 复核

工具行为、命令输出、依赖版本、官方文档、文件路径、函数名、配置项、flag、端口、日期，以及 `last_verified` 早于相关规则或源码变更的结论，使用前必须复核。

- 仍适用：更新 `last_verified`。
- 已失效：改为 `status: stale`。
- 被新条目取代：写明替代项并标记 `superseded`。
- 与权威来源冲突：以更高优先级来源为准。

## INDEX.md

`INDEX.md` 是目录，不是正文：每条 Project Knowledge 一行，只写相对路径和短摘要；目标不超过 80 行、12 KB。接近上限时先合并、缩短或标记旧条目。

新条目优先复用 `.agents/skills/tyou-dev/templates/memory-*.md`。

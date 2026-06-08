# Codex Memory 工作流

本项目 memory 是正式启用的本地 Codex 记忆系统，只记录跨会话可复用、源码和 OpenSpec 不能稳定推导的信息。符合写入条件时直接归档，不走临时开关。

## 读取顺序

1. L2+ 任务先读 `.codex/memory/INDEX.md`。
2. 根据索引只打开相关的 1-3 条 memory。
3. memory 是辅助上下文，不是事实源。

权威优先级：

1. 源码和当前工具输出。
2. `openspec/specs/` 与当前 change artifacts。
3. `AGENTS.md`、`.agents/skills/*`、`.codex/rules/`。
4. `.codex/memory/`。
5. 历史总结、归档 change、对话摘要。

## 写入时机

符合以下任一条件且不在“不写入”清单内时，直接写入对应分类 memory，并更新 `.codex/memory/INDEX.md`：

- 踩到可复发坑、非显而易见根因或容易误判的工具行为。
- 确认了跨会话有效的工作流、架构或协作决策。
- 收到开发者明确纠偏、偏好或协作规则反馈。
- 发现后续任务会复用的参考资料位置和本项目取舍结论。

写入 memory 不是记录过程流水；它只归档下次能减少误判或重复沟通的信息。

## Frontmatter

每条 active memory 必须使用 YAML frontmatter：

```yaml
---
type: problem|decision|feedback|reference
description: 一句话说明这条 memory 何时相关
status: active|stale|superseded
last_verified: YYYY-MM-DD
source: user-confirmed|codex-observed|reference-material
---
```

字段含义：

- `type`：必须与目录一致。
- `description`：给索引和路由使用，保持一行。
- `status`：`active` 可直接参考；`stale` 或 `superseded` 只能作为历史线索。
- `last_verified`：最近一次确认仍适用的日期，使用绝对日期。
- `source`：用户确认、Codex 观察、参考资料三选一。

## 分类

- `problems/`：可复发坑、非显而易见根因、容易误判的工具行为。
- `decisions/`：已经确认的工作流、架构或协作决策。
- `feedback/`：开发者明确纠偏、偏好、协作规则。
- `references/`：参考资料位置和本项目取舍结论。

## 不写入

不要把这些内容写入 memory：

- 源码能 `rg` 出来的代码模式、函数位置、文件路径细节。
- git/OpenSpec/archive 能恢复的最近改动、任务流水、临时状态。
- 当前对话上下文、一次性 TODO、完整终端日志。
- 未经验证的猜测、模型推断、含糊偏好。
- `AGENTS.md`、`.codex/rules/` 或 OpenSpec spec 已明确写过的重复规则。
- 会快速过期的相对日期；必须记录时转换为绝对日期。

## Stale 复核

memory 不是当前事实，而是历史快照；active memory 按当前上下文使用。只有以下 stale-prone 情况在使用前必须复核：

- 涉及工具行为、命令输出、参考材料、依赖版本、规则状态。
- 涉及文件路径、函数名、配置项、flag、端口或日期。
- `last_verified` 明显早于相关规则或源码变更。
- memory 与源码、OpenSpec spec、`.codex/rules/` 或工具输出冲突。

复核后：

- 仍适用：更新 `last_verified`。
- 已失效：改为 `status: stale`，或写明被哪条 memory/spec/rule 取代并标记 `superseded`。
- 事实冲突：以权威优先级更高的来源为准。

## INDEX.md 约束

`.codex/memory/INDEX.md` 是目录，不是正文：

- 每条 memory 只占一行。
- 一行只写路径和短摘要。
- 长解释放入 memory 正文。
- 目标不超过 80 行、12 KB。
- 接近上限时先合并、缩短或标记旧条目，不追加长段落。

## 模板

新 memory 优先从 `.agents/skills/tyou-dev/templates/memory-*.md` 复制结构。

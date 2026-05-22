## Context

Codex OpenSpec skills 是完整的操作壳，包含输入处理、状态检查、artifact 读取、任务推进、暂停条件、输出格式和 guardrails。Claude Code 当前对应 skills 只有摘要流程，虽然能触发 Claude 原生 skill，但会丢失部分行为约束。

## Goals / Non-Goals

**Goals:**

- 让 Claude Code 的 OpenSpec 四阶段 skill 壳与 Codex skill 的行为要求等价。
- 保留 Claude Code 特性：`/opsx:*` slash commands、Claude Code skill 触发、Windows PowerShell 使用 `cmd /c openspec.cmd ...` 的提醒。
- 保持两套壳互不依赖，只共享 `.ai/rules/` 与 `openspec/`。

**Non-Goals:**

- 不把 Codex skill 直接变成 Claude 依赖。
- 不删除 `/opsx:*` commands。
- 不改变 OpenSpec schema 或业务代码。

## Decisions

### 1. Skill 保持完整，CLI 文案局部替换

Claude `.claude/skills/openspec-*` 应承载与 Codex `.agents/skills/openspec-*` 等价的详细流程。差异只保留在：

- “This is the Claude Code CLI adapter”；
- 完成后提示 `/opsx:*` 或 Claude skill 名；
- Claude 可通过 slash command 或 skill 触发；
- Windows PowerShell 的 `cmd /c openspec.cmd ...` 提醒。

### 2. Slash command 是入口，不替代 skill 全文

`.claude/commands/opsx/*` 可以保持命令入口式短文档，但必须指向对应 Claude skill 或描述等价行为，不能与 skill 的 guardrails 冲突。

### 3. OpenSpec 主规格记录等价要求

`ai-workflow-adapters` 已要求 adapter content equivalent；本 change 的 delta 补充 OpenSpec skill 壳也属于比较对象。

## Risks / Trade-offs

- Claude skill 文件会变长，但这是用户要求“内容一模一样”带来的可接受重复。
- 后续维护时仍需双壳同步；已由双壳同步准则约束。

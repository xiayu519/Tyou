## Context

上一轮已建立双 CLI 适配壳和共享规则源，但实际对照发现 Claude Code 壳仍存在内容缺口：

- `CLAUDE.md` 的编码红线比 `AGENTS.md` 简略。
- `.claude/skills/tyou-dev/SKILL.md` 的结束自检和框架修改规则不如 Codex skill 完整。
- OpenSpec 初始化、L4、源码搜索 fallback 等表述存在小差异。

## Goals / Non-Goals

**Goals:**

- 让 Claude Code 工作流内容与 Codex 工作流保持等价。
- 保留 Claude Code 特性差异：`/opsx:*` commands、`.claude/settings.local.json`、Claude memory。
- 保持两套壳不互相依赖，仍只共享 `.ai/rules/` 与 `openspec/`。

**Non-Goals:**

- 不把两套壳合并成一个文件。
- 不删除 Claude Code 专属 commands/settings。
- 不改业务或框架代码。

## Decisions

### 1. 入口文件内容等价，CLI 入口名不同

`CLAUDE.md` 补齐 `AGENTS.md` 中所有 Tyou 红线，但保留 Claude 的 `/opsx:*` 和 Claude memory 表述。

### 2. Skill 壳内容等价，触发机制不同

`.claude/skills/tyou-dev/SKILL.md` 补齐 Codex skill 的结束自检和框架代码修改规则；`description` 仍使用 Claude Code 风格。

### 3. 术语统一为共享规则

Codex skill 中旧的“reference 无需修改”示例改为“共享规则无需修改”。

## Risks / Trade-offs

- 两个入口壳会有一定重复文本 → 接受，因为用户要求工作内容一致，且壳必须适配各自 CLI。
- 后续规则变更需要同步两边 → 已由双壳同步准则约束。

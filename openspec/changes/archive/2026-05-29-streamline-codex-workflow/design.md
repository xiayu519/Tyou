## Context

当前项目只保留 Codex 工作流，但文档中仍有上一阶段的过渡语。这些语句虽然不再指向具体文件，却仍把注意力从 Codex 执行链路拉走。

## Goals / Non-Goals

**Goals:**

- Codex 入口只写必须执行的规则。
- 共享规则只写如何保持 Codex 文档一致。
- README/Books 只面向当前使用者说明 Codex 工作流。
- OpenSpec specs 只描述当前正向行为。

**Non-Goals:**

- 不增加新的工作流入口。
- 不删除历史归档记录。
- 不改 Tyou 框架代码。

## Decisions

### 1. 用正向规则替代排除式规则

文档改写为“Codex 使用这些入口、按这些步骤执行”。需要表达边界时，仅写“当前工作流文件集合”。

### 2. 缩短入口文档

`AGENTS.md` 和 `tyou-dev` skill 只保留当前会话必须知道的约束：中文、任务分级、OpenSpec、源码优先、结束自检和路由表。长说明放在 `.ai/rules/` 或 Books，不在入口重复。

### 3. specs 跟随当前事实

OpenSpec 主 specs 不再保留过渡期 requirement，避免后续 propose/apply 继续把历史背景当作当前约束。

## Risks / Trade-offs

- 删除过渡说明后，历史背景更少 → 已由归档 change 和 memory 记录保存，不放在入口污染执行。
- 文档更短后解释性降低 → 这是本次目标，优先保证 Codex 执行约束强而清晰。

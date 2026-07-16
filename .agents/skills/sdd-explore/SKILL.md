---
name: sdd-explore
description: Tyou 轻量 SDD 只读对齐 skill。用于 SDD/spec-driven/explore/grill-me/先聊清楚、需求或验收不确定、对比方案、颗粒度、改动边界，以及框架、公共契约、schema/生成规则、工作流、受保护边界、高回滚成本或存在多种会改变结果的合理实现。只读探索，不实现；需要时输出语义 Change Contract 并等待明确确认。目标、验收与实现路径明确且语义边界不变的任务不触发；UI/资源/Prefab/Luban 等领域类别本身不构成触发条件。
---

# SDD Explore

用轻量、对话式 SDD 对齐开发者意图、设计颗粒度和语义边界。保留 spec 的决策价值，不恢复 OpenSpec CLI 或 proposal/design/tasks 仪式。

## 只读边界

- 可以读取源码、AGENTS、references、`.codex/memory/` Project Knowledge，并运行不会写项目状态的诊断。
- 不修改代码、资源、配置、文档或生成产物，不启动实施型工具。

## 工作流

1. 读取目标路径尚未生效的 AGENTS 和最少相关 reference，确认现状与约束。
2. 完整读取 `references/alignment-contract.md`，据此判断模式、确认状态和是否需要重新对齐。
3. 判断不确定性来自需求、开发偏好、技术方案还是范围；只有答案会改变方案时才问问题，每轮最多 1-3 个。
4. 需要对齐时输出该 reference 定义的 Change Contract，并严格按其中的确认规则处理。
5. 契约获批后交回 `tyou-dev` 和领域 skill，按获批语义边界实施；本 skill 不负责 apply/archive。

## Single rule source

Direct/Planned/Deep 门槛、Change Contract 字段、确认规则和 Re-alignment 条件只在 `references/alignment-contract.md` 维护；本文件不得复制或改写这些详细定义。

## 状态

默认只在对话和 Codex plan 中维护 Change Contract。只有跨会话、等待人工验证或长任务暂停时，才写 `.codex/work/<task>.md`；完成后删除，可复用决策进入 reference 或 `.codex/memory/` Project Knowledge。

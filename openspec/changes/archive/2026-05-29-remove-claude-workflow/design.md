## Context

Tyou 目前维护了 Codex CLI 与 Claude Code CLI 两套 AI 工作流适配壳，并通过“双壳同步”规则要求两边行为等价。实际使用中 Codex 工作流可正常执行，但 Claude Code 入口内容过长，导致任务分级、OpenSpec 门禁等关键约束可能被忽略。继续维护双壳会增加同步成本，并让 Codex 侧也背负不必要的 Claude 检查规则。

## Goals / Non-Goals

**Goals:**

- 将项目 AI 工作流收敛为 Codex-only：`AGENTS.md`、`.agents/skills/*`、`.ai/rules/`、`openspec/`、`.codex/memory/`。
- 删除 Claude Code 专属入口与适配目录，避免后续误认为项目仍支持 Claude 工作流。
- 更新共享规则、README、Books 文档和 OpenSpec specs，使它们不再要求双壳同步。
- 保证 Codex 的任务分级、OpenSpec 监督、按需读取共享规则、源码优先和结束自检仍然保留。

**Non-Goals:**

- 不修改 Tyou 运行时代码、`Client/assets/ty-framework/`、UI、资源、Prefab、Luban 或构建链路。
- 不提供 Claude Code 降级兼容入口。
- 不把 Claude 规则迁移到 Codex；Codex 只保留当前可用的原生工作流。

## Decisions

### 1. 直接删除 Claude 适配壳

删除 `CLAUDE.md` 和 `.claude/`，而不是把它们缩短或留空。原因是用户目标是“有关于 Claude 工作流的直接移除”，保留空壳会让 README、OpenSpec specs 和后续 AI 继续误判项目支持 Claude 工作流。

替代方案：保留一个短 `CLAUDE.md` 指向 `AGENTS.md`。拒绝原因是这仍然是 Claude 工作流入口，并会重新引入跨 CLI 依赖。

### 2. 将双壳同步改为 Codex 自检

`AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md` 和 `.ai/rules/tyou-dev/workflow-recovery.md` 中的“双壳同步”改为“Codex 壳与共享规则一致性检查”。AI 工作流变更只需检查 Codex 入口、Codex skills、共享规则、README/Books 与 OpenSpec specs 是否一致。

替代方案：只删除 Claude 文件，不改规则。拒绝原因是 Codex 后续仍会按旧规则寻找 `CLAUDE.md` 和 `.claude/`，造成无意义检查。

### 3. OpenSpec specs 同步为 Codex-only

`ai-workflow-adapters` 不再描述两个 CLI 的并行适配，而改为定义 Codex 适配壳与共享规则的关系；`project-readme-ai-workflow` 改为 README 只说明 Codex 工作流；`codex-ai-workflow` 补充 Codex 不需要同步或依赖 Claude 文件。

替代方案：保留历史 spec 只改文档。拒绝原因是归档后主 specs 会继续要求双 CLI 支持，与实际文件结构冲突。

## Risks / Trade-offs

- Claude Code 用户无法再直接使用仓库内 Claude 工作流 → 这是本次 breaking change 的预期结果，README 会明确当前只支持 Codex 工作流。
- 历史 archived changes 仍包含 Claude 文字 → 归档记录是历史事实，不作为当前工作流入口；验证时只要求当前入口、共享规则和主 specs 无 Claude 工作流要求。
- 删除 `.claude/` 可能移除本地权限配置 → 该配置只服务 Claude Code 工作流，Codex 不依赖它。

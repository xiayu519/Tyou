## Context

Codex 官方 `AGENTS.md` 指令模型按全局、项目根、当前目录逐层合并项目说明；项目内 `AGENTS.md` 应承载当前任务启动时必须知道的规则。当前仓库的详细 Tyou 规则被放在 `.ai/rules/`，这是过去为了兼容多 AI 外壳而设置的中立规则层。用户现在明确要求完全不兼容原来的双壳，只保留干净、精确的 Codex 工作流。

现状中 `.ai/rules/tyou-dev/*.md` 是规则正文，`.agents/skills/tyou-dev/SKILL.md` 负责路由。这个结构的“按需读取”是好的，但 `.ai/` 命名已经不符合纯 Codex 语义。

## Goals / Non-Goals

**Goals:**

- 将 Tyou 规则正文迁移到 `.codex/rules/tyou-dev/`。
- 保持 `AGENTS.md` 简短，避免把所有主题规则塞进自动加载入口。
- 保持 Codex skill 的触发和路由能力，改为路由到 `.codex/rules/`。
- 同步 README、Books、OpenSpec specs，避免旧 `.ai/rules/` 口径残留在当前工作流文档中。
- 删除 `.ai/rules/` 作为维护入口。

**Non-Goals:**

- 不引入 Claude Code、双壳适配或中立共享规则源。
- 不改 Tyou 框架源码、业务代码、Prefab、资源或 Luban 生成物。
- 不把 `.codex/rules/` 设计成 Codex 自动全量加载目录；它是按主题读取的规则库。

## Decisions

1. 使用 `.codex/rules/tyou-dev/` 作为规则正文目录。

   原因：`.codex/` 已经承载 Codex memory，语义上是项目内 Codex 工作流空间；把规则正文也放进 `.codex/rules/` 能消除 `.ai/rules/` 的中立兼容含义。

   备选：把规则拆成多个嵌套 `AGENTS.md`。不采用，因为大量主题规则会增加自动加载体积，也不适合按任务主题精确读取。

2. 保留 `.agents/skills/*` 作为 Codex skill 入口。

   原因：当前运行环境已经通过 Codex skill 机制发现这些 skill；skill 文件适合写触发词、核心原则和路由表。规则正文迁移后，skill 只需要改路径。

3. `AGENTS.md` 只保留会话入口级规则。

   原因：官方文档说明 Codex 会在开始工作前读取 `AGENTS.md`，并按目录层级合并；入口文件越精确，越不容易挤占上下文或造成过期规则被默认加载。

4. OpenSpec 规格同步改口径，而不是只改 Markdown 文档。

   原因：本仓库把工作流规范纳入 OpenSpec 验收；如果规格仍要求 `.ai/rules/`，后续归档或检查会把旧结构带回来。

## Risks / Trade-offs

- `.ai/rules/` 引用漏改 -> 用 `rg ".ai/rules"` 验证当前工作流文件和 OpenSpec 规格。
- `.codex/rules/` 被误认为自动加载目录 -> 在 `AGENTS.md`、README 和 Books 中明确它由 skill 按需读取。
- 旧归档 change 中仍有 `.ai/rules/` -> 不修改历史归档，只保证当前入口、当前规则和当前 specs 不再把 `.ai/rules/` 作为维护目标。
- OpenSpec CLI 在 PowerShell 下 `openspec.ps1` 受执行策略影响 -> 使用 `cmd /c openspec.cmd ...` 验证。

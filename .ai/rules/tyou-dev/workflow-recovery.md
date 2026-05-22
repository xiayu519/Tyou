# 工作流容错与文档同步

`.ai/rules/` 共享规则是为了省 token 的精炼规则，不是最终真相。源码和实际工具行为永远优先。

## 触发条件

遇到以下任一情况，必须进入容错流程：

- `.ai/rules/` 或其他 md 描述与源码 API 不一致。
- 按 md 执行后代码编译或运行失败。
- 开发者指出 AI 工作流规则不符合当前项目。
- 自动生成工具行为与文档描述不同。

## 处理顺序

1. 停止继续基于错误规则扩散修改。
2. 优先用 `rg` 定位源码或工具实现；若 `rg` 不可用，改用 VS Code `grep_search` 或 PowerShell `Select-String`。
3. 读取最小相关源码，确认真实行为。
4. 以源码和工具实际行为为准修正方案。
5. 修改对应共享规则或 md，让后续会话不再读到错误规则。
6. 在最终回复说明：冲突点、源码依据、已修正文档。

## 修改范围

优先修正这些文件：

- `AGENTS.md`：只修正每次会话必须知道的短规则。
- `.agents/skills/tyou-dev/SKILL.md`：只修正 Codex 适配壳路由和核心原则。
- `CLAUDE.md`、`.claude/skills/*.md`、`.claude/commands/*.md`：只修正 Claude Code 适配壳路由和 CLI 触发方式。
- `.ai/rules/tyou-dev/*.md`：修正具体主题规范正文。
- `Books/AI-Development-Workflow.md`：修正人读的流程说明。

不要为了修正文档去改 `ty-framework` 框架代码。

## 双适配壳同步

AI 工作流本身发生变更时，必须在同一个 OpenSpec change 中同步检查 Codex 与 Claude Code 两套适配壳：

- 修改 `.ai/rules/` 中影响任务分级、OpenSpec 门禁、路由、记忆、自检或开发约束的规则时，同时检查 `AGENTS.md`、`.agents/skills/*`、`CLAUDE.md`、`.claude/skills/*`、`.claude/commands/*`。
- 修改任一 CLI 的触发词、命令名、skill 路由、OpenSpec 入口或结束自检时，同时检查另一套 CLI 适配壳。
- 如果某个能力确实只属于单一 CLI，必须在对应文档或 OpenSpec artifact 中明确标注“CLI 专属”，并说明另一套 CLI 不需要同步的原因。
- 不保留旧 reference 兼容目录；规则正文只维护在 `.ai/rules/`。

## 记录问题

如果问题可能再次出现，记录到：

- **Codex CLI**：`.codex/memory/problem_YYYY-MM-DD.md`
- **Claude Code**：按 Claude Code memory 机制或 `.claude/agent-memory/` 记录

记录内容：

- 问题现象。
- 错误文档位置。
- 源码确认位置。
- 正确规则。
- 已修正哪些文档。

# 工作流容错与文档同步

`.codex/rules/` Codex 规则是为了省 token 的精炼规则，不是最终真相。源码和实际工具行为永远优先。

## 触发条件

遇到以下任一情况，必须进入容错流程：

- `.codex/rules/` 或其他 md 描述与源码 API 不一致。
- 按 md 执行后代码编译或运行失败。
- 开发者指出 Codex 工作流规则不符合当前项目。
- 自动生成工具行为与文档描述不同。

## 处理顺序

1. 停止继续基于错误规则扩散修改。
2. 优先用 `rg` 定位源码或工具实现；若 `rg` 不可用，改用 VS Code `grep_search` 或 PowerShell `Select-String`。
3. 读取最小相关源码，确认真实行为。
4. 以源码和工具实际行为为准修正方案。
5. 修改对应 Codex 规则或 md，让后续会话不再读到错误规则。
6. 在最终回复说明：冲突点、源码依据、已修正文档。

## 修改范围

优先修正这些文件：

- `AGENTS.md`：只修正每次会话必须知道的短规则。
- `**/AGENTS.override.md`：只修正对应目录工作时必须覆盖的短规则。
- `.agents/skills/tyou-dev/SKILL.md`：只修正 Codex skill 路由和核心原则。
- `.agents/skills/wiki-query/SKILL.md` 与 `.agents/skills/wiki-sync/SKILL.md`：修正 Wiki/文档知识库检索和同步入口。
- `wiki-sync.yaml`：修正 Wiki/文档知识库的扫描路径、映射、写入开关、备份和脱敏策略。
- `.codex/rules/tyou-dev/*.md`：修正具体主题规范正文。
- `.codex/memory/INDEX.md` 与分类条目：修正可复用经验、决策、反馈和参考位置。
- `Books/AI-Development-Workflow.md`：修正人读的流程说明。
- `README.md`：修正面向项目用户的概要说明。
- `openspec/specs/`：修正当前 Codex 工作流的行为规范。

不要为了修正文档去改 `ty-framework` 框架代码。

## Codex 工作流一致性

Codex 工作流本身发生变更时，必须在同一个 OpenSpec change 中检查这些位置是否一致：

- 修改 `.codex/rules/` 中影响任务分级、OpenSpec 门禁、路由、记忆、自检或开发约束的规则时，同时检查 `AGENTS.md`、`**/AGENTS.override.md`、`.agents/skills/*`、`.codex/memory/`、`wiki-sync.yaml`、`README.md`、`Books/AI-Development-Workflow.md` 与 `openspec/specs/`。
- 修改 Codex 的触发词、skill 路由、OpenSpec 入口或结束自检时，同时检查 `.agents/skills/*` 与 Codex 规则。
- 规则正文只维护在 `.codex/rules/`；`.agents/skills/*` 只写触发和路由。

## 记录问题

如果信息未来可能复用，记录到 `.codex/memory/` 分类条目并更新 `INDEX.md`。

分类：

- `problems/`：问题现象、根因、正确规则、已处理。
- `decisions/`：决策、原因、使用方式。
- `feedback/`：用户反馈、原因、如何应用。
- `references/`：外部资料位置、用途、何时查。

当前项目从结构化 memory 开始，不再写按日期滚动日志。

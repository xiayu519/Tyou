# 工作流容错与文档同步

reference 是为了省 token 的精炼规则，不是最终真相。源码和实际工具行为永远优先。

## 触发条件

遇到以下任一情况，必须进入容错流程：

- reference/md 描述与源码 API 不一致。
- 按 md 执行后代码编译或运行失败。
- 开发者指出 AI 工作流规则不符合当前项目。
- 自动生成工具行为与文档描述不同。

## 处理顺序

1. 停止继续基于错误规则扩散修改。
2. 优先用 `rg` 定位源码或工具实现；若 `rg` 不可用，改用 VS Code `grep_search` 或 PowerShell `Select-String`。
3. 读取最小相关源码，确认真实行为。
4. 以源码和工具实际行为为准修正方案。
5. 修改对应 reference/md，让后续会话不再读到错误规则。
6. 在最终回复说明：冲突点、源码依据、已修正文档。

## 修改范围

优先修正这些文件：

- `AGENTS.md`：只修正每次会话必须知道的短规则。
- `.agents/skills/tyou-dev/SKILL.md`：只修正文档路由和核心原则。
- `.agents/skills/tyou-dev/references/*.md`：修正具体主题规范。
- `Books/AI-Development-Workflow.md`：修正人读的流程说明。

不要为了修正文档去改 `ty-framework` 框架代码。

## 记录问题

如果问题可能再次出现，记录到：

```text
.codex/memory/problem_YYYY-MM-DD.md
```

记录内容：

- 问题现象。
- 错误文档位置。
- 源码确认位置。
- 正确规则。
- 已修正哪些文档。

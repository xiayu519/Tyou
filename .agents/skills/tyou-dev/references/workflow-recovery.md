# 工作流容错与文档同步

`tyou-dev/references/` 是为渐进加载准备的精炼项目知识，不是最终真相。源码、当前工具输出和已核验的官方文档优先。

## 触发条件

遇到以下任一情况，立即进入容错流程：

- reference 或其他文档与源码 API 不一致。
- 按文档执行后编译、测试、构建或运行失败。
- 开发者指出 Codex 工作流规则不符合当前项目或官方能力。
- 自动生成工具、Creator 扩展或 Codex 的实际行为与描述不同。

## 处理顺序

1. 停止继续基于错误规则扩散修改。
2. 用 `rg` 定位源码或工具实现；不可用时使用 VS Code `grep_search` 或 PowerShell `Select-String`。
3. 读取最少相关源码和配置，运行可重复的只读检查确认真实行为。
4. 涉及 Codex AGENTS、skills、模型或 CLI 行为时，使用 `openai-docs` 核验官方文档。
5. 以权威来源修正当前方案，并在本任务范围内同步对应文档。
6. 最终回答说明冲突、证据、已修正文件和仍未验证项。

## 修改范围

按职责修正：

- `AGENTS.md`：每次会话必须知道的常驻规则。
- `**/AGENTS.override.md`：目标目录的覆盖规则。
- `.codex/config.toml`：仓库默认模型与 reasoning。
- `.agents/skills/*/SKILL.md`：精确触发、路由与核心边界。
- `.agents/skills/**/references/*.md`：领域细节与验证流程。
- `wiki-sync.yaml`：文档集合、映射、写入开关、备份和脱敏策略。
- `.codex/memory/INDEX.md` 与分类条目：版本化 Tyou Project Knowledge，不是官方 Codex Memories。
- `Books/AI-Development-Workflow.md`：人读工作流。
- `README.md`：面向项目用户的概要。

不要为了修正文档去改业务代码或 `ty-framework`。

## Codex 工作流一致性

修改 Codex 工作流时使用 Deep 和原生 plan，并检查：

1. 根与目标目录 AGENTS 是否一致。
2. skill description、SKILL.md 路由和 `agents/openai.yaml` 是否一致。
3. 所有 SDD 摘要是否仍指向 `sdd-explore/references/alignment-contract.md`，且没有复制详细规则。
4. topic references、memory、README/Books 和 `wiki-sync.yaml` 是否仍引用旧流程。
5. `.agents/skills/tyou-dev/scripts/check-codex-workflow.ps1` 与 change boundary checker 测试是否通过。
6. 模型、AGENTS、skill description 或 SDD 门槛变化时，运行固定 5.6 的行为 eval。

详细正文留在 references；SKILL.md 保持路由化；可证明约束尽量进入脚本或测试。

## 记录问题

只有信息未来会减少误判或重复沟通时，才按 `memory-workflow.md` 写入 `.codex/memory/` Project Knowledge 并更新 `INDEX.md`。临时状态若确需跨会话，使用 `.codex/work/<task>.md`，任务完成后删除。

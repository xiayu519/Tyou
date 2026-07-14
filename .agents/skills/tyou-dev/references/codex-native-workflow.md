# Codex 原生工作流

> 适用前提：单人开发，固定使用 `gpt-5.6-sol`；项目默认 reasoning 为 `high`，Plan mode 为 `xhigh`。

## 官方行为基线

最后核验：2026-07-14

- AGENTS 分层指令：<https://learn.chatgpt.com/docs/agent-configuration/agents-md>
- Agent skills：<https://learn.chatgpt.com/docs/build-skills>
- Codex Memories：<https://learn.chatgpt.com/docs/customization/memories>
- 模型与 reasoning：<https://learn.chatgpt.com/docs/models>

Codex 在会话启动时，从项目根到启动 CWD 逐层发现并合并 `AGENTS.md` / `AGENTS.override.md`；每层最多选择一个文件，较近目录的规则优先。指令链不会因为会话中后来进入子目录而自动刷新，因此写目标文件前要检查沿途尚未生效的 override。

Skill 初始只暴露 `name`、`description` 和路径，命中后才加载完整 `SKILL.md`。隐式触发依赖 description，关键用途、触发词和禁止范围应前置；仓库 skill 位于从 CWD 到项目根沿途的 `.agents/skills/`。`agents/openai.yaml` 的 `allow_implicit_invocation` 默认是 `true`。

官方行为会变化。修改 AGENTS、skills、Codex 配置或路由前使用 `openai-docs` 重新核验；创建或修改 skill 使用 `skill-creator`；同步项目文档使用 `wiki-sync`。

## Tyou 映射

- `.codex/config.toml` 固定仓库默认模型与 reasoning；官方 Plan mode 使用 `plan_mode_reasoning_effort = "xhigh"`。Tyou Deep 是独立风险标签，不会自动切换 reasoning；临时需要时仍可由当前会话显式覆盖。
- `AGENTS.md` 只放常驻规则、红线、技能路由和验证入口；`tyou-dev` 负责主题路由与项目 API，不复制根红线，领域细节进入 skill reference。
- Direct、Planned、Deep 是 Tyou 风险标签，不是官方 Codex Plan mode。它们的唯一详细定义位于 `.agents/skills/sdd-explore/references/alignment-contract.md`。
- `sdd-explore` 只负责只读对齐，不复制 OpenSpec proposal/design/tasks 仪式。
- `.codex/memory/` 是版本化 Tyou Project Knowledge，不是官方 Codex Memories。官方 Memories 位于 Codex home，由产品设置和 `/memories` 管理；项目强制规则仍必须位于 AGENTS 或版本化文档。
- `.codex/work/<task>.md` 只保存跨会话、等待人工验证或暂停任务的临时状态，完成后删除。

## 验证路由

- `Client/assets/` 运行时 TypeScript：iterable spread 检查，加目标模块测试或构建。
- `SKILL.md`：官方 `quick_validate.py`，加工作流静态检查。
- Creator 扩展：目标 package 的 `npm run build` 或 `npm test`，必要时列 Creator 内人工步骤。
- Prefab/Scene/meta/asset-index：使用 `cocos-asset-json` 做结构与引用检查。
- Luban/本地化：修改源 Excel/Defines，执行对应生成与校验。
- 工作流：默认运行 smoke routing eval；只有发布工作流、修改完整路由矩阵或开发者明确要求时运行 full eval。Routing eval 要求精确必需 skill 集合，只允许显式 `optional_skills`，并且不替代实际执行验证。
- 所有修改：至少运行 `git diff --check`，并只验证本次明确文件与受影响模块。

结构性检查只能证明入口和元数据一致；routing eval 只能证明模型的分类输出符合预期，两者都不能替代目标行为验证。

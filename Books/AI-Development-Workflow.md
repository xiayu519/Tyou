# Tyou Codex 开发工作流

本文档描述 Tyou 当前的单人 Codex 工作流。固定使用 `gpt-5.6-sol`，reasoning 仅允许 `medium/high/xhigh/max`，默认 `high`，官方 Plan mode 为 `xhigh`；`max` 只显式用于最难且质量优先的任务或 eval，排除 `none/low`。Tyou 的 Deep 是风险标签，不会自动切换 reasoning。核心是：官方 Codex 原生能力 + 轻量 SDD 对齐 + 批准语义边界实施 + 真实验证。

## 权威入口

- `AGENTS.md`：常驻规则、SDD 门槛、红线和验证要求。
- `**/AGENTS.override.md`：目标目录覆盖规则。
- `.codex/config.toml`：仓库默认模型与 reasoning。
- `.agents/skills/sdd-explore/`：只读需求/方案/颗粒度/范围对齐。
- `.agents/skills/*/SKILL.md`：领域触发、路由和边界。
- `.agents/skills/**/references/*.md`：渐进加载的领域细节。
- `.codex/memory/INDEX.md`：版本化 Tyou Project Knowledge，不是官方 Codex Memories。
- `.codex/work/`：仅用于跨会话、等待人工验证或暂停的临时单文件状态。
- `wiki-sync.yaml`：文档集合与同步配置。

仓库不再保留 OpenSpec changes、archive、specs 或 CLI 配置。仍有长期价值的规则已经收敛到 AGENTS 与 skills/references；Project Knowledge 只保存未来新增且无法由这些稳定规则替代的项目知识。

## 为什么保留轻量 SDD

5.6 可以减少机械 spec 展开，但不能知道开发者未表达的偏好、颗粒度和语义边界。工作流保留 spec 的决策价值：先澄清、比较方案、声明允许改变与必须保护的 contracts、获得批准；删除重复 proposal/design/tasks 和全任务 CLI 往返。

原则是：保留 Spec 的功能，不恢复 Spec 的仪式。

## 官方 Codex 特性

Codex 在会话启动时按 CWD 构建一次 AGENTS 指令链；写目标文件前检查路径沿途尚未生效的 AGENTS/override。Skill 初始只暴露 metadata，匹配后才加载 SKILL.md 和最少 reference。

官方行为与核验日期见 `.agents/skills/tyou-dev/references/codex-native-workflow.md`。修改 AGENTS、skills 或模型路由前使用 `openai-docs` 重新核验。

GPT-5.6 的适配重点不是把提示词变短，而是让每条常驻指令都改变实际行为：保留结果、成功标准、停止条件、权限、证据与真实工程约束，删除同义重复和仪式化过程。示例、流程、风格以及 `must` / `never` 在保护真实不变量时继续使用。迁移按指令组小步修改并跑 eval，不全局引入 `max`、Programmatic Tool Calling、多代理、显式缓存或 persisted reasoning。

## SDD 单一规则源

Direct、Planned、Deep 是 Tyou 风险标签，不是官方 Plan mode。详细门槛、Change Contract 字段、确认规则和 Re-alignment 条件只在 `.agents/skills/sdd-explore/references/alignment-contract.md` 维护。

常驻摘要只有三条：语义明确且边界不变可 Direct；只有会改变结果的需求、验收或设计不确定性才先用 `sdd-explore`，UI/资源/Prefab/Luban 等领域类别本身不是门禁；公共契约、框架、schema/生成规则、工作流语义/路由/强制约束和高回滚成本按 Deep。只修正文案、链接或同步确定事实且不改变规则语义时仍可 Direct。文件数量不是门禁，获批任务可以一次完成；开发者已提供完整或语义等价契约并明确要求实施时不重复确认。

## Skills

| Skill | 用途 |
| --- | --- |
| `sdd-explore` | 只读需求澄清、方案对比、Change Contract 和 Re-alignment |
| `skill-creator` | 创建或修改 `SKILL.md` / `agents/openai.yaml`，并执行官方 skill 校验 |
| `game-asset-pipeline` | 纯 Codex imagegen + 本地脚本生成、处理、验证和接入游戏图片素材 |
| `tyou-dev` | Tyou/Cocos 客户端开发总入口 |
| `creator-extension-dev` | Creator extension 源码、contributions、build/test |
| `cocos-asset-json` | Prefab/Scene/meta/asset-index/SpriteAtlas 解析 |
| `tyou-shader-dev` | Cocos 2D/UI/Sprite/Spine/序列帧 shader |
| `luban-dev` / `localization-dev` | Luban 源数据、导表和本地化链路 |
| `wiki-query` / `wiki-sync` | 文档只读查询与受控同步 |

## 工具化入口

- 工作流检查：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/check-codex-workflow.ps1`
- 路径边界检查：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/check-change-boundary.ps1 -Files <files> -GeneratedFiles <files> -AllowedRoots <roots>`
- 按文件验证：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/validate-task.ps1 -Files <files> -GeneratedFiles <files> -AllowedRoots <roots>`
- 5.6 smoke 回归（默认）：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/evals/run-codex-routing-evals.ps1 -Reasoning high`
- 5.6 full 回归：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/evals/run-codex-routing-evals.ps1 -Suite full -Reasoning high`
- 5.6 outcome smoke：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/evals/run-codex-outcome-evals.ps1 -Reasoning high`
- 最难代表用例的 `max` eval：对上述 runner 显式传入 `-Reasoning max -Case <id>`，不把 `max` 设为日常默认。
- Cocos iterable spread：`node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs <files>`
- Wiki 扫描：`powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 scan`

`check-change-boundary.ps1` 只检查调用方明确列出的本任务文件是否位于声明的路径边界，并将生成文件单独列示；它不扫描或归因用户其他脏工作区，也不按文件数量授权。公共契约、用户行为和架构变化仍需由 Change Contract 与 review 判断。

Routing eval 使用真实 `gpt-5.6-sol` 新进程检查模式、确认状态、精确 skill 集合和关键验证入口；`optional_skills` 必须显式声明。Outcome eval 在 `temp/codex-workflow-evals/` 下创建独立嵌套仓库，检查只读任务不写文件、明确任务不多问、完整契约不重复确认、空结果有限 fallback、完成后停止，并记录耗时、工具/重试次数和 CLI 可提供的 token/cache usage；fixture 在 `finally` 中清理。两者都不能替代真实业务验证。

## 验证原则

1. 真实验证与风险对应：目标测试/构建、静态检查、资源校验、导表或可重复人工步骤。
2. 路径检查只能证明实际文件位于声明的目录边界，不能证明语义没有漂移；功能测试也不能替代 Change Contract review。
3. Creator 扩展使用目标 package 的 `npm run build` 或 `npm test`。
4. AGENTS、skill description、SDD 门槛或 eval 判定逻辑变化时运行 routing 与 outcome smoke；完整矩阵发布或明确要求时才运行 full eval。普通业务任务不支付模型回归成本。
5. 只读评审或诊断发现文档过期时只报告；实施任务仅同步由本次改动直接影响且位于批准范围内的文档。
6. 请求结果、必要验证和无法验证项已经交付，且批准范围内没有剩余必做工作时停止，不扩展可选重构。
7. 最后运行 `git diff --check`，报告批准的语义边界、实际文件/diff、未验证项和剩余风险。

## Project Knowledge、官方 Memories 与临时状态

`.codex/memory/` 是随仓库提交的 Tyou Project Knowledge，只在相关时读取索引和 1-3 条正文。可复发问题、长期决策、明确反馈，或包含 Tyou 特有取舍且无法由稳定 topic reference 替代的外部参考才进入该目录；稳定官方链接清单不重复镜像。

它不是官方 Codex Memories。官方 Memories 位于 Codex home，由产品设置和 `/memories` 管理，不手工提交到本仓库；必须稳定生效的项目规则仍写入 AGENTS、skills 或 references。

Change Contract 默认保留在对话和 Codex plan。确需跨会话时写 `.codex/work/<task>.md`，完成后删除；不恢复多文件 spec artifact。

## 项目红线摘要

- `Client/assets/ty-framework/` 默认只读，修改必须 Deep 并明确确认。
- UI 固有节点和必需组件写入源 Prefab，普通 UI 默认不用 `Graphics`。
- 资源走索引与 `tyou.res`，`addRef/decRef` 配对。
- 不改 Creator `library/`、`temp/`、`build/` 缓存。
- Luban 修改源 Excel/Defines，通过现有脚本导表，不手改生成 TS 或 `.bin`。
- 运行时 TypeScript 禁止展开非明确数组 iterable，并对明确文件运行 checker。

## 收尾

核对获批语义边界与实际 diff、目标验证、AGENTS/skills/references、README/Books、Project Knowledge 和 Wiki 配置。若使用 `.codex/work/<task>.md`，完成后删除。

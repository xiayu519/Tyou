# AGENTS.md

请使用中文写提案和回答；代码标识、命令、路径、API 名称和日志原文保持原样。

本项目是 Cocos Creator 3.8.7 + TypeScript 的 Tyou 客户端框架。当前工作流只面向单人开发，并假定全程使用 `gpt-5.6-sol`、reasoning 为 `high` 或 `xhigh`；不为低能力模型或多人审批增加常驻流程。

## Codex 原生入口

- Codex 会在会话启动时按当前工作目录构建一次 `AGENTS.md` 指令链。修改目标文件前，主动检查从仓库根到目标目录沿途尚未在当前会话生效的 `AGENTS.md` / `AGENTS.override.md`。
- 用 skill description 做任务路由；触发后只读取该 skill 的 `SKILL.md` 和当前任务所需的最少 reference。不要预加载全部项目文档。
- 主题参考位于 `.agents/skills/tyou-dev/references/`；`.codex/memory/` 是版本化 Tyou Project Knowledge，不是官方 Codex Memories。源码和工具实际行为高于 reference 与项目知识；发现过期内容时在同一任务中同步修正。
- Codex 工作流、AGENTS 或 skill 触发规则发生变化时，先用 `openai-docs` 核验官方 Codex 特性，再修改项目规则。

## SDD Alignment Gate

- Direct、Planned、Deep 是 Tyou 风险标签，不是官方 Codex Plan mode。详细门槛、Change Contract 格式和重新对齐条件唯一以 `.agents/skills/sdd-explore/references/alignment-contract.md` 为准。
- 目标、行为和实现路径明确且语义边界不变时 Direct；新功能、验收不明确或存在方案选择时先用 `sdd-explore`；框架、公共契约、schema/生成规则、工作流语义/路由/强制约束、受保护边界或高回滚成本按 Deep。
- Planned/Deep 写文件前必须得到明确批准；当前会话已批准同一契约时不重复确认。文件数量不是路由或重新确认门禁，获批任务可一次完成；是否分段只由风险、可验证性、方案稳定性或开发者要求决定。
- Change Contract 默认保留在对话和 Codex plan；仅在跨会话、等待人工验证或暂停时使用 `.codex/work/<task>.md`，完成后删除。

## 代码优先与技能路由

1. 优先用 `rg` 定位源码；不可用时用 VS Code `grep_search` 或 PowerShell `Select-String`。
2. 需求澄清、方案对比、颗粒度或改动范围对齐使用 `sdd-explore`；创建或修改 `SKILL.md` / `agents/openai.yaml` 使用 `skill-creator`；Tyou/Cocos 客户端任务使用 `tyou-dev`；Creator 扩展使用 `creator-extension-dev`；Prefab/Scene/meta/asset-index 使用 `cocos-asset-json`；Luban 与本地化使用对应专用 skill；Wiki 查询和同步分别使用 `wiki-query`、`wiki-sync`。
3. 修改生成链路前先找到源文件、生成器和确定性验证入口；不要直接修补生成产物来掩盖源问题。
4. 可复发问题、长期决策、明确用户反馈，或包含 Tyou 特有取舍且无法由稳定 topic reference 替代的外部参考，才写入 `.codex/memory/` Project Knowledge；临时进度、链接清单、聊天流水和可从源码重建的事实不写入。官方 Codex Memories 由产品自身管理，不在仓库内手工维护。

## 高风险红线

### Tyou 框架

`Client/assets/ty-framework/` 默认只读。确需修改时，先说明为什么不能在业务层解决、影响模块与调用链、`Tyou.ts` 生命周期注册和回滚成本，并获得开发者明确确认。

### UI Prefab 与组件

1. UI Prefab 固有节点、布局、渲染和交互组件必须在源 Prefab 中声明；禁止用运行时代码中的 `new Node()`、`addComponent()` 或等价方式补建本应静态存在的 UI。
2. 可动态实例化已经独立制作并校验的其他 Prefab，但不得加载后再补其必需 UI 组件。
3. 普通 UI 默认禁止使用 `Graphics`。背景、边框、色块、图标、进度、遮罩和静态装饰优先使用 `Sprite`、`Label`、`Mask`、`Layout`、`UITransform` 等常用组件。
4. 只有确需程序化动态几何且常用组件无法实现时才允许 `Graphics` 或运行时程序化 UI；实施前说明用途、范围、重绘触发与最大频率、生命周期/释放点和目标平台验证。

### Cocos TypeScript

1. `Client/assets/` 下运行时代码禁止对非明确数组或 tuple 的 iterable 使用数组展开，包括 `[...set]`、`[...map.keys()]`、`[...map.values()]`、`[...iterable]`；使用 `Array.from(...)` 或显式循环。明确为数组、readonly 数组或 tuple 时允许展开。
2. 修改运行时 TypeScript 后，对本次改动文件运行 `node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs <file...>`；不要用 `--changed` 混入无关脏文件。
3. Web 构建差异是风险依据之一，不是规则生效条件；仅在任务涉及 Web 构建、发布回归或转换链路时验证最终 Web 包。

## 验证与收尾

1. 验证必须对应实际风险：优先运行目标包测试/构建、静态检查、资源解析或生成器验证，不用 Markdown 结构完整代替行为正确。
2. 验证只覆盖本次明确文件和受影响模块，保留用户既有脏工作区；最后至少运行 `git diff --check`。
3. 工作流改动运行 `.agents/skills/tyou-dev/scripts/check-codex-workflow.ps1`；需要统一路由时运行 `.agents/skills/tyou-dev/scripts/validate-task.ps1 -Files <file...>`。
4. Planned/Deep 实施完成后按 `alignment-contract.md` 复核实际语义边界，并检查 `git diff --stat`。需要机器检查路径边界时使用 `.agents/skills/tyou-dev/scripts/check-change-boundary.ps1`；该脚本不判断语义授权。
5. 收尾时检查相关 reference、README/Books、skills、Project Knowledge 和 `wiki-sync.yaml` 是否与源码一致；符合条件的信息写入 `.codex/memory/`，否则不写。
6. 若创建过 `.codex/work/<task>.md`，完成后删除；最终回答报告批准的 Change Contract、实际语义范围、文件/diff review、验证、未验证项和剩余风险。

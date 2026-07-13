# AGENTS.md

请使用中文写提案和回答；代码标识、命令、路径、API 名称和日志原文保持原样。

本项目是 Cocos Creator 3.8.7 + TypeScript 的 Tyou 客户端框架。

## 规则位置

- 主题参考：`.agents/skills/tyou-dev/references/*.md`
- 记忆沉淀：`.codex/memory/INDEX.md` 与分类条目
- 变更监督：`openspec/`

按任务主题读取最少参考；参考与源码冲突时，以源码为准，并修正文档。

## 任务等级

| 等级 | 判断标准 | 处理 |
| --- | --- | --- |
| L1 | typo、注释、日志、单行无框架语义改名 | 直接处理，不走 OpenSpec |
| L2 轻量 | 单一文件或单一小模块内修改；调用已知 API；不改变公共契约、运行时行为、资源/UI/Luban/Prefab/工作流规则；验证直接明确 | 读 1 个相关参考，走最小 OpenSpec change |
| L2 重量 | 单一模块内但会改变公共 API 语义、错误处理、资源引用计数、UI 生命周期、异步运行时、工作流文档、OpenSpec specs、memory 或可复发风险处理 | 读 1-2 个相关参考，走当前 L2 保护流程 |
| L3 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 读 2-4 个相关参考，必须走 OpenSpec |
| L4 | 多模块协作、框架规则、Codex 工作流、重构决策 | 先探索和提案，再实施 |

不确定等级时上调一级。

## OpenSpec 门禁

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，先确认 OpenSpec 可用并进入 change：

1. 检查 `openspec --version` 和 `openspec/`；PowerShell 拦截 `openspec.ps1` 时用 `cmd /c openspec.cmd ...`。
2. 未安装或未初始化时停止实现，请开发者确认。
3. 没有匹配 change 就先 propose；已有 change 就按 tasks apply。
4. L3/L4 change 维护 `run-report.md`，并运行 Codex 可观测性 sensor 辅助 review。
5. tasks 全部完成、spec 已同步、验证通过且无阻塞时直接 archive；存在未完成项、未同步 delta、验证失败或目标不明确时才询问开发者。

L2 先判轻量/重量；不确定时按 L2 重量。轻量 L2 只减少文档负担，不跳过 OpenSpec 门禁；如果当前 OpenSpec schema 要求额外 artifact，就写最小 schema 兼容内容，不扩展长期规范。重量 L2 保持当前 L2 保护；`run-report.md` 仅用于开发者要求、风险扩大或发现可复发工作流风险的场景。

## 代码优先

1. 优先用 `rg` 定位源码；不可用时用 VS Code `grep_search` 或 PowerShell `Select-String`。
2. 以源码和工具实际行为为准。
3. 文档过期时同步修正。
4. 符合归档条件的可复发问题、决策、用户反馈或参考资料位置，直接记录到 `.codex/memory/` 分类条目，并更新 `INDEX.md`；memory 必须遵守 `.agents/skills/tyou-dev/references/memory-workflow.md` 的 frontmatter、stale 复核和不写入清单。

## UI Prefab 与组件红线

1. UI Prefab 固有的节点层级、布局、渲染和交互组件必须在源 Prefab 中声明；禁止用运行时代码中的 `new Node()`、`addComponent()` 或等价方式替代、补建或修补本应静态存在的 UI。允许动态加载或实例化已经独立制作并通过校验的其他 Prefab，但不得加载后再补其必需 UI 组件。
2. 普通 UI 默认禁止使用 `Graphics`。背景、边框、色块、图标、进度、遮罩和静态装饰优先使用 `Sprite`（含 Simple、Sliced、Filled）、`Label`、`Mask`、`Layout`、`UITransform` 等常用组件。
3. 只有明确需要程序化动态几何且常用组件无法合理实现时，才允许特殊使用 `Graphics` 或运行时程序化 UI；对应 OpenSpec change 必须写明用途、范围、重绘触发与最大频率、生命周期/释放点和目标平台验证。不得只以“方便”或“少做切图”为理由例外。

## Cocos TypeScript 代码规范

1. 无论运行平台和构建目标，`Client/assets/` 下的 Cocos 运行时代码都禁止对非明确数组或 tuple 的 iterable 使用数组展开，包括 `[...set]`、`[...map.keys()]`、`[...map.values()]`、`[...iterable]`；统一使用 `Array.from(...)` 或显式循环。只有类型明确为数组、readonly 数组或 tuple 时允许 `[...array]`。
2. 修改运行时 TypeScript 后，对本次改动文件运行 `node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs <file...>`；不要用 `--changed` 混入不属于本任务的脏工作区文件。
3. Web 构建差异是该禁令的风险依据之一，不是规则生效条件。普通任务不因本规范强制构建 Web；只有任务本身涉及 Web 构建差异、发布回归或转换链路时，才额外验证最终 Web 包。

## 结束自检

1. 参考是否要同步：代码与 `.agents/skills/**/references/**/*.md` 不一致时同步参考。
2. 工作流是否一致：改动工作流时检查 `AGENTS.md`、`**/AGENTS.override.md`、`.agents/skills/*`、`.codex/memory/`、`wiki-sync.yaml`、`README.md`、`Books/AI-Development-Workflow.md`、`openspec/specs/`；只有新增官方 Codex 命令审批策略时才检查 `.codex/rules/*.rules`。
3. memory 归档是否完成：符合写入条件的可复用信息已写入 `.codex/memory/` 并更新 `INDEX.md`；无符合条件信息则不写。
4. OpenSpec 是否要推进：走了 change 就检查 tasks；全绿且目标明确时直接 archive。
5. Cocos TypeScript 规范是否通过：本次改动过的运行时 TypeScript 已执行 iterable spread 检查；若任务本身是 Web 构建专项，再检查最终 Web 包。

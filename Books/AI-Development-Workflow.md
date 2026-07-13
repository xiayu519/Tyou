# Tyou Codex 开发工作流

本文档描述 Tyou 在 Codex CLI 下的项目工作流。

## 文件

- `AGENTS.md`：会话入口指令。
- `.agents/skills/tyou-dev/SKILL.md`：Codex skill 路由和核心原则。
- `wiki-sync.yaml`：Wiki/文档知识库同步配置，定义源码路径、文档集合、映射、写入开关、备份和脱敏规则。
- `.agents/skills/tyou-dev/references/*.md`：Tyou 主题参考，按需读取。
- `.codex/memory/INDEX.md`：结构化 memory 索引，按 `problems/`、`decisions/`、`feedback/`、`references/` 分类。
- `openspec/`：L2+ 变更监督。

## 等级

| 等级 | 场景 | 处理 |
| --- | --- | --- |
| L1 | typo、注释、日志、单行无框架语义改名 | 直接处理 |
| L2 轻量 | 单一文件或单一小模块内修改；调用已知 API；不改变公共契约、运行时行为、资源/UI/Luban/Prefab/工作流参考；验证直接明确 | 读 1 个相关参考，走最小 change，不默认写 run-report |
| L2 重量 | 单一模块内但会改变公共 API 语义、错误处理、资源引用计数、UI 生命周期、异步运行时、工作流文档、OpenSpec specs、memory 或可复发风险处理 | 读 1-2 个相关参考，保持当前 L2 保护 |
| L3 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 读 2-4 个相关参考，必须走 change |
| L4 | 多模块协作、框架约束、Codex 工作流、重构决策 | 先探索和提案，再实施 |

## OpenSpec

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，先确认 OpenSpec 可用并进入 change。

PowerShell 拦截 `openspec.ps1` 时，用：

```powershell
cmd /c openspec.cmd ...
```

L2 分流规则：

- 轻量 L2 只减少文档负担，不减少 OpenSpec 检查和 tasks 验收。
- 轻量 L2 不新增长期 spec；如果当前 schema 要求 artifact，就写最小 schema 兼容内容。
- 重量 L2 保持当前 L2 保护。
- 不确定时按重量 L2；实施中发现风险扩大时升级重量 L2 或 L3。

## 代码优先

参考与源码冲突时：

1. 用 `rg` 定位源码；不可用时用 VS Code `grep_search` 或 PowerShell `Select-String`。
2. 以源码和工具实际行为为准。
3. 同步修正文档。
4. 符合归档条件的可复发问题、决策、用户反馈或参考资料位置，直接写入 `.codex/memory/` 分类条目，并更新 `INDEX.md`。

## Skills

| Skill | 用途 |
| --- | --- |
| `tyou-dev` | Tyou 框架开发总入口和主题路由 |
| `cocos-asset-json` | Cocos Prefab/Scene/meta/asset-index/SpriteAtlas 源资产只读解析 |
| `tyou-shader-dev` | Cocos 2D/UI/Sprite/Spine/序列帧 shader/effect 本土化开发 |
| `openspec-explore` / `openspec-propose` / `openspec-apply-change` / `openspec-archive-change` | OpenSpec 四阶段 |
| `luban-dev` | Luban 配表、导表、配置变更安全 |
| `wiki-query` | 只读 Wiki/文档知识库检索 |
| `wiki-sync` | Wiki/文档差异扫描和受控同步 |

## 工具化入口

- Wiki 查询：`powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-query/scripts/wiki-query.ps1 -Query <关键词>`
- Wiki 扫描：`powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 scan`
- Luban 扫描：`powershell -ExecutionPolicy Bypass -File .agents/skills/luban-dev/scripts/scan-luban.ps1`
- Luban helper：`python .agents/skills/luban-dev/scripts/luban_helper.py table list`
- Cocos 源资产解析：`python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py inspect --file <prefab-or-scene> --assets-root Client/assets`
- Skill evals：`.agents/skills/tyou-dev/evals/evals.json`
- Codex 可观测性检查：`powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/codex-observability-check.ps1 -Change <change-name>`
- Cocos iterable spread 检查：`node .agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs <本次修改文件...>`；另支持 `--changed` 和 `--all`

Wiki 和 Luban 写操作默认关闭：`wiki-sync.yaml` 的 `write_enabled` 默认为 `false`，`luban_helper.py` 写 Excel 必须传 `--write`，且两者都必须遵守 OpenSpec 门禁。

## 可观测性

L3/L4 OpenSpec change 需要维护 `openspec/changes/<change-name>/run-report.md`，开头必须有 `## Executive Summary`，用于快速记录目标、状态、验证结果和剩余风险；正文只记录 review 需要的验证结论、关键决策、sensor 结果、剩余风险和是否需要 memory/wiki-sync，不写长过程流水。

`codex-observability-check.ps1` 只做本地确定性检查，例如 OpenSpec 状态、artifact 是否存在、tasks 勾选进度、`run-report.md` 结构和受保护路径 git 改动。它提供 review 证据，不证明语义正确，也不替代 TypeScript 编译、业务验证、Prefab/Luban 安全流程或开发者确认。

Codex 汇报工作流状态时，直接基于 `run-report.md`、sensor 输出、OpenSpec 状态和相关 memory/references 说明。

## Memory

L2+ 任务开始时先读 `.codex/memory/INDEX.md`，只打开与当前任务相关的 1-3 条记录。符合写入条件的可复用信息直接按类型归档，并遵守 `.agents/skills/tyou-dev/references/memory-workflow.md`：

- `problems/`：可复发坑和非显而易见根因。
- `decisions/`：已确认的工作流或架构决策。
- `feedback/`：用户对协作方式的纠偏或偏好。
- `references/`：参考资料位置和用途。

每条正文必须包含 `type`、`description`、`status`、`last_verified`、`source` frontmatter。写入后必须更新 `INDEX.md`，索引每条只占一行，目标不超过 80 行、12 KB。按日期滚动日志不进入 memory。

memory 是历史上下文，不是事实源；active memory 按当前上下文使用。涉及工具行为、路径、函数、flag、参考资料或日期时，使用前必须先按源码、OpenSpec、参考或当前工具输出复核。源码可查事实、最近改动、临时任务状态、完整日志和未验证猜测不写入 memory。

## 强约束

- `Client/assets/ty-framework/` 默认不改；确需修改必须先确认。
- UI 脚本创建优先走 `uitscreate`，不绕开 `UIName/UIImportAll`。
- UI 图片加载、按钮点击、事件监听优先用 `UIBase` 内置能力。
- UI Prefab 固有节点、布局、渲染和交互组件必须在源 Prefab 中声明，禁止用 `new Node()`、`addComponent()` 等运行时代码替代或修补；动态 UI 组合应加载或实例化已经独立制作并校验的 Prefab，且不得加载后再补其必需组件。
- 普通 UI 默认禁止 `Graphics`，背景、边框、色块、图标、常规进度、遮罩和静态装饰优先使用 `Sprite`（Simple/Sliced/Filled）、`Label`、`Mask`、`Layout`、`UITransform` 等常用组件。特殊程序化动态几何必须在 OpenSpec change 中记录用途、范围、重绘频率、生命周期/清理点和目标平台性能验证。
- 资源走自动索引；禁止同名资源；找不到资源先检查索引生成。
- `addRef/decRef` 必须配对。
- Prefab 源资产允许按 `.agents/skills/tyou-dev/references/prefab-workflow.md` 结构化编辑 JSON；创建优先级：PSD 一键生成 > AI + 精简 MCP Prefab 流程 > 手动拼 > 结构化 JSON 编辑。
- 业务对象池 Prefab 按稳定节点结构、组件、行为和生命周期拆分；仅图片或序列帧不同优先复用一个 Prefab，池化动态资源按节点/Widget/Pool owner 在 recycle、release 或 Pool 销毁点释放。
- `l_` 只用于需要进入资源索引并供运行时按逻辑名直接加载的独立图片；Prefab 静态图片不加 `l_`，SpriteAtlas 序列帧优先索引 Atlas。
- Scene 源资产允许按 `.agents/skills/tyou-dev/references/scene-workflow.md` 结构化编辑 JSON；Prefab 和 Scene 参考分开读取，不混成一套流程。
- Prefab/Scene 授权仅限源资产和必要 `.meta`，不扩展到 `Client/library`、`Client/temp`、`Client/build` 等生成或缓存目录。
- Prefab/Scene/meta/asset-index/SpriteAtlas 结构检查优先使用 `cocos-asset-json` 只读 helper；Luban `.bin` 不进入该解析范围。
- Cocos shader/effect 任务优先走 `tyou-shader-dev`；首版范围仅覆盖 2D、UI/Sprite、Spine、序列帧图和小游戏性能约束，不默认覆盖 3D/PBR/URP/Compute；泛化的玩法或战斗 `effect` 不因词面相同自动触发 shader 工作流。
- 战斗设计优先组合，先评估现有 `tyou.ecs`。
- 高频战斗逻辑必须考虑小游戏 JavaScript 运行成本。
- 无论运行平台和构建目标，`Client/assets/` 运行时代码都禁止对 `Set`、`Map` 迭代器、一般 `Iterable`、`any`、`unknown` 等非明确数组类型使用 `[...value]`；统一使用 `Array.from(...)` 或显式循环。只有数组、readonly 数组或 tuple 允许数组展开。
- Web 构建差异只是上述代码规范的风险依据之一。普通任务执行静态检查即可；只有任务本身涉及 Web 构建差异、发布回归或转换链路时，才额外验证最终 Web 包。

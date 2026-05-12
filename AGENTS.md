# AGENTS.md

请使用中文写提案和回答。
这里的“回答”包括澄清问题、进度更新、说明、总结和最终回复；代码标识、命令、路径、API 名称和日志原文保持原样。

本项目是 Cocos Creator 3.8.7 + TypeScript 的 Tyou 客户端框架。本仓库已配置 Codex 原生 skills（位于 [.agents/skills/](.agents/skills)），相关任务 Codex 会根据描述自动激活对应 skill；如未自动激活，可显式调用：`$tyou-dev`、`$openspec-propose`、`$openspec-apply-change`、`$openspec-archive-change`、`$openspec-explore`。

目标：目标明确、按需读取、少上下文、少返工。

## 强制工作流

### 第零步：判断任务等级

| 等级 | 判断标准 | 处理策略 |
| --- | --- | --- |
| L1 简单 | typo、注释、日志、单行无框架语义改名 | 不激活任何 skill，直接处理；不走 OpenSpec |
| L2 调用 | 单一模块局部修改、调用已知 API | 激活 `tyou-dev`，按需读 1 个 reference；走轻量 OpenSpec change |
| L3 功能 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 激活 `tyou-dev`，读相关 2-4 个 reference；必走 OpenSpec |
| L4 架构 | 多模块协作、框架规则、AI 工作流、重构决策 | 激活 `tyou-dev` + 必要 reference；先 `$openspec-explore` 给方案再 propose |

不确定等级时上调一级。

### 第零点五步：OpenSpec 监督

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，必须先确认 OpenSpec 可用并进入 change：

1. 检查 `openspec --version` 和 `openspec/` 目录存在；
2. 未安装/未初始化时停止实现，请开发者确认；
3. 已初始化时，没有匹配 change 就用 `$openspec-propose` 创建，已有 change 就用 `$openspec-apply-change` 推进；
4. 完成后用 `$openspec-archive-change` 归档。

详细四阶段流程见 `$openspec-propose` / `$openspec-apply-change` / `$openspec-archive-change` / `$openspec-explore` 各 skill 自身文档；不要在本文件重复。

### 第一步：以代码为准

skill 与 reference 是省 token 的精炼规范，不是最终真相。若与实际代码冲突：

1. 优先用 `rg` 定位源码；若 `rg` 不可用，使用 VS Code `grep_search` 或 PowerShell `Select-String` 后再读取源码确认真实 API；
2. 以源码实现为准；
3. 若是 AI 工作流文档过期，优先修正对应 md；
4. 在回复中说明冲突点和已修正文档；
5. 必要时记录到 [.codex/memory/problem_YYYY-MM-DD.md](.codex/memory)。

## 记忆使用约定

- 会话开始处理 L2+ 任务前，先 `Get-ChildItem .codex/memory -ErrorAction SilentlyContinue`，若有文件则按修改时间倒序读最近 1-2 份，避免重踩已记录过的问题。
- 发现“文档与代码/工具不一致”、“AI 踩过的坑”、“环境特异雷区”时，在当日的 `problem_YYYY-MM-DD.md` 末尾追加一条：现象、定位、根因、修正动作。
- 当天没有文件时才新建，不要为每个问题单开文件。

## 编码红线

- `Client/assets/ty-framework/` 是框架代码，原则上不允许修改。该目录有 `AGENTS.override.md` 强约束，进入时会自动加载。
- 不要默认把新增模块放到 `Client/assets/ty-framework/module/<name>/`，也不要默认修改 `Tyou.ts` 注册生命周期。只有开发者明确确认要扩展框架时才这样做。
- 框架入口使用全局 `tyou`：`tyou.ui`、`tyou.res`、`tyou.event` 等。
- IO/资源加载使用 `async/await`，不要引入同步阻塞加载。
- UI 类使用 `@UIDecorator` 注册，打开 UI 使用 `tyou.ui.showUIAsync(UIName.Xxx)`。
- UI 生成文件 `UIName.ts`、`UIImportAll.ts` 是注册链路的一部分，新增 UI 时必须同步维护。
- 资源逻辑名来自 `asset-index.json`，新增资源后需要考虑 `assetool` 索引生成流程。
- 修改 Cocos `.scene`、`.prefab`、`.meta` 前必须确认格式和引用关系；优先使用现有编辑器扩展或 MCP 工具。

## UI 约束

- UI 预制体对应的 UI 脚本原则上不允许手写创建，必须优先走 `uitscreate` 代码生成工具，因为它会同步生成/更新 `UIName.ts`、`UIImportAll.ts` 等必要注册数据。
- UI 内加载图片优先使用 `UIBase.getSprite()`、`UIBase.getSpriteFromAtlas()`，或加载后调用 `addAutoReleaseAsset()`，确保关闭时统一 `decRef`。
- UI 按钮点击事件必须用 `UIBase.onRegisterEvent()`，不要自己直接 `node.on("click", ...)`，避免关闭后事件残留。
- UI 内事件监听要让 `UIBase.onRelease()` 能统一清理：优先绑定到当前 UI 实例，并依赖 `tyou.event.targetOff(this)` 清理；自行全局监听必须说明清理方案。
- 当 `this.get("xxx")` 找不到节点或组件为空时，优先检查 UI 自动流程：节点命名前缀、是否执行前缀组件检查、是否走生成工具、预制体内是否重名、`UIName/UIImportAll` 是否同步。
- 若节点名不符合 `ui-component-config.json` 的前缀筛选规则，要先提示命名不符合自动生成规则，而不是直接手写兜底代码。

## 资源约束

- 资源模块走自动索引模式，原则上不允许同名资源；同名会导致逻辑名冲突或被生成器追加序号，业务引用容易错。
- 资源加载找不到时，优先检查是否执行过 `assetool` 自动生成资源索引，而不是手动改 `asset-index.json`。
- `addRef/decRef` 配对必须谨慎：多减可能让仍在使用的资源被释放，引发崩溃；少减会导致内存泄漏。资源崩溃或内存不卸载时，优先检查引用计数配对和延迟释放队列。

## 战斗设计约束

- 战斗、技能、Buff、伤害、AI 等设计遵循组合大于继承；先评估现有 `tyou.ecs` 是否适合，适合则优先复用，不适合则在业务侧从 0 设计轻量方案并说明原因。
- 本项目面向微信、抖音等小游戏正式环境，战斗接口和高频逻辑必须谨慎，避免深继承、大接口、反射式动态派发、运行时生成和可避免的每帧分配。

## Prefab 创建优先级

1. 推荐：PSD 一键生成 UI，再走前缀组件检查和 UI 代码生成。
2. 次选：AI 通过精简 MCP Prefab 流程创建。
3. 最后：开发者手动拼。

MCP 只保留 Prefab 创建相关规则，不加载庞大的通用 MCP 工具全集。

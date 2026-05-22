# CLAUDE.md

请使用中文写提案和回答。
这里的“回答”包括澄清问题、进度更新、说明、总结和最终回复；代码标识、命令、路径、API 名称和日志原文保持原样。

这个文件是 Claude Code CLI 专属入口，用于处理 Tyou 代码库。Claude Code 不依赖其他 CLI 的专属适配文件；不同 CLI 只共享 `.ai/rules/` 与 `openspec/`。

本项目是 Cocos Creator 3.8.7 + TypeScript 的 Tyou 客户端框架。具体 Tyou/OpenSpec/UI/资源/Prefab/PSD/Luban/战斗等规范正文统一维护在 `.ai/rules/`。

目标：目标明确、按需读取、少上下文、少返工。

## 双壳同步准则

当 AI 工作流内容发生修改时，无论当前使用 Codex 还是 Claude Code，都必须在同一个 OpenSpec change 中同步检查两套 CLI 适配壳：

- 共享规则改动：检查 `AGENTS.md`、`.agents/skills/*`、`CLAUDE.md`、`.claude/skills/*`、`.claude/commands/*` 是否需要同步。
- 适配壳改动：修改任一 CLI 的触发词、命令名、skill 路由、OpenSpec 入口或结束自检时，必须检查另一套 CLI 是否需要等价更新。
- CLI 专属能力：如果只适用于某一个 CLI，必须在文档或 OpenSpec artifact 中明确标注“CLI 专属”以及另一套不需要同步的原因。
- 不保留旧 reference 兼容目录；规则正文只维护在 `.ai/rules/`。

## 强制工作流

### 第零步：判断任务等级

| 等级 | 判断标准 | Claude Code 策略 |
| --- | --- | --- |
| L1 简单 | typo、注释、日志、单行无框架语义改名 | 不触发 skill，不走 OpenSpec，直接处理 |
| L2 调用 | 单一模块局部修改、调用已知 API | 触发 `tyou-dev` skill，按需读 1 个共享规则；走轻量 OpenSpec change |
| L3 功能 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 触发 `tyou-dev` skill，读相关 2-4 个共享规则；必走 OpenSpec |
| L4 架构 | 多模块协作、框架规则、AI 工作流、重构决策 | 触发 `tyou-dev` skill + 必要共享规则；先 `/opsx:explore` 给方案再 propose |

不确定等级时上调一级。

### 第零点五步：OpenSpec 监督

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，必须先确认 OpenSpec 可用并进入 change：

1. 检查 `openspec --version` 和 `openspec/` 目录存在；Windows PowerShell 若拦截 `openspec.ps1`，改用 `cmd /c openspec.cmd --version`；
2. 未安装/未初始化时停止实现，请开发者确认；
3. 已初始化时，没有匹配 change 就用 `/opsx:propose` 或 `openspec-propose` skill 创建，已有 change 就用 `/opsx:apply` 或 `openspec-apply-change` skill 推进；
4. 完成后用 `/opsx:archive` 或 `openspec-archive-change` skill 归档。

详细规则见 `.ai/rules/tyou-dev/openspec-workflow.md`。

### 第一步：按需读取共享规则

Claude Code 应使用 `.claude/skills/tyou-dev/SKILL.md` 触发 Tyou 开发指导，再按任务读取 `.ai/rules/tyou-dev/*.md`。不要读取其他 CLI 的专属适配目录作为 Claude 工作流入口。

### 第二步：以代码为准

共享规则是省 token 的精炼规范，不是最终真相。若与实际代码冲突：

1. 优先用 `rg` 定位源码；若 `rg` 不可用，使用 VS Code `grep_search` 或 PowerShell `Select-String` 后再读取源码确认真实 API；
2. 以源码实现为准；
3. 若是 AI 工作流文档过期，优先修正 `.ai/rules/` 或对应壳文件；
4. 在回复中说明冲突点和已修正文档；
5. 必要时按 Claude Code memory 机制或 `.claude/agent-memory/` 记录。

## 记忆使用约定

- 会话开始处理 L2+ 任务前，先检查 Claude Code memory 或 `.claude/agent-memory/` 中最近相关记录，避免重踩已记录过的问题。
- 发现“文档与代码/工具不一致”、“AI 踩过的坑”、“环境特异雷区”时，按 Claude Code memory 机制或 `.claude/agent-memory/` 记录：现象、定位、根因、修正动作。
- 不要为每个问题单开无意义碎片；按 Claude Code memory 机制组织。

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

## Claude Code 入口

- `CLAUDE.md`：Claude Code 项目入口。
- `.claude/skills/tyou-dev/`：Tyou 开发 skill 壳，路由到 `.ai/rules/tyou-dev/`。
- `.claude/skills/openspec-*`：OpenSpec 四阶段 skill 壳。
- `.claude/commands/opsx/*`：Claude Code slash command 入口。
- `.claude/settings.local.json`：Claude Code 本地权限配置。
- `.claude/agent-memory/`：Claude Code 专属记忆目录，可选使用。

## 结束自检

每次完成任务前检查，不需要全部“是”，但必须明确“不需要”与“已完成”的区别：

1. **共享规则是否要同步**：本次发现了代码与 `.ai/rules/**/*.md` 不一致、或实际行为与现有描述不同的场景吗？是则同步修改共享规则。
2. **双壳是否要同步**：本次是否修改了 AI 工作流规则、触发、路由、OpenSpec 入口或结束自检？是则检查 Codex 与 Claude Code 两套适配壳，除非已标注 CLI 专属原因。
3. **memory 是否要记一笔**：本次是不是踩了一个可能复发的坑、或者为某个现象找到了非显而易见的根因？是则按 Claude Code memory 机制或 `.claude/agent-memory/` 记录。
4. **OpenSpec 是否要推进**：如果走了 change，对应 `tasks.md` 是否都勾选了？全部完成则提示用户是否 `/opsx:archive`。

---
name: tyou-dev
description: Tyou Cocos Creator 3.8.7 + TypeScript 客户端框架开发指导。涉及以下任意主题时必须激活：tyou 全局入口、UIWindow、UIBase、@UIDecorator、UIName、UIImportAll、UIModule、tyou.ui.showUIAsync、tyou.res、tyou.event、ResourceModule、AssetIndexManager、asset-index.json、addRef/decRef、PSD2CCC、psd2ui、Luban 配表、Cocos Prefab/Scene/Meta 修改、Cocos 编辑器扩展（assetool/psd2ccc/uitscreate）、ty-framework 框架代码、UI 节点前缀、UI 命名规范、战斗设计、ECS、小游戏运行时约束。触发词：Tyou、tyou、Cocos Creator、UIWindow、UIBase、UIName、UIImportAll、ty-framework、psd2ccc、uitscreate、assetool、asset-index、Luban、配表、UI 开发、资源加载、事件系统、Prefab、战斗、技能、Buff、ECS、小游戏。
---

# Tyou 开发指导

Tyou 是 Cocos Creator 3.8.7 + TypeScript 客户端框架。本 skill 是 Codex CLI 专属适配壳；具体规范正文统一维护在 `.ai/rules/tyou-dev/`。使用本 skill 时保持按需读取，先路由到最小共享规则，再查代码确认。

禁止从本 Codex skill 依赖其他 CLI 的专属适配文件；不同 CLI 只共享 `.ai/rules/` 与 `openspec/`。

## 核心原则

1. 入口统一：运行时模块通过全局 `tyou.*` 访问。
2. UI 统一：`UIWindow` + `@UIDecorator` + `UIName` + `UIImportAll` + `tyou.ui.showUIAsync`。
3. 资源统一：逻辑名走 `AssetIndexManager`，加载走 `tyou.res`，动态资源释放走 `decRef` / 自动 holder。
4. 框架保护：`Client/assets/ty-framework/` 默认不改；确需修改必须先说明后果并等待开发者确认。
5. 自动化优先：PSD/UI/资源索引优先复用 `Client/extensions` 现有工具链。
6. 代码优先：共享规则与源码不一致时，读源码，以源码为准。
7. OpenSpec 监督：除 L1 外，任何实现类任务必须先确认 OpenSpec 可用并进入 change；未安装或未初始化时先停下请求确认。
8. 省 token：不要读取无关共享规则，不要整份复制 README，不要重复读取本会话已总结过的主题。
9. 双壳同步：AI 工作流规则、触发、路由、OpenSpec 入口或结束自检变更时，同一个 OpenSpec change 必须检查 Codex 与 Claude Code 两套适配壳；CLI 专属能力必须显式说明。

## 文档路由

| 任务类型 | 必读 | 可选 |
| --- | --- | --- |
| 项目结构/启动流程 | `.ai/rules/tyou-dev/architecture.md` | `.ai/rules/tyou-dev/modules.md` |
| 模块 API | `.ai/rules/tyou-dev/modules.md` | 对应源码 |
| UI 开发 | `.ai/rules/tyou-dev/ui-lifecycle.md` | `.ai/rules/tyou-dev/ui-patterns.md`, `.ai/rules/tyou-dev/naming-rules.md` |
| 资源加载/索引 | `.ai/rules/tyou-dev/resource-api.md` | `.ai/rules/tyou-dev/troubleshooting.md` |
| 事件系统 | `.ai/rules/tyou-dev/event-system.md` | `.ai/rules/tyou-dev/modules.md` |
| 战斗设计/ECS/小游戏运行时 | `.ai/rules/tyou-dev/battle-design.md` | `.ai/rules/tyou-dev/modules.md` |
| 配置表/Luban | `.ai/rules/tyou-dev/luban-config.md` | `Design/tools/genBin.bat` |
| PSD 到 UI | `.ai/rules/tyou-dev/psd2ui-workflow.md` | `.ai/rules/tyou-dev/ui-patterns.md` |
| Prefab 创建 | `.ai/rules/tyou-dev/prefab-workflow.md` | `.ai/rules/tyou-dev/prefab-mcp.md` |
| AI 创建 Prefab/MCP | `.ai/rules/tyou-dev/prefab-mcp.md` | `.ai/rules/tyou-dev/prefab-workflow.md` |
| 命名/生成规范 | `.ai/rules/tyou-dev/naming-rules.md` | `.ai/rules/tyou-dev/ui-patterns.md` |
| OpenSpec 工作流 | `.ai/rules/tyou-dev/openspec-workflow.md` | `Books/AI-Development-Workflow.md` |
| 工作流容错/文档同步 | `.ai/rules/tyou-dev/workflow-recovery.md` | 相关共享规则 |
| 排障 | `.ai/rules/tyou-dev/troubleshooting.md` | 相关源码 |

## 实施节奏

1. 判断 L1-L4。
2. 会话开始处理 L2+ 任务前，先 `Get-ChildItem .codex/memory -ErrorAction SilentlyContinue`，若有文件则按修改时间倒序读最近 1-2 份，避免重踩已记录过的问题。
3. L2+ 先按 `.ai/rules/tyou-dev/openspec-workflow.md` 检查 OpenSpec；没有初始化就等待开发者确认。
4. 读取最少共享规则。
5. 优先用 `rg` 定位实际代码和调用样例；若 `rg` 不可用，改用 VS Code `grep_search` 或 PowerShell `Select-String`。
6. 修改前说明将改哪些文件。
7. 实施后运行能承受的校验：TypeScript 编译、相关脚本或静态搜索。
8. 汇报改动、流程、验证结果。

## 任务结束自检

收尾前统一问四件事，不需要全部”是”，但必须明确”不需要”与”已完成”的区别：

1. **共享规则是否要同步**：本次发现了代码与 `.ai/rules/**/*.md` 不一致、或实际行为与现有描述不同的场景吗？是则同步修改共享规则。
2. **双壳是否要同步**：本次是否修改了 AI 工作流规则、触发、路由、OpenSpec 入口或结束自检？是则检查 Codex 与 Claude Code 两套适配壳，除非已标注 CLI 专属原因。
3. **memory 是否要记一笔**：本次是不是踩了一个可能复发的坑、或者为某个现象找到了非显而易见的根因？是则追加到 `.codex/memory/problem_YYYY-MM-DD.md`。
4. **OpenSpec 是否要推进**：如果走了 change，对应 `tasks.md` 是否都勾选了？全部完成则提示用户是否 `$openspec-archive-change`。

在最终回复中用一句话说出这四项的结论（例：“共享规则无需修改；双壳已同步；memory 追加一条 X；OpenSpec change-Y 剩 2 项 task”）。

## 框架代码修改规则

新增模块或修改 `ty-framework` 不属于普通业务开发。必须先问开发者是否确认，并说明：

- 为什么必须改框架而不是业务层实现。
- 会影响哪些现有模块和调用链。
- 是否需要修改 `Tyou.ts` 生命周期注册。
- 失败或回滚成本。

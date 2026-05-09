---
name: tyou-dev
description: Tyou Cocos Creator 3.8.7 + TypeScript 客户端框架开发指导。涉及以下任意主题时必须激活：tyou 全局入口、UIWindow、UIBase、@UIDecorator、UIName、UIImportAll、UIModule、tyou.ui.showUIAsync、tyou.res、tyou.event、ResourceModule、AssetIndexManager、asset-index.json、addRef/decRef、PSD2CCC、psd2ui、Luban 配表、Cocos Prefab/Scene/Meta 修改、Cocos 编辑器扩展（assetool/uitscreate/cocos-mcp-server）、ty-framework 框架代码、UI 节点前缀、UI 命名规范。触发词：Tyou、tyou、Cocos Creator、UIWindow、UIBase、UIName、UIImportAll、ty-framework、psd2ccc、uitscreate、assetool、asset-index、Luban、配表、UI 开发、资源加载、事件系统、Prefab。
---

# Tyou 开发指导

Tyou 是 Cocos Creator 3.8.7 + TypeScript 客户端框架。使用本 skill 时保持按需读取，先路由到最小 reference，再查代码确认。

## 核心原则

1. 入口统一：运行时模块通过全局 `tyou.*` 访问。
2. UI 统一：`UIWindow` + `@UIDecorator` + `UIName` + `UIImportAll` + `tyou.ui.showUIAsync`。
3. 资源统一：逻辑名走 `AssetIndexManager`，加载走 `tyou.res`，动态资源释放走 `decRef` / 自动 holder。
4. 框架保护：`Client/assets/ty-framework/` 默认不改；确需修改必须先说明后果并等待开发者确认。
5. 自动化优先：PSD/UI/资源索引优先复用 `Client/extensions` 现有工具链。
6. 代码优先：reference 与源码不一致时，读源码，以源码为准。
7. OpenSpec 监督：除 L1 外，任何实现类任务必须先确认 OpenSpec 可用并进入 change；未安装或未初始化时先停下请求确认。
8. 省 token：不要读取无关 reference，不要整份复制 README，不要重复读取本会话已总结过的主题。

## 文档路由

| 任务类型 | 必读 | 可选 |
| --- | --- | --- |
| 项目结构/启动流程 | `references/architecture.md` | `references/modules.md` |
| 模块 API | `references/modules.md` | 对应源码 |
| UI 开发 | `references/ui-lifecycle.md` | `references/ui-patterns.md`, `references/naming-rules.md` |
| 资源加载/索引 | `references/resource-api.md` | `references/troubleshooting.md` |
| 事件系统 | `references/event-system.md` | `references/modules.md` |
| 配置表/Luban | `references/luban-config.md` | `Design/tools/genBin.bat` |
| PSD 到 UI | `references/psd2ui-workflow.md` | `references/ui-patterns.md` |
| Prefab 创建 | `references/prefab-workflow.md` | `references/prefab-mcp.md` |
| AI 创建 Prefab/MCP | `references/prefab-mcp.md` | `references/prefab-workflow.md` |
| 命名/生成规范 | `references/naming-rules.md` | `references/ui-patterns.md` |
| OpenSpec 工作流 | `references/openspec-workflow.md` | `Books/AI-Development-Workflow.md` |
| 工作流容错/文档同步 | `references/workflow-recovery.md` | 相关 reference |
| 排障 | `references/troubleshooting.md` | 相关源码 |

## 实施节奏

1. 判断 L1-L4。
2. L2+ 先按 `references/openspec-workflow.md` 检查 OpenSpec；没有初始化就先初始化或等待开发者确认。
3. 读取最少 reference。
4. 用 `rg` 定位实际代码和调用样例。
5. 修改前说明将改哪些文件。
6. 实施后运行能承受的校验：TypeScript 编译、相关脚本或静态搜索。
7. 汇报改动、流程、验证结果。

## 任务结束自检

收尾前统一问三件事，不需要全部“是”，但必须明确“不需要”与“已完成”的区别：

1. **reference 是否要同步**：本次发现了代码与 `references/*.md` 不一致、或实际行为与现有描述不同的场景吗？是则同步修改 reference。
2. **memory 是否要记一笔**：本次是不是踩了一个可能复发的坑、或者为某个现象找到了非显而易见的根因？是则追加到 `.codex/memory/problem_YYYY-MM-DD.md`。
3. **OpenSpec 是否要推进**：如果走了 change，对应 `tasks.md` 是否都勾选了？全部完成则提示用户是否 `$openspec-archive-change`。

在最终回复中用一句话说出这三项的结论（例：“reference 无需修改；memory 追加一条 X；OpenSpec change-Y 剩 2 项 task”）。

## 框架代码修改规则

新增模块或修改 `ty-framework` 不属于普通业务开发。必须先问开发者是否确认，并说明：

- 为什么必须改框架而不是业务层实现。
- 会影响哪些现有模块和调用链。
- 是否需要修改 `Tyou.ts` 生命周期注册。
- 失败或回滚成本。

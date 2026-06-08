---
name: tyou-dev
description: Tyou Cocos Creator 3.8.7 + TypeScript 客户端框架开发指导。涉及以下任意主题时必须激活：tyou 全局入口、UIWindow、UIBase、@UIDecorator、UIName、UIImportAll、UIModule、tyou.ui.showUIAsync、tyou.res、tyou.event、ResourceModule、AssetIndexManager、asset-index.json、addRef/decRef、PSD2CCC、psd2ui、Luban 配表、Cocos Prefab/Scene/Meta 修改、Cocos 编辑器扩展（assetool/psd2ccc/uitscreate）、ty-framework 框架代码、UI 节点前缀、UI 命名规范、战斗设计、ECS、小游戏运行时约束。触发词：Tyou、tyou、Cocos Creator、UIWindow、UIBase、UIName、UIImportAll、ty-framework、psd2ccc、uitscreate、assetool、asset-index、Luban、配表、UI 开发、资源加载、事件系统、Prefab、战斗、技能、Buff、ECS、小游戏。
---

# Tyou 开发指导

Tyou 是 Cocos Creator 3.8.7 + TypeScript 客户端框架。具体规则在 `.codex/rules/tyou-dev/`，按任务主题读取最少文件，再查源码确认。

回归用例位于 `.agents/skills/tyou-dev/evals/evals.json`，用于检查 AI 是否仍按 Tyou UI、资源、Luban、事件、Prefab 和 OpenSpec 规则回答。

## 核心原则

1. 入口统一：运行时模块通过全局 `tyou.*` 访问。
2. UI 统一：`UIWindow` + `@UIDecorator` + `UIName` + `UIImportAll` + `tyou.ui.showUIAsync`。
3. 资源统一：逻辑名走 `AssetIndexManager`，加载走 `tyou.res`，动态资源释放走 `decRef` / 自动 holder。
4. 框架保护：`Client/assets/ty-framework/` 默认不改；确需修改必须先说明后果并等待开发者确认。
5. 自动化优先：PSD/UI/资源索引优先复用 `Client/extensions` 现有工具链。
6. 代码优先：规则与源码不一致时，读源码，以源码为准。
7. OpenSpec 监督：除 L1 外，任何实现类任务必须先确认 OpenSpec 可用并进入 change；未安装或未初始化时先停下请求确认。
8. 省 token：不要读取无关规则主题，不要整份复制 README，不要重复读取本会话已总结过的主题。
9. 工作流一致：Codex 工作流规则、触发、路由、OpenSpec 入口、memory 或结束自检变更时，同一个 OpenSpec change 必须检查 `AGENTS.md`、`**/AGENTS.override.md`、`.agents/skills/*`、`.codex/rules/`、`.codex/memory/`、`README.md`、`Books/AI-Development-Workflow.md` 与 `openspec/specs/` 是否一致。

## 文档路由

| 任务类型 | 必读 | 可选 |
| --- | --- | --- |
| 项目结构/启动流程 | `.codex/rules/tyou-dev/architecture.md` | `.codex/rules/tyou-dev/modules.md` |
| 模块 API | `.codex/rules/tyou-dev/modules.md` | 对应源码 |
| UI 开发 | `.codex/rules/tyou-dev/ui-lifecycle.md` | `.codex/rules/tyou-dev/ui-patterns.md`, `.codex/rules/tyou-dev/naming-rules.md` |
| 资源加载/索引 | `.codex/rules/tyou-dev/resource-api.md` | `.codex/rules/tyou-dev/troubleshooting.md` |
| 事件系统 | `.codex/rules/tyou-dev/event-system.md` | `.codex/rules/tyou-dev/modules.md` |
| 战斗设计/ECS/小游戏运行时 | `.codex/rules/tyou-dev/battle-design.md` | `.codex/rules/tyou-dev/modules.md` |
| 配置表/Luban | `.agents/skills/luban-dev/SKILL.md` | `.codex/rules/tyou-dev/luban-config.md`, `Design/tools/genBin.bat` |
| PSD 到 UI | `.codex/rules/tyou-dev/psd2ui-workflow.md` | `.codex/rules/tyou-dev/ui-patterns.md` |
| Prefab 创建 | `.codex/rules/tyou-dev/prefab-workflow.md` | `.codex/rules/tyou-dev/prefab-mcp.md` |
| AI 创建 Prefab/MCP | `.codex/rules/tyou-dev/prefab-mcp.md` | `.codex/rules/tyou-dev/prefab-workflow.md` |
| 命名/生成规范 | `.codex/rules/tyou-dev/naming-rules.md` | `.codex/rules/tyou-dev/ui-patterns.md` |
| OpenSpec 工作流 | `.codex/rules/tyou-dev/openspec-workflow.md` | `Books/AI-Development-Workflow.md` |
| Codex memory 工作流 | `.codex/rules/tyou-dev/memory-workflow.md` | `.codex/memory/INDEX.md`, `.agents/skills/tyou-dev/templates/memory-*.md` |
| Codex 可观测性/run-report/sensors | `.codex/rules/tyou-dev/openspec-workflow.md` | `.agents/skills/tyou-dev/templates/run-report.md`, `.agents/skills/tyou-dev/scripts/codex-observability-check.ps1` |
| 工作流容错/Wiki 文档同步 | `.agents/skills/wiki-sync/SKILL.md` | `.codex/rules/tyou-dev/workflow-recovery.md`, `wiki-query`, `wiki-sync.yaml` |
| 排障 | `.codex/rules/tyou-dev/troubleshooting.md` | 相关源码 |

## 实施节奏

1. 判断 L1-L4。
2. 会话开始处理 L2+ 任务前，先读 `.codex/memory/INDEX.md`，再按任务类型读取相关 1-3 条 memory；遇到符合条件的可复用信息时按 `.codex/rules/tyou-dev/memory-workflow.md` 直接归档。
3. L2+ 先按 `.codex/rules/tyou-dev/openspec-workflow.md` 检查 OpenSpec；没有初始化就等待开发者确认。
4. 读取最少规则主题。
5. 优先用 `rg` 定位实际代码和调用样例；若 `rg` 不可用，改用 VS Code `grep_search` 或 PowerShell `Select-String`。
6. 修改前说明将改哪些文件。
7. 实施后运行能承受的校验：TypeScript 编译、相关脚本或静态搜索。
8. L2 先判轻量/重量：轻量 L2 只写最小 schema 兼容 artifact，重量 L2 保持当前保护；不确定或风险扩大时升级。L3/L4 OpenSpec change 维护带 `## Executive Summary` 的 `openspec/changes/<change-name>/run-report.md`，只记录验证结论、关键决策和风险，并运行 `.agents/skills/tyou-dev/scripts/codex-observability-check.ps1` 作为 review 辅助。
9. 汇报改动、流程、验证结果。

## 任务结束自检

收尾前统一问四件事，不需要全部”是”，但必须明确”不需要”与”已完成”的区别：

1. **规则是否要同步**：本次发现了代码与 `.codex/rules/**/*.md` 不一致、或实际行为与现有描述不同的场景吗？是则同步修改规则。
2. **Codex 工作流是否一致**：本次是否修改了 Codex 工作流规则、触发、路由、OpenSpec 入口、memory、Wiki 配置或结束自检？是则检查 `AGENTS.md`、`**/AGENTS.override.md`、`.agents/skills/*`、`.codex/rules/`、`.codex/memory/`、`wiki-sync.yaml`、`README.md`、`Books/AI-Development-Workflow.md` 与 `openspec/specs/` 是否一致。
3. **memory 归档是否完成**：本次符合写入条件的可复用信息是否已写入 `.codex/memory/<type>/` 并更新 `.codex/memory/INDEX.md`？无符合条件信息则不写。
4. **OpenSpec 是否要推进**：如果走了 change，对应 `tasks.md` 是否都勾选了？全绿且目标明确时直接 archive，只有 gate 不满足时才询问开发者。

在最终回复中用一句话说出这四项的结论。

## 框架代码修改规则

新增模块或修改 `ty-framework` 不属于普通业务开发。必须先问开发者是否确认，并说明：

- 为什么必须改框架而不是业务层实现。
- 会影响哪些现有模块和调用链。
- 是否需要修改 `Tyou.ts` 生命周期注册。
- 失败或回滚成本。

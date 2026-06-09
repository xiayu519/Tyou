---
name: tyou-dev
description: Tyou Cocos Creator 3.8.7 + TypeScript 客户端开发总入口。仅在任务涉及 Tyou/Cocos 客户端代码、tyou.*、UIWindow/UIBase/UIName/UIImportAll、资源索引/AssetIndexManager/addRef/decRef、Prefab/Scene/meta/asset-index/SpriteAtlas、Luban 配表、psd2ccc/uitscreate/assetool、Cocos 2D shader/.effect/Material、ty-framework、事件、战斗/ECS/小游戏运行时、Codex/OpenSpec/memory/wiki 工作流时激活；泛泛 TypeScript、文案、命令或非 Tyou 问题不因弱关联触发。
---

# Tyou 开发指导

本 skill 只做 Tyou 入口、主题路由和高风险提醒。详细主题参考在 `references/` 或对应专用 skill，按任务读取最少文件，再用源码和工具输出复核。

回归用例：`.agents/skills/tyou-dev/evals/evals.json`。

## 核心约束

1. 除 L1 外，实现类修改先确认 OpenSpec 可用并进入 change；L2+ 先读 `.codex/memory/INDEX.md`，只打开相关 1-3 条 memory。
2. 只读或实现时都按主题最小加载参考；不要整份复制 README/Books，不重复读取本会话已总结过的内容。
3. 源码和当前工具输出优先于参考、spec 和 memory；参考过期时按工作流同步修正。
4. `Client/assets/ty-framework/` 默认不改；确需改框架必须先说明原因、影响链路、生命周期注册和回滚成本，并得到确认。
5. UI 走 `UIWindow`、`@UIDecorator`、`UIName`、`UIImportAll`、`tyou.ui.showUIAsync`；资源走 `AssetIndexManager`、`tyou.res`、`addRef/decRef` 或自动 holder。
6. PSD/UI/资源索引优先复用 `Client/extensions` 工具链；Luban、Prefab、Scene、shader 等主题优先路由到专用 skill 或主题参考。
7. 修改 Codex 工作流、触发、路由、OpenSpec、memory、Wiki 配置或结束自检时，同一 change 检查入口、references、skills、memory、Books/README、wiki-sync 和 specs 是否一致。

## 主题路由

| 任务 | 必读 | 需要时再读 |
| --- | --- | --- |
| 架构/模块 API | `references/architecture.md` 或 `references/modules.md` | 对应源码 |
| UI 开发/命名 | `references/ui-lifecycle.md` | `references/ui-patterns.md`, `references/naming-rules.md` |
| 资源/索引/引用计数 | `references/resource-api.md` | `references/troubleshooting.md` |
| Prefab | `references/prefab-workflow.md` | `references/prefab-mcp.md`, `cocos-asset-json` |
| Scene | `references/scene-workflow.md` | `references/resource-api.md`, `references/architecture.md`, `cocos-asset-json` |
| Cocos 源资产解析/uuid/Atlas | `.agents/skills/cocos-asset-json/SKILL.md` | 相关 Prefab/Scene/资源参考 |
| Luban 配表 | `.agents/skills/luban-dev/SKILL.md` | `luban-config.md`, `Design/tools/genBin.bat` |
| Cocos 2D/Spine/序列帧 shader | `.agents/skills/tyou-shader-dev/SKILL.md` | 相关资源/Prefab/Scene 参考 |
| PSD/UI 生成工具 | `references/psd2ui-workflow.md` | `references/ui-patterns.md` |
| 事件系统 | `references/event-system.md` | `references/modules.md` |
| 战斗/ECS/小游戏性能 | `references/battle-design.md` | `references/modules.md` |
| OpenSpec/memory/observability | `references/openspec-workflow.md` 或 `references/memory-workflow.md` | run-report 模板、sensor 脚本 |
| Wiki/文档同步 | `.agents/skills/wiki-sync/SKILL.md` | `references/workflow-recovery.md`, `wiki-sync.yaml` |
| 排障 | `references/troubleshooting.md` | 相关源码 |

## 收尾

最终回复说明：参考是否同步、工作流是否一致、memory 是否需要归档、OpenSpec 是否已推进或归档；无符合条件的信息就不写 memory。

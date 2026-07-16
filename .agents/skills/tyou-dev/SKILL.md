---
name: tyou-dev
description: Tyou Cocos Creator 3.8.7 + TypeScript 客户端开发总入口。用于通用或跨领域的 Tyou 运行时代码、tyou.*、UI 生命周期、资源集成、Prefab/Scene 编辑流程、ty-framework、事件、战斗/ECS，以及本仓库 Codex 工作流或 Project Knowledge。任务若完全由 creator-extension-dev、cocos-asset-json、luban-dev、localization-dev、tyou-shader-dev、wiki-query 或 wiki-sync 覆盖，则只用专项 skill；同时涉及其范围外的通用运行时或框架集成时再组合 tyou-dev。泛泛 TypeScript、文案、命令或非 Tyou 问题不触发。
---

# Tyou 开发指导

本 skill 只负责 Tyou 主题路由、项目 API 入口和渐进加载。常驻红线、SDD 摘要和通用收尾以根 `AGENTS.md` 为准；详细知识位于 `references/` 或专项 skill。

## 开始任务

1. 根据下表只读取当前任务必要的 1-2 个 reference；专项 skill 已覆盖细节时不要重复加载总入口 reference。
2. 执行模式需要对齐时完整读取 `sdd-explore/references/alignment-contract.md` 并使用 `sdd-explore`。
3. Project Knowledge 可能影响判断时先读 `.codex/memory/INDEX.md`，再打开最多 1-3 条正文；stale-prone 事实必须复核。
4. 修改 Codex 工作流时读取 `references/codex-native-workflow.md`；修改 skill metadata 时使用 `skill-creator`，同步文档时使用 `wiki-sync`。

## 核心约束

1. 源码和当前工具输出高于 reference、Books 和 Project Knowledge。只读评审或诊断只报告发现的过期内容；实施任务仅同步由本次改动直接影响、且位于已批准范围内的 reference。
2. UI 走 `UIWindow`、`@UIDecorator`、`UIName`、`UIImportAll`、`tyou.ui.showUIAsync`；资源走 `AssetIndexManager`、`tyou.res`、`addRef/decRef` 或自动 holder。
3. Creator 扩展实现使用 `creator-extension-dev`；只运行扩展生成链路时不要误改扩展本体。
4. 验证选择目标测试、构建、静态检查、资源解析或生成器入口，不用文档结构检查替代行为验证。

## 主题路由

| 任务 | 必读 | 需要时再读 |
| --- | --- | --- |
| 架构/模块 API | `references/architecture.md` 或 `references/modules.md` | 对应源码 |
| UI 开发/生命周期/命名 | `references/ui-lifecycle.md` | `references/ui-patterns.md`, `references/naming-rules.md` |
| 资源/索引/引用计数 | `references/resource-api.md` | `references/troubleshooting.md` |
| 对象池/池化节点回收 | `references/pool-api.md` | `references/resource-api.md`, `references/prefab-workflow.md` |
| Prefab | `references/prefab-workflow.md` | `references/prefab-mcp.md`, `cocos-asset-json` |
| Scene | `references/scene-workflow.md` | `references/resource-api.md`, `references/architecture.md`, `cocos-asset-json` |
| Cocos 源资产 JSON/uuid/Atlas | `.agents/skills/cocos-asset-json/SKILL.md` | 相关 Prefab/Scene/资源参考 |
| Luban 配表 | `.agents/skills/luban-dev/SKILL.md` | `references/luban-config.md`, `Design/tools/genBin.bat` |
| 多语言/i18n | `.agents/skills/localization-dev/SKILL.md` | `.agents/skills/luban-dev/SKILL.md` |
| Cocos 2D/Spine/序列帧 shader | `.agents/skills/tyou-shader-dev/SKILL.md` | 相关资源/Prefab/Scene 参考 |
| Creator 编辑器扩展 | `.agents/skills/creator-extension-dev/SKILL.md` | 目标扩展源码与 `package.json` |
| PSD 到 UI 的使用流程 | `references/psd2ui-workflow.md` | `references/ui-patterns.md` |
| 事件系统 | `references/event-system.md` | `references/modules.md` |
| 战斗/ECS/小游戏性能 | `references/battle-design.md` | `references/modules.md` |
| Cocos TypeScript 规范 | `references/typescript-code-style.md` | 本次运行时源码；Web 专项再查最终构建产物 |
| Codex 工作流与 Project Knowledge | `references/codex-native-workflow.md` 或 `references/memory-workflow.md` | `.codex/memory/INDEX.md` |
| 需求/方案/颗粒度/范围对齐 | `.agents/skills/sdd-explore/SKILL.md` | `sdd-explore/references/alignment-contract.md` |
| Wiki 查询/同步 | `.agents/skills/wiki-query/SKILL.md` 或 `.agents/skills/wiki-sync/SKILL.md` | `references/workflow-recovery.md`, `wiki-sync.yaml` |
| 排障 | `references/troubleshooting.md` | 相关源码 |

## 收尾

1. 按根 `AGENTS.md` 与目标 reference 运行本次任务的真实验证；专项 checker 只接收本次明确文件。
2. 源码或工具行为变化时同步对应 reference；使用过 `.codex/work/<task>.md` 时在任务完成后删除。

---
name: creator-extension-dev
description: Tyou Cocos Creator 3.8.7 编辑器扩展开发 skill。修改或审查 `Client/extensions/`、`assetool`、`psd2ccc`、`uitscreate`、`asset-dependency-viewer`、Creator panel/message/menu/scene/assets contribution、扩展 package/build/test 时使用；不用于只运行扩展、使用生成产物或普通游戏运行时代码。
---

# Creator Extension Dev

用于安全修改 Tyou 的 Cocos Creator 编辑器扩展。先判断任务是否真的需要改扩展本体，再按目标 package 的真实入口和脚本实施、验证。

## 工作流

1. 读取 `Client/extensions/AGENTS.override.md`、目标扩展的 `package.json` 和 `references/workflow.md`。
2. 区分以下场景：
   - 修改扩展源码、Creator contributions、构建或测试：继续本 skill。
   - 只运行扩展生成 UI、资源索引或代码：回到对应使用流程，不修改扩展。
   - 修改普通游戏运行时代码：回到 `tyou-dev`。
3. 从 `package.json` 确认 `main`、panels、messages、menu、scene、assets、hierarchy 和 scripts，只读取受影响实现。
4. 分析扫描、索引、监听、定时器和 Creator 事件订阅的启停与释放。分析类工具必须由用户显式开启；关闭后零持续扫描、零监听、零定时任务。
5. 修改源文件，不修改 `library/`、`temp/`、`build/` 或其他 Creator 生成缓存；不要依赖未公开的编辑器 DOM。
6. 运行目标 package 提供的实际 `npm run build` 或 `npm test`。如果行为只能在 Creator 内确认，明确列出人工验证步骤和当前未验证风险。

## 边界

- `assetool` 会影响 `asset-index.json` 生成链路。
- `psd2ccc` 会影响 PSD 到节点树、Prefab 与图集分析链路。
- `uitscreate` 会影响 `UIName.ts`、`UIImportAll.ts` 等 UI 代码生成链路。
- `asset-dependency-viewer` 涉及项目扫描、引用索引和监听，必须保留显式 enable/disable 与失败恢复。
- 改动生成格式时同时检查消费者、兼容性、回滚和已有测试，不直接手修生成产物。

## 收尾

报告修改的扩展入口、运行的 build/test、是否需要重启 Creator、是否还需 Creator 内人工验证，以及对生成产物或业务代码的影响。

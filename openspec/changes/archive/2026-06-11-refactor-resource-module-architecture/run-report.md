# Codex Run Report

## Executive Summary

- Goal: 重构 `ResourceModule` / `LoaderManager` 内部结构，保留 `tyou.res.*` 功能和 asset-index 逻辑名加载。
- Current state: validated
- Validation: 资源模块实现已完成；资源模块静态断言通过；项目级 `tsc --skipLibCheck` 未发现 loader 新错误，但仍有既有业务/扩展类型错误。
- Remaining risk: 未在 Cocos Creator 运行时真机验证 bundle/资源加载；当前验证以 TypeScript 与静态结构检查为主。

## Change

- Change: `refactor-resource-module-architecture`
- Task level: `L4`
- Date: `2026-06-11`

## Framework Edit Justification

- 必须修改框架而不是业务层：冗余和性能路径位于 `Client/assets/ty-framework/module/loader/`，业务侧只通过 `tyou.res.*` 使用资源模块。
- 影响模块：`ResourceModule.ts`、`LoaderManager.ts`、新增 loader 内部 service 文件；间接受影响 `Tyou.ts` 的 `res` 生命周期调用。
- 主要调用链：`Main.ts` 预加载 bundle/资源，`TableModule.ts` 加载配表，`SceneModule.ts` 加载场景，`AudioModule.ts` 加载音频，`UIBase.ts` / `UIWindow.ts` 加载动态 UI 资源，`NodePool.ts` 加载 Prefab，`ResourceHolder.ts` / `SpineHolder.ts` 自动释放。
- 生命周期入口：`ResourceModule.onCreate()` 初始化 asset-index，`onUpdate(dt)` 驱动延迟释放，`onDestroy()` 清理待释放资源。
- 回滚策略：若新 service 主路径验证失败，优先让 `ResourceModule` 回退到旧 `LoaderManager` 路径；若仅 `.meta` 删除产生 Cocos 资源数据库风险，则恢复 `LoaderManager.ts` 为最小兼容文件。

## Decisions

- 删除旧 `tyou.res.loader` 主路径：静态搜索显示业务没有直接依赖，旧入口是内部绕行和冗余来源。
- 保留 `AssetIndexManager` 入口：`initFromBundle("asset-catalog", "asset-index")`、bundle 列表和 preload 标记列表不纳入重构。
- 拆分服务但不新增第三方依赖：保持 Cocos Creator 3.8.7 + TypeScript 原有运行环境。
- 保留 `tyou.res.releaseAll()` 的既有托管缓存释放语义：避免把未使用旧 API 突然扩大为直接释放整个 bundle。

## Validation

| Check | Result | Conclusion |
| --- | --- | --- |
| `rg tyou.res / LoaderManager` | pass | 业务调用集中在 `tyou.res.*`，旧 `LoaderManager` 入口只在 loader 模块内部出现。 |
| asset-index boundary check | pass | `AssetIndexManager.instance.initFromBundle("asset-catalog", "asset-index")`、`getBundlesFromAssetIndex()`、`getPreloadListFromAssetIndex()` 保持为不可改边界。 |
| `Client\node_modules\.bin\tsc.cmd --noEmit -p Client\tsconfig.json --skipLibCheck` | warn | 未出现 `Client/assets/ty-framework/module/loader` 新错误；命令仍因既有 `RPViewComp.ts`、Luban `ByteBuf.ts`、`psd2ccc` Node 类型等问题失败。 |
| resource static assertions | pass | 索引解析、`/spriteFrame` 后缀、in-flight 合并、缓存、`SceneAsset` guard、延迟释放、bundle reload、Sprite token 均存在。 |
| `.agents/skills/tyou-dev/references/resource-api.md` sync | pass | 已从旧 `ResourceModule.getInfo()` 描述同步为 `AssetPathResolver` 与新 service 结构。 |

## Sensors

| Sensor | Result | Notes |
| --- | --- | --- |
| `codex-observability-check.ps1` | warn | `pass=8 warn=1 fail=0`；唯一 warning 是已授权的 `Client/assets/ty-framework/module/loader/` 受保护路径改动。 |

## Risks

- Remaining risks:
  - 仍建议在 Cocos Creator 内做一次真实资源加载 smoke test，覆盖首包索引、bundle、UI 动态贴图和释放队列。
- Follow-up:
  - 如后续真机发现 Creator 对新增 `.meta` 或旧 `LoaderManager.ts` 瘦身有额外要求，再做小补丁。

## Correction Loop

- Memory updated: `no`
- Wiki/docs sync needed: `no`
- OpenSpec archive ready: `yes`

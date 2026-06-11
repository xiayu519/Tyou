## Why

`ResourceModule` 与 `LoaderManager` 当前职责重复，并且通过 `tyou.res.loader` 互相绕回调用，导致资源加载、缓存、bundle 管理和释放行为难以理解、验证和优化。现在需要在不破坏现有 `tyou.res.*` 行为、不改变 Tyou 核心资源索引特色的前提下，重构出更清晰、高性能、可维护的资源架构。

## What Changes

- 将资源模块内部重构为职责明确的小服务，覆盖资源索引解析、资源类型映射、bundle 操作、托管资源加载、延迟释放、Sprite 异步赋值、Prefab 实例化和 Spine 赋值。
- 替换内部 `tyou.res.loader` / `new LoaderManager.Loader()` 调用链，改为 `ResourceModule` 直接组合新服务。
- 保留当前框架和业务代码使用的 `tyou.res.*` 公共 API，包括 callback 与 Promise 入口。
- 保留字符串资源名的 asset-index 语义，包括通过 `AssetIndexManager` 查询逻辑名、`SpriteFrame` 自动追加 `/spriteFrame`、索引缺失诊断、未知类型降级。
- 保留托管资源缓存、并发加载合并、引用计数、延迟释放、远程加载、bundle reload/remove、Prefab `ResourceHolder`、Spine `SpineHolder`、异步 Sprite 防旧请求覆盖等行为。
- 删除或瘦身迁移后不再使用的旧 `LoaderManager` 内部实现。
- 不做的事：不修改 `asset-index.json` 格式、`AssetIndexManager` 加载流程、`assetool` 生成规则、业务资源名、Prefab/meta 文件或 `Tyou.ts` 模块注册形态。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `runtime-resource-safety`：补充资源模块重构期间必须保持稳定的运行时契约，包括索引逻辑名加载、托管缓存与并发合并、延迟释放、bundle 操作和异步赋值安全。

## Impact

- 预计影响 `Client/assets/ty-framework/module/loader/` 下的框架文件，重点是 `ResourceModule.ts`、`LoaderManager.ts`，以及必要的新内部 service 文件。
- 现有调用点位于 `Client/assets/ty-framework/Tyou.ts`、`Main.ts`、`TableModule.ts`、`SceneModule.ts`、`AudioModule.ts`、`UIBase.ts`、`UIWindow.ts`、`NodePool.ts`、`ResourceHolder.ts`、`SpineHolder.ts` 和 `Scene.ts`，这些调用点应继续使用 `tyou.res.*`。
- `Client/assets/ty-framework/` 是受保护框架目录，本次将其纳入范围是因为冗余来自框架资源基础设施而不是业务层；开发者已明确授权资源模块重构，同时要求旧功能正常且 asset-index 加载绝对不变。
- 运行时风险集中在资源引用计数、重复并发加载、bundle reload/remove、远程图片加载和 UI 动态资源释放；归档前验证必须覆盖这些行为。

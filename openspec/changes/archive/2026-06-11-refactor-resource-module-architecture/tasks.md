## 1. 盘点与保护边界

- [x] 1.1 重新盘点 `tyou.res.*`、`tyou.res.loader`、`LoaderManager`、`new LoaderManager`、`LoaderManager.Loader` 的全部调用点，确认真实迁移范围。
- [x] 1.2 在 `run-report.md` 记录本次修改 `Client/assets/ty-framework/` 的必要性、影响模块、调用链、生命周期入口和回滚策略。
- [x] 1.3 确认 `AssetIndexManager.instance.initFromBundle("asset-catalog", "asset-index")`、`getBundlesFromAssetIndex()`、`getPreloadListFromAssetIndex()` 的行为不进入重构范围。

## 2. 新内部结构

- [x] 2.1 新增资源请求/回调相关内部类型，统一描述 `path`、`bundle`、`version`、`type`、`onProgress`、`onComplete`。
- [x] 2.2 实现 `AssetTypeRegistry`，集中维护索引类型字符串到 Cocos 资源类型的映射。
- [x] 2.3 实现 `AssetPathResolver`，保留字符串逻辑名走 `AssetIndexManager`、`SpriteFrame` 追加 `/spriteFrame`、缺失索引和未知类型兜底的现有语义。
- [x] 2.4 实现 `BundleService`，承接 bundle load/reload/remove/release/releaseUnused/getBundle 行为和小游戏特殊逻辑。
- [x] 2.5 实现 `ManagedAssetLoader`，承接单资源、目录资源、远程资源、preload/preloadDir 的缓存、并发合并、callback fan-out 和托管引用。
- [x] 2.6 实现 `ReleaseScheduler`，承接 `addRef`、`decRef`、延迟释放队列、配置开关、强制释放和缓存释放回调。
- [x] 2.7 实现 `SpriteAssignService`，承接 `setSpriteAsync` 的 WeakMap request token 和远程图片 SpriteFrame 创建。

## 3. ResourceModule 迁移

- [x] 3.1 将 `ResourceModule` 改为组合新 services，并保留 `Tyou.ts` 现有 `res: ResourceModule` 生命周期入口。
- [x] 3.2 保留 `loadAssetAsync`、`loadDirAsync`、`loadRemoteAsync`、`preload`、`preloadDir`、`loadBundle`、`loadBundleAsync`、`reloadBundleAsync`、`removeBundle`、`release`、`releaseAll`、`releaseUnused`、`getBundle` 的现有门面方法和参数兼容。
- [x] 3.3 保留 `loadGameObjectAsync`、`loadSprite`、`loadAtlas`、`loadPlistAtlas`、`loadSpriteFromAtlas`、`setSpriteAsync`、`loadSpineAsync`、`loadSpineEffectAsync` 的现有行为。
- [x] 3.4 保留 `setReleaseConfig`、`setDelayReleaseEnabled`、`getPendingReleaseCount`、`forceReleaseAllPending`、`addRef`、`decRef` 的现有行为。
- [x] 3.5 确保 `onCreate()` 初始化 asset-index，`onUpdate(dt)` 驱动延迟释放，`onDestroy()` 清理待释放资源。

## 4. 旧 LoaderManager 路径收束

- [x] 4.1 移除 `ResourceModule.loader` 和 `new LoaderManager.Loader()` 主路径，不再通过 `tyou.res.loader` 内部绕行。
- [x] 4.2 删除 `LoaderManager.ts` / `LoaderManager.ts.meta` 或将其瘦身为无旧逻辑的内部兼容文件，并清理所有 import。
- [x] 4.3 再次静态搜索确认没有业务或框架代码依赖旧 `LoaderManager` 入口。

## 5. 验证

- [x] 5.1 运行可用的 TypeScript/构建检查，确认资源模块拆分后无编译错误。
- [x] 5.2 静态验证 `loadAssetAsync("逻辑名")`、`loadSprite("逻辑名")`、`preload("逻辑名")` 仍经过 `AssetPathResolver` 与 `AssetIndexManager`。
- [x] 5.3 验证并发同 key 加载只触发一次底层加载，所有调用者都收到结果。
- [x] 5.4 验证缓存命中、无效缓存清理、`SceneAsset` 不长期托管、`loadDirAsync` 结果返回和远程资源加载。
- [x] 5.5 验证 `ResourceHolder`、`SpineHolder`、`UIBase.addAutoReleaseAsset`、`addRef/decRef` 与延迟释放队列配对行为。
- [x] 5.6 验证 `loadBundle`、`reloadBundleAsync`、`removeBundle`、`releaseAll`、`releaseUnused` 行为未被破坏。
- [x] 5.7 验证 `setSpriteAsync` 旧请求不会覆盖新请求，目标销毁时不会赋值。

## 6. 文档与收尾

- [x] 6.1 如实际行为描述有变化，同步 `.agents/skills/tyou-dev/references/resource-api.md`；若仅内部结构变化则记录无需同步原因。
- [x] 6.2 更新 `run-report.md` 的验证结论、关键风险和剩余风险。
- [x] 6.3 运行 OpenSpec 状态检查和 L3/L4 可观测性 sensor，确认 change 可 review。

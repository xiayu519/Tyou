## Context

当前资源模块的主要问题不是单个函数复杂，而是职责边界错位：

- `ResourceModule.ts` 同时承担 `tyou.res.*` 门面、asset-index 解析、类型映射、Prefab/Spine/Sprite 辅助、引用计数和延迟释放。
- `LoaderManager.ts` 同时包含低层 Cocos `assetManager` 调用、高层缓存、并发加载合并、bundle reload/remove、远程资源加载，以及未被业务直接使用的 `setFont` / `setSprite` / `setSpine` 旧入口。
- `ResourceModule` 内部既持有 `loader: LoaderManager = new LoaderManager()`，又持有 `_loader = new LoaderManager.Loader()`；而 `LoaderManager.Loader` 内部又通过 `tyou.res.loader` 回到外层 loader，形成绕行。
- 静态搜索显示业务和框架调用点集中在 `tyou.res.*`，没有直接依赖 `tyou.res.loader`、`new LoaderManager()` 或 `LoaderManager.Loader` 的业务调用。

`Client/assets/ty-framework/` 属于受保护框架代码。本次必须修改框架而不是业务层，因为冗余、性能路径和生命周期边界都位于资源模块内部；开发者已明确授权资源模块重构，并给出底线：旧功能正常、索引加载绝对不能变。

`Tyou.ts` 生命周期影响：

- `Tyou.ts` 继续实例化 `res: ResourceModule = new ResourceModule()`。
- `ResourceModule.onCreate()` 继续初始化类型映射和 `AssetIndexManager.instance.initFromBundle("asset-catalog", "asset-index")`。
- `ResourceModule.onUpdate(dt)` 继续驱动延迟释放检查。
- `ResourceModule.onDestroy()` 继续清理待释放队列。

## Goals / Non-Goals

**Goals:**

- 保留当前 `tyou.res.*` 公共 API 和已知调用点行为。
- 让字符串资源名继续先走 `AssetIndexManager.instance.getAssetInfo(name)`，并保留当前缺失索引与未知类型的诊断/兜底语义。
- 将资源模块拆成清晰的内部服务，避免 `tyou.res.loader` 与 `LoaderManager.Loader` 的循环依赖。
- 保留并发加载合并、资源缓存、托管引用计数、延迟释放、远程加载、bundle reload/remove、Prefab/Spine 自动释放辅助和 Sprite 异步防串图。
- 删除或瘦身未使用的旧 `LoaderManager` 入口，减少公共表面积和维护成本。
- 提升可读性和性能稳定性：统一 key 生成、统一 Promise/callback 分发、避免重复 Map 扫描和绕行调用。

**Non-Goals:**

- 不修改 `AssetIndexManager` 的初始化入口、索引数据结构和查询语义。
- 不修改 `asset-index.json`、`assetool` 生成规则、资源命名规则或 bundle 目录结构。
- 不修改业务调用方式，不要求业务从 `tyou.res.*` 迁移到新 API。
- 不修改 Prefab、Scene、meta 或 Luban 生成数据。
- 不引入新的第三方依赖。

## Decisions

### 1. `ResourceModule` 保持门面，内部改为服务组合

`ResourceModule` 继续作为 `Tyou.ts` 暴露的唯一资源模块，对外保留 `tyou.res.*`。内部组合以下服务：

- `AssetTypeRegistry`：维护 `Prefab`、`SpriteFrame`、`SpriteAtlas`、`AudioClip`、`JsonAsset`、`Font`、`TextAsset`、`AnimationClip`、`SceneAsset`、`sp.SkeletonData`、`BufferAsset` 等类型映射。
- `AssetPathResolver`：把字符串逻辑名或完整参数解析成 `{ path, bundle, version, type, onProgress, onComplete }`；字符串路径唯一入口仍是 `AssetIndexManager`。
- `BundleService`：封装 `getBundle`、`loadBundle`、`loadBundleAsync`、`reloadBundleAsync`、`removeBundle`、`release`、`releaseAll`、`releaseUnused`。
- `ManagedAssetLoader`：封装 `loadAssetAsync`、`loadDirAsync`、`preload`、`preloadDir`、`loadRemoteAsync` 的缓存、并发合并、回调分发和引用计数接入。
- `ReleaseScheduler`：封装 `addRef`、`decRef`、延迟释放队列、`setReleaseConfig`、`setDelayReleaseEnabled`、`getPendingReleaseCount`、`forceReleaseAllPending`。
- `SpriteAssignService`：封装 `setSpriteAsync` 的 WeakMap request token，防止旧异步请求覆盖新 Sprite。
- Prefab/Spine helper 可先留在 `ResourceModule`，因为它们是薄门面；若实现中仍显臃肿，再抽成 `PrefabFactory` / `SpineAssignService`。

备选方案是保留 `LoaderManager` 做底层服务，再只改 `ResourceModule`。不采用该方案，因为旧文件本身已经混合了底层加载、高层缓存和 UI/Spine 旧 helper，继续保留会把冗余留在核心路径。

### 2. 移除 `tyou.res.loader` 作为内部主路径

实现时删除 `ResourceModule.loader` 公开属性和 `new LoaderManager.Loader()` 依赖，改为 `ResourceModule` 直接调用内部 services。当前搜索未发现业务直接使用旧入口，因此不为 `tyou.res.loader` 做兼容层。

备选方案是保留一个 deprecated `loader` 代理以防隐藏调用。暂不采用，因为开发者明确表示不需要兼容没有用的旧东西；若验证中发现真实调用，再只为该调用保留最小转发。

### 3. `AssetIndexManager` 只读接入，不改变特色路径

`AssetPathResolver` 必须保留当前字符串解析行为：

- `loadAssetAsync("Name")`、`preload("Name")`、`loadSprite("Name")`、`loadAtlas("Name")` 等字符串入口走 `AssetIndexManager.instance.getAssetInfo(name)`。
- 命中索引时使用 `info.path`、`info.bundle`、`info.type`。
- `SpriteFrame` 类型自动追加 `/spriteFrame`。
- 未命中索引时输出 `[ResourceModule] Asset index missing: <name>` 并按原名兜底为 `Asset`。
- 未知 `info.type` 时输出 warning 并降级为 `Asset`。
- 传完整 `{ path, bundle, type }` 参数时仍允许绕过逻辑名，兼容配表等明确路径加载。

备选方案是让所有调用都强制索引命中。暂不采用，因为这会改变当前容错行为，可能破坏已有调试/兜底路径。

### 4. 用统一 load key 和 pending promise 合并替代 `Command`

`ManagedAssetLoader` 使用稳定 key：`bundle || "resources"`、`type.name || "Asset"`、`path`、`version || ""`、加载类别共同组成。每个 key 对应：

- `cache: Map<string, Asset | Asset[]>`
- `pending: Map<string, PendingLoad<T>>`

同 key 重复加载时复用同一个底层 Cocos 加载请求，后续调用只挂接 progress/complete 或 await 同一 Promise。完成后非 `SceneAsset` 资源进入托管缓存，并通过 `ReleaseScheduler.addRef(asset)` 增加托管引用。

备选方案是继续使用旧 `Command` 对象池。暂不采用，因为对象池收益很小，但隐藏了回调生命周期；统一 Promise + callback fan-out 更容易验证和维护。

### 5. 延迟释放从加载器中独立出来

`ReleaseScheduler.decRef(asset)` 继续先对有效资源执行一次 `asset.decRef()`，再根据配置加入待检查队列。`onUpdate(dt)` 到达检查间隔后，只在资源有效、`refCount === 0` 且超过延迟时间时通知 `ManagedAssetLoader.releaseCache(asset)` 并释放缓存引用。

备选方案是释放时直接调用 Cocos release。暂不采用，因为当前项目已经依赖“先 decRef，延迟确认 refCount 归零再释放”的安全策略。

### 6. Bundle 逻辑集中到 `BundleService`

`BundleService` 保留当前小游戏环境逻辑：

- `MINIGAME` 下远程 bundle 只更新资源数据，不更新脚本。
- 本地 bundle 版本不同时先加载本地脚本，再 reload 远程资源数据。
- `reloadBundleAsync` 继续下载 `config.<version>.json`，清理旧 config 缓存，释放并移除旧 bundle，再初始化新 `AssetManager.Bundle`。

备选方案是重写 bundle reload 策略。暂不采用，因为这属于运行环境兼容行为，超出本次“结构优化但功能不变”的目标。

## Risks / Trade-offs

- [Risk] 删除 `tyou.res.loader` 后存在未被 `rg` 搜到的动态调用。→ Mitigation：实施前后再次搜索 `loader`、`LoaderManager`、`tyou.res["loader"]` 等模式；若发现真实调用，改调用点到 `tyou.res.*` 或提供最小内部转发。
- [Risk] 缓存 key 变化导致重复加载或资源无法释放。→ Mitigation：实现独立 key builder，并对单资源、目录资源、远程资源、SceneAsset 分别验证。
- [Risk] 引用计数迁移中 `addRef/decRef` 不配对，可能引发内存泄漏或贴图丢失。→ Mitigation：`ReleaseScheduler` 集中所有托管引用操作，禁止 service 私下直接 `asset.addRef()` / `asset.decRef()`；验证 `ResourceHolder`、`SpineHolder`、`UIBase.addAutoReleaseAsset` 调用链。
- [Risk] `loadDirAsync` 缓存数组和单资源缓存混用会改变返回结果。→ Mitigation：目录加载使用独立 key 前缀和结果缓存，不从单资源缓存反向拼装目录结果，除非行为验证完全等价。
- [Risk] `SpriteFrame` `/spriteFrame` 后缀漏加会破坏图片逻辑名加载。→ Mitigation：把后缀逻辑写在 `AssetPathResolver`，并列为必测点。
- [Risk] 删除 `LoaderManager.ts` 及 `.meta` 可能对 Cocos 资源数据库产生扰动。→ Mitigation：优先确认没有 import；删除时成对删除 `.ts` 与 `.ts.meta`。若 Cocos 对历史 uuid 有依赖，则改为保留文件但移除旧实现。
- [Risk] 结构拆分增加文件数。→ Mitigation：只按真实职责拆分，避免抽象过细；服务文件集中在 `module/loader/` 下。

## Migration Plan

1. 盘点 `tyou.res.*` 公共 API 和 `LoaderManager` 真实调用点，形成迁移清单。
2. 新增内部类型和 services，先不改变 `ResourceModule` 对外行为。
3. 将 `ResourceModule` 内部调用迁移到 services，保留所有旧 `tyou.res.*` 方法签名。
4. 用 `AssetPathResolver` 替换 `getInfo()`，确保字符串逻辑名走索引的行为不变。
5. 用 `ManagedAssetLoader` + `BundleService` 替换 `LoaderManager` 和 `LoaderManager.Loader` 主路径。
6. 用 `ReleaseScheduler` 接管延迟释放，并把 `onUpdate` / `onDestroy` 转发给 scheduler。
7. 删除或瘦身 `LoaderManager.ts` 及 `.meta`，并清理 import。
8. 运行 TypeScript/构建检查和静态搜索，重点验证索引加载、bundle 加载、preload、loadDir、remote、Prefab、Sprite、Spine、addRef/decRef。

Rollback 策略：如果迁移后核心验证失败，优先保留新 service 文件但让 `ResourceModule` 回退到旧 `LoaderManager` 路径；若失败集中在 `.meta` 删除，则恢复 `LoaderManager.ts` 为最小转发文件。

## Open Questions

无阻塞问题。开发者已确认可以替换 `LoaderManager` 旧结构，不需要兼容未使用旧入口；实施时若发现动态业务调用再局部调整。

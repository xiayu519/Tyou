# 资源加载与索引

## 核心文件

- `ResourceModule.ts`：资源加载门面，保留 `tyou.res.*` 对外 API。
- `AssetPathResolver.ts`：逻辑名/完整参数到实际加载参数的解析。
- `AssetTypeRegistry.ts`：索引类型字符串到 Cocos 资源类型的映射。
- `ManagedAssetLoader.ts`：托管资源缓存、并发加载合并、preload/remote/loadDir。
- `BundleService.ts`：bundle load/reload/remove/release 行为。
- `ReleaseScheduler.ts`：`addRef/decRef` 与延迟释放队列。
- `SpriteAssignService.ts`：异步 Sprite 设置与旧请求防覆盖。
- `AssetIndexManager.ts`：逻辑名到 path/bundle/type 的索引。
- `AssetIndexInfo.ts`：索引数据结构。
- `asset-index.json`：运行时资源索引。
- `AssetIndexGenerator.js`：编辑器扩展生成索引。
- `asset-index-config.json`：扫描规则。

## 资源索引规则

`AssetPathResolver` 如果收到字符串资源名，会调用：

```ts
const info = AssetIndexManager.instance.getAssetInfo(name);
```

再根据 `info.path / info.bundle / info.type` 生成实际加载参数，并交给 `ResourceModule`/`ManagedAssetLoader` 加载实际资源。

SpriteFrame 会自动补 `/spriteFrame`。

当前实现中，如果逻辑名没有命中索引，会输出 `[ResourceModule] Asset index missing: <name>`，并按传入名称兜底加载；如果索引类型不在 `_typeMap` 中，会输出 warning 并降级为 `Asset`。这只是容错诊断，不代表可以绕过资源索引流程。

资源必须避免同名。生成器内部用 `logicalNameSet` 检测重复名，重复时会追加 `_1` 等后缀，这会让业务侧逻辑名不稳定。发现同名资源时优先改资源名，而不是在代码里适配后缀。

## 红线

- IO/资源加载必须使用 `async/await`，禁止同步阻塞加载。

## 常用 API

```ts
await tyou.res.loadAssetAsync("AssetName");
await tyou.res.loadGameObjectAsync("PrefabName", parent);
await tyou.res.loadSprite("SpriteName");
await tyou.res.setSpriteAsync({ target: sprite, path: "SpriteName" });
await tyou.res.loadAtlas("AtlasName");
await tyou.res.loadSpriteFromAtlas("AtlasName", "spriteName");
tyou.res.preload("AssetName");
tyou.res.decRef(asset);
tyou.res.addRef(asset);
```

也可以传完整参数绕过逻辑名：

```ts
await tyou.res.loadAssetAsync({
    path: "game",
    bundle: "config",
    type: BufferAsset,
});
```

## 自动释放

- Prefab 实例：`loadGameObjectAsync` 会添加 `ResourceHolder`。
- Pool 节点池：`NodePool` 持有 Prefab 时必须由 Pool 生命周期管理，池销毁时通过 `tyou.res.decRef(prefab)` 配对释放；业务只归还节点，不手动释放池持有的 Prefab。
- UI 动态资源：用 `UIBase.addAutoReleaseAsset(asset)`，窗口关闭时 `decRef`。
- UIWidget 动态资源：用 `UIBase`/`UIWidget` 的资源 helper；列表 item 复用时会在 `UIWidget.recycle()` 中释放当前 item 动态资源，窗口关闭时会在 `release()` 中释放。
- UIWidget Prefab：`UIBase.loadWidgetAsync()` 加载的 prefab 节点归 Widget 托管；`UIWidget.release()` 会销毁该节点，Prefab 引用由节点上的 `ResourceHolder` 按资源生命周期释放。
- 配表加载后会对 `BufferAsset` 调用 `tyou.res.decRef(cfg)`。
- 远程图片：`setRemoteSpriteAsync` 通过 `setSpriteAsync({ url })` 生成托管 `SpriteFrame`，成功赋值后由 UI 自动释放集合负责 `decRef`。

## 生命周期契约

资源模块的核心规则是：成功拿到会长期使用的 `Asset` 后，必须进入一个明确的生命周期容器，或者由调用方在使用结束时手动 `tyou.res.decRef(asset)`。

- UI 窗口内加载的 `SpriteFrame`、`SpriteAtlas`、远程 `SpriteFrame`：放入 `UIBase.addAutoReleaseAsset()`，窗口释放时统一 `decRef`。
- 列表 item 或其它 `UIWidget` 内加载的 `SpriteFrame`、`SpriteAtlas`、远程 `SpriteFrame`：放入当前 widget 的自动释放集合；item 进入池、换 index 或 widget release 时释放，不等到父窗口关闭。
- 列表 item 或其它 `UIWidget` 内加载 Spine 时优先用 `this.loadSpineAsync()` / `this.loadSpineEffectAsync()`；这些 helper 传逻辑名走资源索引，并会把 `sp.SkeletonData` 放入当前 owner 的动态资源集合，recycle/release 时先清空 `Skeleton.skeletonData` 再 `decRef`。不要在可复用 item 里直接调用 `tyou.res.loadSpineAsync()`，它依赖节点上的 `SpineHolder`，节点进池不销毁时不会在 recycle 点释放。
- 场景生命周期内的动态资源：放入 `tyou.scene.addAutoReleaseAsset()` 或当前 `SceneBase.addAutoReleaseAsset()`，场景离开时释放。
- Prefab 实例：优先用 `tyou.res.loadGameObjectAsync()`，框架会给实例添加 `ResourceHolder`，节点销毁时释放 Prefab 资源。
- Pool Prefab：节点池加载 Prefab 后由池持有，`NodePool.destroy()` 负责释放 Prefab；租借出的节点用 `pool.release(node)` 或 `tyou.pool.releaseNode(node)` 归还，不在业务侧对 Prefab 调 `decRef`。
- Pool 动态视觉资源：普通 `NodePool` 只持有 Prefab，不会自动释放每次租借动态加载的 `SpriteFrame`、SpriteAtlas、序列帧或 `sp.SkeletonData`。逐节点资源由业务组件在归还前释放；池内高频共享资源可以由 Pool 的业务 owner 或上层模块持有，并在 Pool/模块销毁时统一释放。具体回收清单见 `pool-api.md`。
- 非复用节点上的 Spine 自动释放：可用 `tyou.res.loadSpineAsync()` / `tyou.res.loadSpineEffectAsync()` 的默认 `isAutoRelease = true`，由 `SpineHolder` 在节点销毁或特效播放结束时释放；可复用 `UIWidget` item 不走这条。
- 表格、音频等模块内部资源：模块自己持有缓存时，必须在移出缓存或模块销毁时成对 `decRef`。
- 只用于一次性解析的资源：解析完成后立即 `decRef`，例如配表 `BufferAsset` 读取到内存后释放源资源引用。

`tyou.res.setSpriteAsync()` 有异步覆盖保护：同一个 `Sprite` 的旧请求晚于新请求完成时，旧请求不会覆盖当前图；如果旧请求已经加载出 `SpriteFrame`，框架会释放这次未被赋值的资源。

`UIBase.setSpriteAsync()` / `setRemoteSpriteAsync()` 还会传入 owner epoch。若 `UIWidget` 已经 recycle/release，即使 Sprite 节点仍然有效，旧请求晚到也不会赋值到新 index，已加载资源会走 `tyou.res.decRef`。
`UIBase.loadSpineAsync()` / `loadSpineEffectAsync()` 同样使用 owner epoch 和目标请求序号；旧 Spine 请求晚到或同一 Skeleton 已有更新请求时，不会覆盖新内容，并会释放晚到的 `sp.SkeletonData`。

不要把 `releaseAll()` 当作业务生命周期的替代品。`releaseAll()` 用于清理资源模块的托管缓存和取消匹配的 in-flight 请求；正常 UI/Scene/Prefab 生命周期仍应靠自动释放容器或明确 `decRef` 配对。

## 资源索引生成

编辑器扩展 `assetool` 会：

1. 扫描 `assets/` 下 `meta.userData.isBundle === true` 的目录。
2. 排除 `resources`、`asset-catalog`。
3. 按 `resourceTypeMap` 收录资源类型。
4. 图片资源默认只收录 `l_` 前缀。
5. 输出到 `assets/asset-raw/asset-catalog/asset-index.json`。

### 图片 `l_` 前缀使用边界

`l_` 表示独立图片需要进入资源索引，供运行时通过逻辑名直接动态加载；它不是普通图片的默认命名前缀。

使用规则：

- 图片只作为 Prefab 的固定外观时，直接在 Prefab 中静态绑定 `SpriteFrame`，不添加 `l_`，也不额外写动态加载代码。
- 同一个 `Sprite` 需要按数据切换多张独立图片时，可以给这些图片添加 `l_`，并通过 `UIBase/UIWidget.setSpriteAsync()` 或对应资源 API 加载。
- 配置驱动选择、可选 Bundle 或确实需要延迟加载的独立图片，即使不是多图轮换，也可以使用 `l_`；使用前必须明确资源 owner 和释放点。
- 不要因为图片“可能以后会动态使用”就预先添加 `l_`，也不要给 Prefab 已静态引用的每张图片重复增加逻辑索引。
- 图片是否使用 `l_` 的判断标准是“业务是否需要按逻辑名直接加载”，不是图片大小、用途名称或是否位于 UI 目录。

SpriteAtlas 与序列帧规则：

- 序列帧来自 SpriteAtlas 时，优先索引和加载 Atlas，通过 Atlas 名与帧名取得 `SpriteFrame`，不要仅为逐帧访问给每张底图添加 `l_`。
- SpriteAtlas 的底图由 Atlas 管理；除非同一图片还需要脱离 Atlas 单独按逻辑名加载，否则底图不使用 `l_`。
- 动态加载的 Atlas 或从 Atlas 取得并额外持有的 `SpriteFrame` 必须进入明确 owner；UI/Widget 使用自动释放集合，普通池化业务按节点或 Pool 生命周期配对释放。
- 高频播放的池化序列帧可以由 Pool/模块预加载并共享，不要求每次租借和归还都重复加载卸载，但 Pool/模块销毁时必须释放。

Spine 资源索引规则：

- `.skel` 按 `resourceTypeMap` 直接索引为 `sp.SkeletonData`。
- 普通 `.json` 默认仍索引为 `JsonAsset`。
- Spine JSON 只有同时满足以下条件时才索引为 `sp.SkeletonData`：JSON 顶层有 `skeleton` 对象，并存在 `bones` 或 `slots` 数组；同目录有同名 `.atlas` 或 `.txt` atlas 侧车文件；同目录有至少一个同名图片侧车文件。
- 该判定是保守规则，目的是避免普通业务 JSON 被误判。若 Spine JSON 没有同名 atlas/图片侧车，优先调整资源命名或使用 `.skel`，不要把所有 `.json` 都改成 Spine 类型。

加载资源找不到或出现 `[ResourceModule] Asset index missing` 时，第一优先级是确认是否执行过 `assetool` 自动索引生成；不要手动编辑 `asset-index.json` 作为常规修复。

需要只读检查 `asset-index.json`、`.meta` uuid 或 SpriteAtlas `.plist/.plist.meta` 结构时，优先用 Cocos 源资产解析 skill：

```powershell
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py uuid-index --assets-root Client/assets
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py asset-index --file Client/assets/asset-raw/asset-catalog/asset-index.json
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py atlas --plist <atlas.plist> --meta <atlas.plist.meta>
```

该 helper 只读，不替代 `assetool` 生成索引。

## 引用计数配对

`addRef/decRef` 不是同一帧内粗暴同步释放。`decRef` 会加入 `_pendingReleaseQueue`，之后由 `onUpdate` 定期检查，满足延迟时间且 `refCount === 0` 才真正释放。

规则：

- 多调用 `decRef` 可能让仍在使用的资源进入释放路径，导致崩溃或显示异常。
- 少调用 `decRef` 会让资源长期保留，导致内存泄漏。
- 资源崩溃、贴图丢失、内存一直不卸载时，优先检查 `addRef/decRef` 是否配对，再看业务逻辑。
- UI 动态资源优先交给 `UIBase.addAutoReleaseAsset()`，不要分散手动 `decRef`。
- 列表 item、头像、图标等会复用节点的异步设图优先用 `UIWidget.setSpriteAsync()` / `setRemoteSpriteAsync()`，让旧请求完成后不覆盖最新 index，并让 item recycle 自动释放旧资源。

## 常见错误

- 新资源未进入索引：检查 bundle、扩展名、图片前缀、排除列表。
- 逻辑名重复：不要接受重复名，优先重命名资源并重新生成索引。
- 直接传不存在的逻辑名：当前会报错并按原名兜底加载，但业务仍应先查索引或使用 `AssetIndexManager.hasAsset`，不要把兜底当正常路径。

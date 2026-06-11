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
- UI 动态资源：用 `UIBase.addAutoReleaseAsset(asset)`，窗口关闭时 `decRef`。
- 配表加载后会对 `BufferAsset` 调用 `tyou.res.decRef(cfg)`。
- 远程图片：`setRemoteSpriteAsync` 通过 `setSpriteAsync({ url })` 生成托管 `SpriteFrame`，成功赋值后由 UI 自动释放集合负责 `decRef`。

## 生命周期契约

资源模块的核心规则是：成功拿到会长期使用的 `Asset` 后，必须进入一个明确的生命周期容器，或者由调用方在使用结束时手动 `tyou.res.decRef(asset)`。

- UI 窗口内加载的 `SpriteFrame`、`SpriteAtlas`、远程 `SpriteFrame`：放入 `UIBase.addAutoReleaseAsset()`，窗口释放时统一 `decRef`。
- 场景生命周期内的动态资源：放入 `tyou.scene.addAutoReleaseAsset()` 或当前 `SceneBase.addAutoReleaseAsset()`，场景离开时释放。
- Prefab 实例：优先用 `tyou.res.loadGameObjectAsync()`，框架会给实例添加 `ResourceHolder`，节点销毁时释放 Prefab 资源。
- Spine 自动释放：优先用 `loadSpineAsync()` / `loadSpineEffectAsync()` 的默认 `isAutoRelease = true`，由 `SpineHolder` 在节点销毁或特效播放结束时释放。
- 表格、音频等模块内部资源：模块自己持有缓存时，必须在移出缓存或模块销毁时成对 `decRef`。
- 只用于一次性解析的资源：解析完成后立即 `decRef`，例如配表 `BufferAsset` 读取到内存后释放源资源引用。

`tyou.res.setSpriteAsync()` 有异步覆盖保护：同一个 `Sprite` 的旧请求晚于新请求完成时，旧请求不会覆盖当前图；如果旧请求已经加载出 `SpriteFrame`，框架会释放这次未被赋值的资源。

不要把 `releaseAll()` 当作业务生命周期的替代品。`releaseAll()` 用于清理资源模块的托管缓存和取消匹配的 in-flight 请求；正常 UI/Scene/Prefab 生命周期仍应靠自动释放容器或明确 `decRef` 配对。

## 资源索引生成

编辑器扩展 `assetool` 会：

1. 扫描 `assets/` 下 `meta.userData.isBundle === true` 的目录。
2. 排除 `resources`、`asset-catalog`。
3. 按 `resourceTypeMap` 收录资源类型。
4. 图片资源默认只收录 `l_` 前缀。
5. 输出到 `assets/asset-raw/asset-catalog/asset-index.json`。

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
- 列表 item、头像、图标等会复用节点的异步设图优先用 `tyou.res.setSpriteAsync()` 或 `UIBase.setSpriteAsync()`，让旧请求完成后不覆盖最新 Sprite。

## 常见错误

- 新资源未进入索引：检查 bundle、扩展名、图片前缀、排除列表。
- 逻辑名重复：不要接受重复名，优先重命名资源并重新生成索引。
- 直接传不存在的逻辑名：当前会报错并按原名兜底加载，但业务仍应先查索引或使用 `AssetIndexManager.hasAsset`，不要把兜底当正常路径。

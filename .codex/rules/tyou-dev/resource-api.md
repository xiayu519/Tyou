# 资源加载与索引

## 核心文件

- `ResourceModule.ts`：资源加载门面。
- `AssetIndexManager.ts`：逻辑名到 path/bundle/type 的索引。
- `AssetIndexInfo.ts`：索引数据结构。
- `asset-index.json`：运行时资源索引。
- `AssetIndexGenerator.js`：编辑器扩展生成索引。
- `asset-index-config.json`：扫描规则。

## 资源索引规则

`ResourceModule.getInfo()` 如果收到字符串，会调用：

```ts
const info = AssetIndexManager.instance.getAssetInfo(name);
```

再根据 `info.path / info.bundle / info.type` 加载实际资源。

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

## 资源索引生成

编辑器扩展 `assetool` 会：

1. 扫描 `assets/` 下 `meta.userData.isBundle === true` 的目录。
2. 排除 `resources`、`asset-catalog`。
3. 按 `resourceTypeMap` 收录资源类型。
4. 图片资源默认只收录 `l_` 前缀。
5. 输出到 `assets/asset-raw/asset-catalog/asset-index.json`。

加载资源找不到或出现 `[ResourceModule] Asset index missing` 时，第一优先级是确认是否执行过 `assetool` 自动索引生成；不要手动编辑 `asset-index.json` 作为常规修复。

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

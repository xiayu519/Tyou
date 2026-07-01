## Context

当前资源模块的逻辑名解析只在 `loadAssetAsync("AssetName")` 这种字符串入口触发。`UIBase.assignSpineAsync()` 传入 `{path, type: sp.SkeletonData}`，会跳过 `AssetIndexManager`，因此无法使用 `asset-index.json` 里为 Spine 资源记录的 bundle、path 和 type。

当前 `assetool` 对资源类型的判断来自扩展名映射。`.skel` 会索引为 `sp.SkeletonData`，`.json` 会索引为 `JsonAsset`。Spine JSON 导出同样使用 `.json` 后缀，如果只把所有 `.json` 改成 Spine 会破坏普通业务 JSON。

## Goals / Non-Goals

**Goals:**

- 让 `UIBase` / `UIWidget` 的 Spine helper 使用逻辑名索引加载。
- 让本地 Spine JSON 导出可以被 `assetool` 索引为 `sp.SkeletonData`。
- 保持普通 `.json` 文件继续索引为 `JsonAsset`。
- 保持 `.skel` 二进制 Spine 的既有扫描方式。
- 不修改当前已生成的 `asset-index.json`，由开发者在 Cocos 编辑器内重新运行 `assetool` 生成。

**Non-Goals:**

- 不实现远端 Spine 加载。
- 不改变 `tyou.res.loadAssetAsync({ path, bundle, type })` 这种完整参数绕过索引的能力。
- 不改变普通 JSON、Luban 配表目录或远程图片加载行为。

## Decisions

### 1. UI Spine helper 改为字符串逻辑名加载

`assignSpineAsync()` 使用 `tyou.res.loadAssetAsync(path)`，让 `AssetPathResolver` 按逻辑名查 `AssetIndexManager`。这样与 `ResourceModule.loadSpineAsync()` 的现有行为一致，同时保留 owner epoch、request id、动态资源集合和 `decRef` 逻辑。

备选方案是在对象参数里手动查索引并补 bundle/type。这个方案会把索引解析逻辑复制到 UI 层，和 `AssetPathResolver` 职责冲突。

### 2. Spine JSON 判定使用内容和侧车文件双条件

`.json` 文件默认仍按 `resourceTypeMap.json` 输出 `JsonAsset`。只有同时满足以下条件时，生成器才把该 JSON 输出为 `sp.SkeletonData`：

- JSON 可以被解析。
- JSON 顶层包含 Spine skeleton 结构特征，例如 `skeleton` 对象，并存在 `bones` 或 `slots` 数组。
- 同目录存在同名 atlas 侧车文件：`<name>.atlas` 或 `<name>.txt`。
- 同目录存在至少一个同名贴图侧车文件：`<name>.png`、`<name>.jpg`、`<name>.jpeg`、`<name>.webp`、`<name>.bmp`、`<name>.tga`、`<name>.tif` 或 `<name>.tiff`。

这比只检查 JSON 字段更保守，能避免普通动画配置、状态机配置或业务 JSON 因偶然包含 `skeleton` 字段被误判。要求同名贴图会偏保守，但符合当前“不要影响正常 JSON 判断”的目标。

### 3. 不把 `.atlas` 作为单独可加载资源加入索引

`.atlas` 是 Spine JSON/SkeletonData 的侧车文件，不作为 `SpriteAtlas` 或普通 `TextAsset` 进入资源索引。`assetool` 只用它辅助判定同名 Spine JSON。

## Risks / Trade-offs

- [Risk] 有些 Spine 项目可能 atlas 或贴图文件不是严格同名。  
  Mitigation: 本次采用保守规则，避免误伤普通 JSON；不符合规则的资源可继续用 `.skel` 或后续明确配置化。

- [Risk] 只改生成器不会自动更新现有 `asset-index.json`。  
  Mitigation: 验证生成器逻辑后，由开发者在 Cocos 编辑器运行 `Tools -> Generate Asset Index`。

- [Risk] Cocos 对 Spine JSON import 的实际类型依赖编辑器导入设置。  
  Mitigation: 索引生成只标记逻辑类型；运行时仍通过 Cocos bundle load `sp.SkeletonData`，若导入资源本身不支持，需要在资源导入侧修正。

## Migration Plan

1. 修正 `UIBase.assignSpineAsync()` 加载入口。
2. 扩展 `AssetIndexGenerator.js` 的 `.json` 类型判定。
3. 同步资源参考文档。
4. 用静态搜索确认没有其它同类逻辑名绕索引用法。
5. 用 Node 脚本验证普通 JSON 与 Spine JSON 判定结果。

回滚时可以恢复 `assignSpineAsync()` 原加载表达式，并删除生成器的 Spine JSON 判定函数；普通 JSON 行为会回到扩展名映射。

## Open Questions

无。远端 Spine 另起 change 设计。

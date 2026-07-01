## Why

当前 `UIBase.loadSpineAsync()` / `loadSpineEffectAsync()` 内部用对象参数指定 `sp.SkeletonData`，会绕过资源索引，导致传逻辑名时无法使用 `asset-index` 中的 bundle、path 和类型信息。

同时 Spine 的 JSON 导出格式目前会按普通 `.json` 进入 `JsonAsset` 索引，框架只能稳定识别 `.skel` 二进制 Spine，不能在不影响普通 JSON 的前提下加载本地 Spine JSON。

## What Changes

- 修正 UI Spine helper 的资源加载方式，让它传字符串逻辑名并走 `AssetIndexManager` 解析。
- 搜索并确认是否存在其它同类 `loadAssetAsync({ path, type })` 逻辑名绕索引用法；只修正实际问题点。
- 扩展 `assetool` 索引生成器，对 `.json` 文件增加保守的 Spine JSON 判定。
- 只有 JSON 内容结构像 Spine skeleton，且同目录存在同名 `.atlas` 或 `.txt` atlas 与至少一个同名贴图侧车文件时，才把该 `.json` 索引为 `sp.SkeletonData`。
- 保持普通业务 `.json` 继续索引为 `JsonAsset`。
- 不实现远端 Spine 加载；远端 Spine 需要单独设计 skeleton、atlas、texture 的远程组装与生命周期。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `runtime-resource-safety`: 扩展本地 Spine 逻辑名加载和 Spine JSON 索引识别要求，同时保留普通 JSON 的 `JsonAsset` 行为。

## Impact

- 影响 `Client/assets/ty-framework/module/ui/UIBase.ts` 的 Spine helper 加载路径。
- 影响 `Client/extensions/assetool/editor/AssetIndexGenerator.js` 的 `.json` 类型判定逻辑。
- 影响 `.agents/skills/tyou-dev/references/resource-api.md` 中资源索引/Spine 说明。
- 不修改现有生成物 `asset-index.json`，实际项目索引更新仍由 Cocos 编辑器 `assetool` 生成。

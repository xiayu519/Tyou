## Why

当前业务需要从远端资源包加载 Spine，但现有 UI helper 只能按资源索引路径加载，无法显式确保 Spine 所在 bundle 按远端 bundle 方式加载。需要补齐一个小范围接口，让 Spine 仍走 Cocos `sp.SkeletonData` 依赖解析，而不是引入裸 `.json/.skel/.atlas/.png` 拼装。

## What Changes

- 新增资源模块远端 bundle Spine 加载接口，支持传入 Spine 逻辑名、bundle 名和 bundle version。
- 新增 UIBase 对应 helper，保持 owner epoch、请求序号和自动释放行为。
- 远端 bundle 加载复用 Cocos `Resource Server` / `assetManager.downloader.remoteServerAddress` / `bundleVers` 机制。
- 不新增裸 Spine 文件 URL 拼装能力，不新增 Tyou 独立 CDN 配置层。

## Capabilities

### New Capabilities
- `remote-bundle-spine-loading`: 支持 UI 和资源模块通过远端 bundle 加载并赋值 Spine `sp.SkeletonData`。

### Modified Capabilities

## Impact

- 影响 `Client/assets/ty-framework/module/loader/ResourceModule.ts` 和 `Client/assets/ty-framework/module/ui/UIBase.ts`。
- 保持现有 `loadSpineAsync` / `loadSpineEffectAsync` 兼容。
- 依赖 Cocos 构建面板的 `Resource Server` 和 Asset Bundle remote 配置，不改构建配置。

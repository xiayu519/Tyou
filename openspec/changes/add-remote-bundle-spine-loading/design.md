## Context

Tyou 的 Spine UI helper 目前通过 `tyou.res.loadAssetAsync(path)` 读取 `sp.SkeletonData`，资源定位依赖 `asset-index`。Cocos Creator 远端 bundle 的 CDN 根地址由构建面板 `Resource Server` 写入运行时 settings，并通过 `assetManager.downloader.remoteServerAddress` 生效。

本次改动会触及 `Client/assets/ty-framework/`，用户已明确要求新增远端加载 Spine 接口。实现必须保持现有资源引用计数和 UI owner epoch 防护。

## Goals / Non-Goals

**Goals:**
- 提供资源模块接口，允许调用方先加载指定远端 bundle，再按 `sp.SkeletonData` 加载 Spine。
- 提供 UIBase helper，支持在 UI 生命周期内安全赋值远端 bundle Spine，并自动释放。
- 保持普通 `loadSpineAsync` 和 `loadSpineEffectAsync` 现有行为不变。

**Non-Goals:**
- 不支持裸 `.json/.skel/.atlas/.png` URL 拼装。
- 不新增 Tyou 独立 CDN 配置层。
- 不修改 Cocos 构建配置、bundle `.meta` 或 asset-index 生成规则。

## Decisions

- 远端 Spine 按 bundle 加载：新增接口先调用 `loadBundleAsync({ bundle, version })`，再调用现有 `loadAssetAsync`。这样保留 Cocos 对 Spine atlas/texture 依赖的解析。
- API 接收逻辑资源名：Spine 资源仍由 `asset-index` 决定真实 `path/type/bundle`，调用方不需要知道 Cocos 导入后的内部资源。
- UIBase 复用现有 assign 流程：新增远端 helper 使用 owner epoch 和 per-Skeleton request id，避免 UI recycle/release 后旧请求覆盖新内容。

## Risks / Trade-offs

- 远端 bundle 未在 Cocos 构建面板标记为 remote 或未上传 CDN → 接口返回 null/false，由调用方看到加载失败日志。
- Resource Server 未配置或微信下载域名未配置 → Cocos 无法下载远端 bundle，本改动不绕过平台限制。
- 资源名不在 asset-index → 仍按现有 `loadAssetAsync` 容错路径处理，业务应优先重新生成 asset-index。

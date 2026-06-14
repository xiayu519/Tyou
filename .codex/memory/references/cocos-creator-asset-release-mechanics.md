---
type: reference
description: Cocos Creator 3.8.7 资源引用计数与释放底层机制参考
status: active
last_verified: 2026-06-14
source: codex-observed
---

# Cocos Creator 3.8.7 资源释放机制

本项目本机 Cocos 源码位于 `C:\ProgramData\cocos\editors\Creator\3.8.7\resources\resources\3d\engine\cocos`。

关键结论：

- `asset/assets/asset.ts` 中 `Asset.addRef()` 只递增 `_ref`。
- `Asset.decRef(autoRelease = true)` 会先在 `_ref > 0` 时递减；当 `autoRelease` 为 true 时调用 `assetManager.getReleaseManager().tryRelease(this)`。
- `asset/asset-manager/release-manager.ts` 中 `tryRelease(asset)` 非 force 模式会加入 `_toDelete`，再在 next tick 检查 `refCount` 和依赖图后释放。
- `assetManager.releaseAsset(asset)` 和 bundle `release(path, type)` 使用 force release，可能绕过仍在使用的资源引用，框架资源生命周期中不要把它当普通 `decRef` 替代品。
- `2d/components/sprite.ts` 的 `spriteFrame` setter、Spine `skeletonData` setter、AudioSource `clip` setter 不会自动为赋值资源 `addRef/decRef`；Tyou holder/UI/Audio/Pool 等生命周期容器必须自己配对。

Tyou 资源模块若需要保留框架层延迟释放窗口，应使用 `asset.decRef(false)` 降引用并自行观察稳定 `refCount === 0`，再触发 Cocos 正常非 force release。

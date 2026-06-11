## Context

`LoaderManager` 旧入口已经被 `ResourceModule` + 内部 services 替换。静态搜索显示业务和框架没有直接依赖 `LoaderManager`、`tyou.res.loader` 或 `LoaderManager.Loader`；其 `.meta` uuid 也没有被其他 Cocos 源资产引用。

`UIBase.setRemoteSpriteAsync()` 会调用 `tyou.res.setSpriteAsync({ url })`，再把成功返回的 `SpriteFrame` 加入 UI 自动释放集合。当前远程路径先加载 `ImageAsset` 再临时创建 `SpriteFrame`，但这个 `SpriteFrame` 没有明确托管引用；如果请求过期或目标销毁，返回前也没有释放本次加载得到的资源。

## Goals / Non-Goals

**Goals:**

- 删除旧 Loader 空壳，减少框架表面积。
- 让远程设图生成的 `SpriteFrame` 与 UI 自动释放路径形成 `addRef/decRef` 配对。
- 让过期/失败的异步设图不留下未赋值的临时资源。
- 文档化资源释放契约，说明谁加载、谁持有、谁释放。

**Non-Goals:**

- 不重做整个 `ManagedAssetLoader` 引用计数模型。
- 不改资源索引加载、bundle 加载和 public `tyou.res.*` 主入口。
- 不引入远程头像 LRU 缓存或磁盘缓存策略。

## Decisions

- 删除 `LoaderManager.ts` 和 `.meta`，因为没有代码或 Cocos uuid 引用，继续保留会误导后续维护。
- 新增 `ManagedAssetLoader.loadRemoteSpriteFrameAsync()`，专门用于远程图片到 `SpriteFrame` 的运行时资源创建。它对创建成功的 `SpriteFrame` 调用 `ReleaseScheduler.addRef()`，由 UI/调用方在生命周期结束时 `decRef()`。
- `SpriteAssignService` 注入释放函数；当请求过期、目标失效或无法赋值时，对已经得到的 `SpriteFrame` 调用释放函数。
- 文档将“成功拿到资源后必须进入生命周期容器或手动释放”作为主规则。

## Risks / Trade-offs

- [Risk] 删除 `.meta` 在 Cocos 资源数据库中可能有隐藏引用。→ Mitigation：已搜索 uuid 只出现在自身 `.meta`；若编辑器导入报错，可恢复文件或重新导入资源数据库。
- [Risk] 远程 `SpriteFrame` 不做共享缓存会让同 URL 多次创建多个运行时 SpriteFrame。→ Mitigation：本次优先生命周期正确性；后续如果头像/远程图成为热点，再加显式 LRU。

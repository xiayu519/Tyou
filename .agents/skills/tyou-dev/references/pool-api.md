# Pool 对象池

## 核心入口

节点池优先通过 `tyou.pool` 使用：

```ts
const node = await tyou.pool.instantiateAsync("TipUI", parent);
tyou.pool.releaseNode(node);
```

需要提前配置容量、预加载数量或自定义池名时，先拿到 `NodePool`：

```ts
const pool = await tyou.pool.getOrCreateNodePool({
    assetPath: "TipUI",
    poolName: "TipPool",
    preloadCount: 1,
    maxCapacity: 20,
    expireTime: 10,
});

const node = await pool.getAsync();
pool.release(node);
```

直接通过 `pool.getAsync()` 租借的节点也会被框架记录真实所属池，因此可以用 `pool.release(node)`，也可以用 `tyou.pool.releaseNode(node)` 归还。业务层不需要管理租约对象或手动注册节点所有权。

## key 语义

Node 池身份统一为 `poolName || assetPath`：

- 未传 `poolName` 时，`assetPath` 就是池名。
- 传入 `poolName` 时，创建、租借映射、释放、诊断和销毁都以真实 `poolName` 为准。
- `destroyNodePool(name)` 支持传 `poolName`，也保留按 `assetPath` 查找的兜底路径。

同一个 `assetPath` 可以配置不同 `poolName` 创建多个池，但业务应避免无意义拆分，防止容量和预加载策略难以判断。

## 生命周期契约

- `NodePool` 通过 `tyou.res.loadAssetAsync(assetPath)` 持有 Prefab。
- 池销毁时必须通过 `tyou.res.decRef(prefab)` 配对释放 Prefab 引用，不绕过资源模块。
- `expireTime` 单位是秒，`0` 表示可用节点永不过期。
- `releaseNode(node)` 只归还由 Pool 租借的有效节点；找不到所属池时会返回 `false`。
- `forceDestroyNode(node)` 会从池记录中移除并销毁节点，用于节点已不能安全复用的场景。
- `destroy()` 会拒绝等待中的 `getAsync()` 请求和预加载实例化队列，不允许销毁后的池重新复活。

## 业务节点回收边界

普通 `NodePool.release(node)` 只负责把节点归还池并重置通用节点状态，不是业务动态资源、动画或事件的自动释放容器。归还节点前，业务必须按节点实际用途处理：

- 停止 Animation、Spine 动画、Tween、定时器和仍可能回调当前节点的异步流程。
- 解绑本次租借注册的事件、回调和业务引用。
- 清空不应跨租借保留的文本、`spriteFrame`、`skeletonData`、序列帧进度和临时状态。
- 释放本次租借单独持有的动态 `SpriteFrame`、SpriteAtlas、`sp.SkeletonData` 等资源，保证 `addRef/decRef` 或自动 owner 配对。
- 防止上一次异步图片或 Spine 请求晚到后覆盖下一次租借的数据；UIWidget 场景优先使用 `UIBase`/`UIWidget` helper 和 owner epoch 保护。

资源 owner 按实际复用粒度选择：

- 每个节点或列表 Item 独立变化的资源，由节点组件或 `UIWidget` 持有，在 recycle/release 时释放。
- 多个池节点高频共用的资源，可以由 Pool 的业务 owner 或上层模块统一持有，在 Pool/模块销毁时释放。
- “处理干净”不等于每次租借都重新加载、每次归还都立即卸载；重点是 owner 明确、引用配对和销毁边界可验证。

如果节点已经无法恢复到稳定初始状态，使用 `forceDestroyNode(node)`，不要把带有残留状态的节点继续放回池。

## 诊断

`tyou.pool.getAllNodePoolStatus()` 会返回每个 Node 池的 `poolName`、`assetPath`、状态、容量、活跃数量、可用数量、pending 请求数、实例化队列长度和 Prefab 加载状态。

Pool 模块负责池、Prefab 和节点归属关系；业务组件仍负责每次租借产生的动态资源和运行时状态。

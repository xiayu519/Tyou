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

## 诊断

`tyou.pool.getAllNodePoolStatus()` 会返回每个 Node 池的 `poolName`、`assetPath`、状态、容量、活跃数量、可用数量、pending 请求数、实例化队列长度和 Prefab 加载状态。

Pool 模块的设计目标是把所有权、引用释放和销毁边界放在框架内部，业务代码保持“一行取节点、一行归还”。

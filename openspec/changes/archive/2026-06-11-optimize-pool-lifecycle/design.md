## Context

`PoolModule` 目前由 `NodePoolManager` 管理多个 `NodePool`，`NodePool` 自己负责 Prefab 加载、分帧实例化、节点租借、归还、过期清理、销毁和 Prefab 释放。整体能工作，但职责边界还不够清晰：

- `NodePoolManager.getAsync()` 获取池时按 `assetPath` 查询，创建池时却可能使用 `config.poolName` 作为 key；租借后 `_nodeToPoolMap` 也记录 `assetPath`，自定义 `poolName` 时归还可能找不到池。
- `NodePool` 有未使用的 `_isPrefabLoading` / `_prefabLoadPromise`，状态表达不够干净。
- 池销毁时会拒绝 pending get 和 instantiate queue，但租借归还契约、Prefab 引用释放和诊断信息没有被规范化。

## Goals / Non-Goals

**Goals:**

- 修正 `poolName` / `assetPath` key 语义，让节点总能归还到真实所属池。
- 收紧 `NodePool` 的状态、pending 请求、实例化队列和销毁边界。
- 保持 `tyou.pool.getOrCreateNodePool()`、`instantiateAsync()`、`releaseNode()` 等 public API 可用。
- 保持易用性：业务仍能“一行取节点、一行归还”，不需要被迫管理复杂租约对象。
- 文档化 Pool 的租借/归还和 Prefab 资源释放契约。

**Non-Goals:**

- 不重写类对象池 `ClassPool`。
- 不修改 Prefab、Scene、meta 或资源索引生成。
- 不引入新的 Pool API 分层或复杂租约对象。
- 不改变现有 `tyou.pool.instantiateAsync(assetPath)` 的调用方式。

## Decisions

1. **统一池 key 为 `poolName || assetPath`**

   `NodePoolManager` 增加内部 key 解析方法，创建、查询、租借映射、销毁和状态查询都使用同一 key。`getAsync(assetPath, config)` 若传入 `config.poolName`，租借节点记录真实 `poolName`，避免归还失败。

2. **让 `NodePool` 暴露稳定只读属性**

   增加 `poolName` / `assetPath` getter，避免 manager 反复通过 `getStatus()` 取结构化数据来做内部逻辑。

3. **让直接池对象和全局 facade 都能归还节点**

   `NodePool` 接受内部租借/销毁回调；`pool.getAsync()` 成功租借节点时，manager 同步记录节点所属池。这样业务用 `pool.release(node)` 或 `tyou.pool.releaseNode(node)` 都能走通，不牺牲易用性。

4. **清理无用状态并收紧失败路径**

   移除未使用字段；初始化加载 Prefab 返回 null 时显式失败；分帧实例化失败时让任务收敛；销毁时清理 pending 请求和实例化任务。

5. **资源释放继续交给 `tyou.res`**

   Pool 只持有 Prefab 资源引用，不直接操作 Cocos bundle 或资源缓存；销毁池时仍通过 `tyou.res.decRef(this._prefab)` 配对释放。

## Risks / Trade-offs

- [Risk] 有业务依赖 `destroyNodePool(assetPath)` 销毁自定义 `poolName` 的池。→ Mitigation：保留通过 `assetPath` 查找池的兼容路径，如果直接 key 查不到，再按 assetPath 查找。
- [Risk] 池 key 语义收紧后暴露历史配置重复问题。→ Mitigation：创建池时继续警告重复 `poolName`，不做破坏性覆盖。
- [Risk] Pool 仍是一个较大的模块。→ Mitigation：本次只做生命周期和 key 契约修正，不做跨文件大拆分，降低风险。

## Open Questions

无阻塞问题。用户已确认先执行 Pool 模块优化。

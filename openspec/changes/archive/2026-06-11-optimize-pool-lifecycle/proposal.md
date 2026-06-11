## Why

`Pool` 模块承担 Prefab 加载、节点实例化、租借归还、过期清理和资源释放，但当前 `poolName` / `assetPath` 语义不够稳定，节点归还可能在自定义 `poolName` 时找不到池。模块内部还残留未使用状态字段和较松散的 pending/销毁契约，长期会放大资源泄漏、节点错归还和池状态不可诊断的风险。

## What Changes

- 优化 `NodePoolManager` 的池 key 语义：节点租借后记录真实 `poolName`，归还、查询和销毁都按同一 key 工作。
- 保持 Pool 易用性：继续支持 `tyou.pool.instantiateAsync()` / `tyou.pool.releaseNode()`，也支持开发者拿到 `NodePool` 后直接 `pool.getAsync()` / `pool.release()`。
- 收紧 `NodePool` 生命周期：初始化、预加载、租借、归还、等待、销毁、Prefab 引用释放的状态边界更明确。
- 清理无用字段和冗余注释，保留现有 public API 行为，不改变 `tyou.pool.instantiateAsync()` / `releaseNode()` 主入口。
- 补充 Pool 生命周期规范，明确节点池的租借/归还契约和资源释放要求。

## Capabilities

### New Capabilities

- `runtime-pool-lifecycle`: 规范 Tyou 节点池的 Prefab 资源持有、节点租借/归还、pending 请求、销毁和诊断契约。

### Modified Capabilities

- `runtime-resource-safety`: Pool 的 Prefab 持有和释放必须遵守资源生命周期配对，不绕过 `tyou.res`。

## Impact

- 代码影响：`Client/assets/ty-framework/module/pool/NodePool.ts`、`NodePoolManager.ts`、`PoolModule.ts`。
- 规范影响：新增 `openspec/specs/runtime-pool-lifecycle/`，并同步资源安全 spec 的 Pool 资源持有要求。
- 不改变资源索引加载，不修改 Prefab/Scene/meta，不改变 UI/Audio/Network 模块。

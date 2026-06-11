## 1. Pool identity and ownership

- [x] 1.1 修正 `poolName || assetPath` 的统一 key 语义，确保创建、查找、租借映射、释放和销毁使用真实池身份。
- [x] 1.2 保持易用入口不变：`tyou.pool.instantiateAsync()` / `tyou.pool.releaseNode()` 和直接 `pool.getAsync()` / `pool.release()` 都无需业务手动注册所有权。

## 2. NodePool lifecycle safety

- [x] 2.1 清理未使用状态，修正 `expireTime = 0` 永不过期语义，并补充 `poolName` / `assetPath` 只读诊断入口。
- [x] 2.2 收紧 pending get、分帧实例化、销毁和 `forceDestroyNode()` 行为，避免 stale work、无效节点和资源计数残留。

## 3. Contracts and validation

- [x] 3.1 文档化 Pool 租借/归还与 Prefab 资源释放契约，保持 API 简洁易用。
- [x] 3.2 运行 OpenSpec、静态检查和可观测性验证；同步主 specs 后归档 change。

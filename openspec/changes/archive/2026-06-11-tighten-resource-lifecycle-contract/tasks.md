## 1. 清理旧入口

- [x] 1.1 删除无引用 `LoaderManager.ts` 与 `LoaderManager.ts.meta`。
- [x] 1.2 静态搜索确认没有 `LoaderManager`、`tyou.res.loader`、`LoaderManager.Loader` 调用点。

## 2. 远程 SpriteFrame 生命周期

- [x] 2.1 新增远程图片转托管 `SpriteFrame` 的加载路径。
- [x] 2.2 在异步设图请求过期、目标失效或赋值失败时释放本次获得的 `SpriteFrame`。

## 3. 释放契约

- [x] 3.1 同步 `resource-api.md`，明确资源持有和释放规则。
- [x] 3.2 同步 `runtime-resource-safety` spec。
- [x] 3.3 运行 OpenSpec validate、静态搜索和 diff 检查。

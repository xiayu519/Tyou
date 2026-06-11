## Context

这次处理的是框架运行期最底层的一组服务。它们共同特点是：调用点分散、生命周期长、错误通常不是立即暴露，而是在 UI 关闭、网络断线重连、跨天刷新或小游戏长时间运行后累积。

当前状态：

- `TimerModule` 已使用最小堆和对象池，核心性能结构合理，但缺少销毁后的保护、池诊断和清空后的彻底状态复位。
- `EventModule` 已支持优先级、`once`、`waitFor` 和批量绑定，但同一事件嵌套 `emit` 时用 `Set` 记录分发状态不够精确。
- `UpdateModule` 在更新中 `clearAll()` 会把待移除集合立即清空，导致本帧清理失效；遍历 `Map` 时新增回调可能进入同一帧执行。
- `StorageEx` 缓存 JSON 解析缺少保护，`StorageModule` 入口偏薄，常用的 `has`、默认值读取、缓存清理需要走 `ex` 或手写。
- `GameWorld` 对服务器时间默认按毫秒处理，网络协议如果传秒会被错误缩小；`TIME_UPDATE_NEW_DAY` 已定义但没有触发。

## Goals / Non-Goals

**Goals:**

- 保持现有业务可用 API 和调用语义不破坏。
- 修复事件嵌套分发、Update 更新中清空、Storage 缓存解析、GameWorld 时间输入兼容等实际风险。
- 增加少量高价值诊断/易用 API，让模块更优雅但不复杂。
- 明确基础服务销毁时的清理契约。

**Non-Goals:**

- 不重写资源加载、索引加载、引用计数或释放链路。
- 不改 Prefab、Scene、meta、Luban 数据或生成代码。
- 不引入外部依赖。
- 不把 `tyou.timer.addTimer` 的回调参数从 `args[]` 改为展开参数，避免破坏现有调用。
- 不迁移既有 `localStorage` 数据格式。

## Decisions

### Timer 保留最小堆，只补生命周期和诊断

保留现有绝对时间 + 最小堆 + Timer 对象池结构，因为它已经满足高频计时器的核心性能诉求。优化集中在：销毁状态保护、输入时间归一化、`removeAllTimer()` 状态复位、可查询的 `hasTimer/getTimerInfo/getTimerPoolSize/clearTimerPool`。

替代方案是重写为数组扫描或 Cocos scheduler 包装，但前者高频性能更差，后者不利于统一暂停、恢复、查询和框架销毁管理。

### Event 使用 emit 深度计数

把“正在分发事件”的记录从 `Set<string>` 调整为 `Map<string, number>` 深度计数。同一事件发生嵌套 `emit` 时，只有最外层分发结束才 flush 延迟移除，避免内层 emit 提前清理外层仍在使用的监听列表。

同时新增 `emitArray(type, args)` 支持动态参数数组；原 `emit(type, arg0...arg4)` 仍保留最多 5 参数的现有语义。

### Update 使用快照遍历和 pending clear

每帧更新开始时复制当前回调快照，新注册的回调从下一帧开始执行。更新中 `removeUpdate` 只做延迟移除，`clearAll` 设置 `_pendingClear`，本帧后统一清理，避免 Map 遍历被修改造成行为漂移。

### Storage 做安全解析和薄入口增强

`StorageEx` 的缓存保持 JSON 字符串格式，避免改变已存储数据。读取时统一走安全解析，解析失败返回 `undefined` 并清掉坏缓存。`StorageModule` 暴露泛型默认值、`has/add/setDay/getDay/setWeek/getWeek/clearCache`，业务不必频繁绕到 `ex`。

### GameWorld 时间输入做容错，不改对外秒语义

`setServerTime` 接受秒或毫秒时间戳：大于毫秒阈值的按毫秒转秒，否则按秒。`getServerTime()` 继续返回秒。每秒 tick 后比较 day key，跨天时触发 `GameEvent.TIME_UPDATE_NEW_DAY`。销毁时 `unscheduleAllCallbacks()`，防止组件释放后仍有 schedule 回调。

## Risks / Trade-offs

- [Risk] 秒/毫秒容错可能接受异常小的测试时间戳并按秒处理 → 保持输入为有限数字时才生效，非法值忽略。
- [Risk] `emitArray` 支持任意参数，但文档中的 `emit` 仍是最多 5 参数 → 明确动态参数使用 `emitArray`。
- [Risk] `UpdateModule` 新注册回调从下一帧执行，和 Map 原生遍历可能同帧执行不同 → 这是更稳定的调度契约，并与“遍历期间修改不影响当前快照”一致。
- [Risk] `StorageEx.get` 解析失败会返回 `undefined` → 与原注释“undefined 代表失败”一致，并避免坏缓存持续抛错。

## Migration Plan

1. 先补 OpenSpec artifacts。
2. 按调度服务、状态服务、文档规范和验证顺序实施。
3. 保留现有 API，新增 API 只做向后兼容增强。
4. 验证通过后将 delta specs 同步到主 specs，并归档 change。

## Open Questions

无。用户已授权对相关框架模块进行优化，底线是保持之前正常功能不变。

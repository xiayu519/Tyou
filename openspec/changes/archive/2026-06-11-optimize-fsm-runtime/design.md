## Context

`FSMModule` 是 Tyou 全局运行时模块之一，由 `Tyou.onUpdate(dt)` 每帧驱动。现有实现已经提供 `FSM<T>`、`IFSMState<T>`、异步 `changeState()`、按 owner 批量销毁和统计接口，但存在几个结构问题：

- `changeState()` 允许多个异步切换交叠执行，同一个 FSM 可能同时等待旧状态进入完成、退出旧状态和进入新状态。
- `_waitResolve/_waitCondition` 是单槽等待状态，并发切换时会互相覆盖。
- `reset()`、`destroy()` 调用异步 `onExit()` 但不等待，也不阻止后续已排队切换写回状态。
- `FSMModule.onUpdate()` 和 `destroyAllFSMByOwner()` 直接遍历 Map，遍历期间若业务销毁 FSM 会让行为难以推断。
- 文件末尾存在废弃注释代码，和当前 `createFSM()` 返回值不一致，容易误导维护者。

## Goals / Non-Goals

**Goals:**

- 保证同一个 `FSM` 的状态切换串行执行，每次只运行一条切换链。
- 在 `reset/destroy` 时取消等待、阻止过期异步回调写回状态，避免半销毁状态。
- 保持现有易用入口可用，并新增少量辅助 API 让业务代码更少绕路。
- 让模块级遍历在 update 和 destroy 期间稳定，不受遍历中增删影响。
- 更新文档和 specs，让 FSM 契约对后续开发明确。

**Non-Goals:**

- 不引入新的调度器、事件系统或第三方状态机库。
- 不改变 `tyou.fsm` 在 `Tyou.ts` 中的生命周期顺序。
- 不把 FSM 和动画状态机、ECS 或 UI 生命周期耦合。
- 不修改业务状态类、Prefab、Scene、meta、Luban 或资源索引链路。

## Decisions

### 1. 使用 Promise 队列串行化 `changeState`

每个 `FSM` 内部维护一条 transition queue。`changeState()` 校验基础条件后，把切换任务追加到队列尾部，调用者仍然拿到 `Promise<boolean>`。这样不会改变 `await fsm.changeState()` 的使用方式，又能保证同一 FSM 内 `onExit/onEnter` 不交叠。

替代方案是“最新请求覆盖旧请求”，但这会丢弃中间状态，对于游戏逻辑状态机不够可预测。

### 2. 使用版本号使 reset/destroy 让旧异步过期

`resetAsync()` 和 `destroy()` 会递增版本号并清理等待条件。正在等待的切换会返回失败，后续 queued transition 在执行前发现版本过期或 FSM 已销毁，也返回失败，不再写回 `_currentState`。

### 3. 保留同步 API，新增 async 版本

保留 `reset(initialState?)` 和 `destroy()` 的同步调用体验：它们内部 fire-and-forget 或即时清理。新增 `resetAsync(initialState?)` 供需要等待完整退出/进入的业务使用。`destroyFSM(fsm)` 保留，同时支持 `destroyFSM(id)` 和显式 `destroyFSMById(id)`。

### 4. 状态接口支持同步或异步回调

`IFSMState.onEnter/onExit` 返回值放宽为 `void | Promise<void>`。这不会破坏已有 async 状态，能减少只做同步逻辑的状态类样板代码。

### 5. 模块遍历使用快照

`FSMModule.onUpdate()`、`destroyAllFSMByOwner()`、`onDestroy()` 使用 `Array.from(this._fsms...)` 快照遍历。这样本帧 update 中销毁或创建 FSM 不会改变当前遍历集合。

## Risks / Trade-offs

- [Risk] 串行队列会让短时间内多次 `changeState()` 按顺序全部执行，而不是只保留最后一次。→ 这是可预测优先的状态机语义；业务如果需要跳过中间状态，应在调用层自行合并请求。
- [Risk] 状态回调内部 `await fsm.changeState()` 可能形成自等待。→ 文档说明状态回调可以触发切换，但不应在当前回调内等待同一个 FSM 的下一次切换完成。
- [Risk] `reset()` 保持同步入口，调用者无法知道异步 reset 何时完成。→ 新增 `resetAsync()`，需要确定完成时机的业务使用 async 入口。

## Migration Plan

1. 创建 FSM runtime specs 和任务清单。
2. 重写 `FSMModule.ts` 内部实现，保留现有 API 并新增辅助 API。
3. 同步 README、topic references 和主 OpenSpec specs。
4. 运行 OpenSpec、静态搜索、相关 TypeScript 过滤、diff 和 sensor 验证。
5. 验证通过后归档 change。

## Open Questions

- 暂无。开发者已授权优化 FSM 模块，本次不做跨模块行为改造。

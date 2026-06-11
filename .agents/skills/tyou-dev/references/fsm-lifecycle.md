# FSM 生命周期

本文件记录 `tyou.fsm` 的运行时契约。

## 切换语义

- `fsm.changeState(state, data?)` 返回 `Promise<boolean>`。
- 同一个 FSM 内的多次 `changeState()` 会按调用顺序串行执行。
- 状态 `onEnter(previousState, data?)` 和 `onExit(nextState)` 可以同步返回，也可以返回 `Promise<void>`。
- 框架会在进入状态前把 `state.isEntered` 置为 `false`，`onEnter` 完成后置为 `true`。
- 如果旧状态 `onEnter` 还没完成，下一次切换会等待 `isEntered`，等待时长由 `waitUntilTimeout` 控制；`0` 表示不超时。

不要在某个状态的 `onEnter/onExit` 内 `await` 同一个 FSM 的下一次 `changeState()`，这会让当前切换等待自己后面的队列项。

## 生命周期

- `fsm.reset(initialState?)` 保留同步调用体验，内部异步执行。
- 需要等待 reset 完成时使用 `await fsm.resetAsync(initialState?)`。
- `fsm.destroy()` 会让等待中的条件和后续排队切换失败，不允许销毁后的异步切换写回状态，并从 `tyou.fsm` 模块跟踪表中移除自己。
- `tyou.fsm.destroyFSM(fsm)`、`tyou.fsm.destroyFSM(id)` 和 `tyou.fsm.destroyFSMById(id)` 都可销毁指定 FSM。
- `tyou.fsm.destroyAllFSMByOwner(owner)` 会销毁批处理开始时属于该 owner 的 FSM。

## 遍历安全

- `FSMModule.onUpdate(dt)` 使用 FSM 快照遍历。
- 本帧 update 中创建或销毁 FSM 不会影响当前遍历集合。
- 即使 FSM inactive，也仍会收到内部 `update(dt)` 来推进等待条件；inactive 只会阻止状态 `onUpdate(dt)`。

## 常用辅助 API

- `fsm.hasState(state)`
- `fsm.getState(state)`
- `fsm.unregisterState(state)`：不能注销当前状态。
- `fsm.isTransitioning()`
- `fsm.isDestroyed()`
- `fsm.getStateCount()`
- `tyou.fsm.hasFSM(id)`
- `tyou.fsm.resetFSMAsync(id, initialState?)`

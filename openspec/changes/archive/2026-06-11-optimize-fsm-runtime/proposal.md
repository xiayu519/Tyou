## Why

当前 `FSMModule` 支持异步状态切换，但多个 `changeState()` 同时触发时并没有真正串行化，`reset/destroy` 对异步 `onExit/onEnter` 也没有明确收敛语义。这个模块经常被业务对象长期持有，若切换、销毁和遍历不稳定，容易出现半切换状态、等待残留或迭代中删除带来的隐性问题。

## What Changes

- 优化 `FSM` 状态切换：让异步 `changeState()` 按调用顺序串行执行，避免同一个 FSM 内部并发进入/退出状态。
- 强化生命周期：`destroy/reset` 会取消等待中的切换、清理等待条件，并避免后续 queued transition 写回已销毁状态。
- 提升易用性：状态接口支持同步或异步 `onEnter/onExit`；新增查询/管理辅助 API，例如 `hasState`、`getState`、`unregisterState`、`isTransitioning`、`destroyFSMById`。
- 优化模块遍历：`onUpdate()`、按 owner 销毁、全量销毁使用快照遍历，避免更新期间增删 FSM 影响当前遍历。
- 移除 `FSMModule.ts` 末尾已注释废弃 wrapper，降低维护噪音。
- 同步 README、Tyou topic references 和 OpenSpec specs 中的 FSM 运行时契约。

## Capabilities

### New Capabilities

- `runtime-fsm-lifecycle`: 规范 FSM 异步状态切换、生命周期清理、模块遍历和易用 API。

### Modified Capabilities

- `framework-runtime`: 补充框架销毁时 FSM 应在基础服务前清理的契约。

## Impact

- 代码影响：`Client/assets/ty-framework/module/fsm/FSMModule.ts`，必要时仅同步文档和 specs。
- API 影响：保留现有 `createFSM`、`changeState`、`reset`、`destroyFSM(fsm)` 等入口；新增辅助 API，不做破坏性改名。
- 不修改 Cocos Prefab、Scene、meta、资源索引、Luban 表或生成代码。

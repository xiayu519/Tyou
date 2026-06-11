## Why

`Timer`、`Event`、`Update`、`Storage` 和 `GameWorld` 都是框架运行期基础服务，业务与 UI 会长期依赖它们。当前实现已经可用，但在嵌套事件、更新中清理、本地缓存解析、服务器时间输入兼容和生命周期释放上仍有隐性风险，容易在小游戏长时间运行后变成难定位的问题。

## What Changes

- 优化调度类服务：保持现有 `tyou.timer`、`tyou.event`、`tyou.update` API 兼容，补强嵌套 emit、更新中增删、清空、销毁和诊断能力。
- 优化状态类服务：保持现有 `tyou.storage`、`tyou.game` API 兼容，补强安全解析、缓存控制、默认值读取、服务器时间秒/毫秒兼容、新一天事件和销毁清理。
- 同步 README、Tyou topic reference 与 OpenSpec spec，明确运行时服务的契约和释放语义。
- 不改资源索引加载、不改 Prefab/Scene/meta、不改 Luban 生成数据，不引入新依赖。

## Capabilities

### New Capabilities

- `runtime-scheduler-services`: 计时器、事件、Update 回调等运行时调度服务的行为契约。
- `runtime-state-services`: 本地存储和 GameWorld 全局时间状态服务的行为契约。

### Modified Capabilities

- `framework-runtime`: 框架销毁阶段必须清理调度与状态服务的运行期临时状态。

## Impact

- 影响源码：
  - `Client/assets/ty-framework/module/timer/TimerModule.ts`
  - `Client/assets/ty-framework/module/event/EventModule.ts`
  - `Client/assets/ty-framework/module/update/UpdateModule.ts`
  - `Client/assets/ty-framework/module/storage/StorageModule.ts`
  - `Client/assets/ty-framework/module/storage/StorageEx.ts`
  - `Client/assets/ty-framework/module/world/GameWorld.ts`
- 影响文档和规范：
  - `README.md`
  - `.agents/skills/tyou-dev/references/modules.md`
  - `.agents/skills/tyou-dev/references/event-system.md`
  - `openspec/specs/framework-runtime/spec.md`
- API 兼容：保留既有入口和参数语义，新增辅助 API；不做破坏性删除。

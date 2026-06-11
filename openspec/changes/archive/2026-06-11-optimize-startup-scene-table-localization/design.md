## Context

当前启动链由 `Main.appStart()` 直接调用 `tyou.table.onCreate()`，但 `TableModule` 内部同时承担 Luban 二进制表加载、Loading 进度 UI 更新、多语言重载触发三类职责。这会让框架底层模块依赖业务层 `LoadingUI`，也让配表和多语言之间形成隐式启动顺序。

资源索引加载是项目特色，不能改变。配表文件仍由 `config` bundle 下的 Luban 二进制数据加载，不纳入普通资源索引扫描。启动链优化只调整职责边界和生命周期语义，不修改 Luban Excel、生成代码、二进制表、Prefab、Scene、meta 或资源索引生成链路。

## Goals / Non-Goals

**Goals:**

- 让 `TableModule` 成为纯配表加载模块，只负责加载 `BufferAsset`、构建 `Tables`、记录加载状态和清理内存。
- 由 `Tyou` 提供启动编排入口，在资源索引完成后加载配表，并在成功后刷新 `tyou.i18n`。
- 让 `LocalizationModule.reloadFromTable()` 返回明确成功状态，并在刷新完成后通知已启用的 `LocalizeLabel`。
- 让 `SceneModule.loadSceneAsync()` 在加载失败、切换中销毁、回调异常等路径下收敛 `_isSwitching`，并避免场景资源加载失败时提前离开旧场景。
- 文档化启动顺序和模块依赖方向，降低后续维护时引入 TS 循环依赖的风险。

**Non-Goals:**

- 不改变资源索引生成、索引加载、资源命名或引用计数规则。
- 不修改 Luban 表结构、Excel 源数据、生成脚本、生成代码或 `.bin` 数据。
- 不强制 `tyou.onCreate()` 自动加载配表，保留业务启动过程对 Loading 进度和时机的控制。
- 不改变业务侧读取 API 的基本形态：`tyou.table.getConfig()`、`tyou.i18n.get()`、`tyou.scene.loadSceneAsync()` 继续可用。

## Decisions

### 1. `Tyou` 作为启动链编排器

`Tyou` 新增 `loadTablesAsync(onProgress?)` 入口，内部调用 `TableModule.loadAsync()`，成功后调用 `LocalizationModule.reloadFromTable()`。这样 `TableModule` 不需要知道多语言模块，`LocalizationModule` 也不 import `TableModule`，避免 TS 模块层面的循环依赖。

替代方案是在 `TableModule` 加事件广播，由 `LocalizationModule` 订阅配表加载完成事件。该方案更松耦合，但启动阶段需要额外事件契约，也更难保证刷新顺序。当前框架启动链较集中，由 `Tyou` 显式编排更直接。

### 2. `TableModule` 保持兼容入口但收窄职责

`TableModule.onCreate()` 保留为 `loadAsync()` 的兼容别名，但不再更新 Loading UI，也不再触发 `tyou.i18n`。新实现记录 `_isLoaded` 与 `_loadingPromise`，重复调用时复用同一个加载 Promise，避免重复读取二进制表和重复构建 `Tables`。

加载成功后，模块把 `BufferAsset` 的内容复制为 `Uint8Array` 并立即 `tyou.res.decRef(cfg)`，保留运行期表数据同时释放资源模块引用。`onDestroy()` 清空 `_dataMap`、`_tables`、加载状态和并发 Promise。

### 3. 多语言刷新显式返回状态

`LocalizationModule.reloadFromTable()` 返回 `boolean`：成功读到表结构并完成字典重建时返回 `true`，缺少表或表 API 时返回 `false`。刷新成功后复用现有 `GameEvent.LANGUAGE_CHANGED` 通知 `LocalizeLabel`，不新增事件类型。

`LocalizationModule` 不 import `TableModule`，只通过全局 `tyou.table?.getConfig()` 读取当前配置，保持依赖方向为启动编排层向功能模块调度。

### 4. 场景切换延迟离开旧场景

`SceneModule.loadSceneAsync()` 在确认目标场景资源加载成功并准备执行 `director.runSceneImmediate()` 前，才调用旧场景 `onLeave()`。加载失败时旧场景继续保持当前状态，避免半离开状态。

模块引入切换序号和销毁标记：每次切换递增 token，`onDestroy()` 也递增 token，使等待中的异步回调能识别自己已经过期。`finally` 只清理当前 token 对应的 `_isSwitching`，避免旧异步覆盖新状态。

## Risks / Trade-offs

- [Risk] `TableModule.onCreate()` 不再自动刷新多语言，旧业务若单独调用它后期待 i18n 同步，会行为变化。→ 保留更明确的 `tyou.loadTablesAsync()` 并同步文档；项目当前启动入口改用新 API。
- [Risk] `LocalizationModule.reloadFromTable()` 刷新成功后发出语言变化事件，可能让已有 Label 在启动阶段多刷新一次。→ 该事件只在字典重建后触发，代价很低，且能保证已启用 Label 拿到新表数据。
- [Risk] 场景切换期间销毁模块时，异步加载可能稍后返回。→ 使用 token 和 destroyed guard 丢弃过期结果，不在销毁后进入新场景生命周期。
- [Risk] `TableModule` 复制二进制数据会保留一份 `Uint8Array`。→ 这是 `Tables` 读取所需的长期数据；及时 `decRef(BufferAsset)` 避免额外资源引用泄漏。

## Migration Plan

1. 补齐 OpenSpec delta 和任务清单。
2. 调整 `TableModule` 为纯加载器并保留兼容入口。
3. 在 `Tyou` 新增启动编排 API，并把 `Main.appStart()` 切换到新 API。
4. 强化 `LocalizationModule` 和 `SceneModule` 生命周期状态。
5. 同步 README 和 Tyou topic references 中的启动链说明。
6. 运行 OpenSpec、静态搜索、局部 TypeScript 过滤和 sensor 验证；通过后归档 change。

## Open Questions

- 暂无。开发者已授权优化该启动链，底线为资源索引加载不变、原功能不退化。

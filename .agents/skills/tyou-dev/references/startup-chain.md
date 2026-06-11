# 启动链：Scene / Table / Localization

本文件记录 Tyou 启动阶段资源索引、配表、多语言、场景和 UI 的依赖方向。

## 顺序契约

1. `Main.start()` 先调用 `await tyou.onCreate()`。
2. `tyou.onCreate()` 必须先完成 `await tyou.res.onCreate()`，也就是资源索引初始化。
3. 业务启动阶段通过 `await tyou.loadTablesAsync(onProgress)` 加载 Luban 配表。
4. `tyou.loadTablesAsync()` 成功后由 `Tyou` 调用 `tyou.i18n.reloadFromTable()`。
5. 配表和多语言准备完成后，业务再切换首个场景并打开启动 UI。

资源索引加载顺序不能后移或绕过；Luban 配表仍通过 `config` bundle 的 `game` 目录读取，不改变资源索引生成链路。

## 依赖方向

- `TableModule` 只负责 Luban 二进制表加载、`Tables` 构建、加载状态和清理。
- `TableModule` 不 import `LoadingUI`，也不直接调用 `tyou.i18n`。
- `LocalizationModule` 不 import `TableModule`，只在 `reloadFromTable()` 中通过 `tyou.table?.getConfig()` 读取当前表。
- `Tyou` 是启动编排层，可以依次调用 `table.loadAsync()` 和 `i18n.reloadFromTable()`。
- `Main` 或业务启动脚本负责 Loading UI 文案和进度展示。

## 生命周期要点

- `TableModule.loadAsync()` 是推荐的底层表加载 API；重复调用会复用进行中的加载 Promise。
- `TableModule.onCreate()` 只保留为兼容入口，语义等同于纯配表加载，不再承诺刷新多语言。
- `LocalizationModule.reloadFromTable()` 返回 `boolean`，成功后发出 `GameEvent.LANGUAGE_CHANGED` 让 `LocalizeLabel` 刷新。
- `SceneModule.loadSceneAsync()` 只有在目标 `SceneAsset` 加载成功后才离开旧场景；加载失败时旧场景不进入半离开状态。

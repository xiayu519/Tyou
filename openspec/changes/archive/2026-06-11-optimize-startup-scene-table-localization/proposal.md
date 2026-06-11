## Why

当前启动链由 `Main.appStart()` 手动调用 `tyou.table.onCreate()`，而 `TableModule` 内部又直接依赖 `LoadingUI` 并调用 `tyou.i18n.onCreate()`。这让配表加载、Loading UI、多语言刷新和场景切换耦合在一起，也容易形成隐式循环依赖。

## What Changes

- 解耦 `TableModule`：只负责加载 Luban 二进制表、构建 `Tables`、管理加载状态和清理数据，不再依赖 `LoadingUI` 或直接驱动 `tyou.i18n`。
- 明确启动编排：由 `Tyou` 提供表加载 + 多语言刷新入口，顺序为资源索引完成后加载配表，再刷新 `tyou.i18n`，之后业务再切场景和打开 UI。
- 强化 `LocalizationModule`：支持明确的 `reloadFromTable()` 成功状态，刷新后可通知已启用的 `LocalizeLabel`。
- 优化 `SceneModule`：场景切换加载失败、切换中、销毁中都能收敛 `_isSwitching`，避免加载失败后把旧场景置于半离开状态。
- 文档化 Scene / Table / Localization 启动顺序、模块依赖方向和避免循环依赖的契约。

## Capabilities

### New Capabilities

- `runtime-startup-chain`: 规范 Tyou 运行时资源索引、配表、多语言、场景和 UI 的启动顺序与依赖方向。

### Modified Capabilities

- `runtime-localization`: 明确多语言由启动编排在 `TableModule` 完成后刷新，而不是由 `TableModule` 直接调用。
- `framework-runtime`: 补充框架启动链和模块依赖方向契约。

## Impact

- 代码影响：`Client/assets/ty-framework/Tyou.ts`、`module/table/TableModule.ts`、`module/localization/LocalizationModule.ts`、`module/scene/SceneModule.ts`、`Client/assets/scripts/Main.ts`。
- 文档影响：新增或同步 `.agents/skills/tyou-dev/references/startup-chain.md`，更新相关 OpenSpec 主 specs，必要时同步 README 中旧表述。
- 不修改 Luban Excel、生成代码、二进制表、Prefab、Scene、meta 或资源索引生成链路。
- 不改变业务获取表和多语言的基本 API：`tyou.table.getConfig()`、`tyou.i18n.get()`、`tyou.scene.loadSceneAsync()` 继续可用。

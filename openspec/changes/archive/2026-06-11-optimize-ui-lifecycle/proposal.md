## Why

UI 模块承担窗口加载、实例缓存、栈排序、隐藏关闭、模糊背景、Tip、按钮事件和动态资源释放，但当前运行时生命周期边界偏松：同名窗口并发打开、加载失败、关闭加载中窗口、重名绑定节点、按钮防抖计时器和 Tip 异常路径都存在状态残留或诊断不足风险。

这次优化要在不增加业务使用复杂度的前提下，把 UI 运行时收敛成更可靠的框架契约：外部仍用 `tyou.ui.showUIAsync()` / `closeWindow()` / `hideWindow()`，内部负责并发合并、状态清理、资源释放和诊断。

## What Changes

- 增强 UI 窗口生命周期：加载中同名窗口请求合并，加载失败和关闭加载中窗口不会留下半初始化实例。
- 保持 UI 易用性：保留 `showUIAsync`、`closeWindow`、`hideWindow`、`UIWindow.close/hide`、`@UIDecorator`、`UIName.ts`、`UIImportAll.ts` 和生成器主流程。
- 收紧关闭和释放语义：窗口销毁必须清理事件、防抖计时器、动态资源、隐藏关闭计时器、节点和实例表。
- 优化 UI 节点绑定诊断：默认 `this.get("name")` 仍可用，但绑定节点重名不再静默覆盖，增加 `getRequired`、`getAll`、`getByPath` 等显式入口。
- 对齐运行时绑定前缀和编辑器 `ui-component-config.json`，避免生成器能生成但运行时扫不到节点。
- 优化模糊背景刷新与点击关闭路径，避免 fire-and-forget 异步刷新造成 stale 结果。
- 优化 `TipManager`：动画或节点异常时也必须归还 Vec3 和节点池节点。
- 文档化 UI 生命周期、重名节点诊断、资源释放和易用性契约。

## Capabilities

### New Capabilities

- `runtime-ui-lifecycle`: 规范 Tyou UI 运行时窗口加载、实例缓存、栈排序、隐藏关闭、节点绑定诊断、事件释放、模糊背景和 Tip 生命周期。

### Modified Capabilities

- `runtime-resource-safety`: 明确 UI 窗口 Prefab、动态 SpriteFrame/SpriteAtlas 和远程 SpriteFrame 必须进入 UI 生命周期释放路径。
- `framework-runtime`: 保持已有弹窗模糊背景要求，并扩展其与 UI 生命周期刷新、点击关闭和隐藏窗口的协作契约。

## Impact

- 代码影响：`Client/assets/ty-framework/module/ui/UIBase.ts`、`UIWindow.ts`、`UIModule.ts`、`TipManager.ts`、`blur/UIBlurBackground.ts`，以及必要时调整 `ViewUtil.ts` 的 UI 节点扫描逻辑。
- 文档影响：更新 `.agents/skills/tyou-dev/references/ui-lifecycle.md`、`ui-patterns.md`，新增或同步 OpenSpec runtime UI specs。
- 不修改 Prefab、Scene、meta、Luban 数据、资源索引生成、UIName/UIImportAll 生成文件。
- 不改变外部主 API 和业务 UI 脚本基础写法。

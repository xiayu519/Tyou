# UI 生成与绑定模式

## 代码位置

业务 UI 示例位于：

- `Client/assets/scripts/logic/ui/*.ts`
- `Client/assets/asset-raw/ui/*.prefab`

编辑器生成工具：

- `Client/extensions/uitscreate/`
- 配置：`Client/assets/editor/ui-component-config.json`
- 模板：`Client/assets/editor/ui-template.txt`

## 生成器规则

`uitscreate` 会扫描选中 UI 根节点的子节点：

1. 节点名包含 `UI` 才允许生成脚本。
2. 按 `ui-component-config.json` 的 `prefix` 匹配。
3. 生成 `bindMemberProperty()`。
4. `m_btn` 生成点击方法和 `onRegisterEvent`。
5. 新脚本创建后追加 `UIName.ts` 并重建 `UIImportAll.ts`。
6. 已存在脚本时，只生成绑定片段到剪贴板。
7. `m_list` 下的 `m_item` 作为列表 item 的 `UIWidget` 边界，父 UI 只绑定 `m_list`，不递归绑定 `m_item` 内部节点。
8. 普通子面板 widget 通过独立“生成Widget脚本”和运行时动态加载 prefab 托管，不使用静态 widget 前缀；prefab/根节点名需包含 `Widget` 标记，脚本名与 prefab/根节点名一致。

## 前缀到代码类型

| 前缀 | 组件 | 代码类型 |
| --- | --- | --- |
| `m_go` | Node | `Node` |
| `m_tf` | UITransform | `UITransform` |
| `m_text` | Label | `Label` |
| `m_btn` | Button | `Node` |
| `m_img` | Sprite | `Sprite` |
| `m_grid` | Layout | `Layout` |
| `m_list` | ScrollView/Mask/ListView | `ListView` |
| `m_scroll` | ScrollView | `ScrollView` |
| `m_toggle` | Toggle | `Toggle` |
| `m_slider` | Slider | `Slider` |
| `m_progress` | ProgressBar | `ProgressBar` |
| `m_eb` | EditBox | `EditBox` |
| `m_rt` | RichText | `RichText` |
| `m_item` | UIWidget 边界 | 由所属 `m_list` 生成 item 脚本，不作为父 UI 字段 |

运行时绑定扫描必须和本表保持一致。新增或修改前缀时，同时更新 `Client/assets/editor/ui-component-config.json` 和运行时扫描配置。

## UIWidget

`UIWidget` 是 `UIWindow` 下的通用子 UI 生命周期单元，可用于列表 item、子面板、页签或子窗口。它继承 `UIBase`，拥有独立的节点绑定、事件注册、动态资源容器和 `onCreate/onRefresh/onRecycle/onClosed` 生命周期。

- 父 UI 创建普通子组件时使用 `this.createWidget(WidgetClass, node, ...args)`。
- 父 UI 动态加载 prefab 子组件时使用 `this.loadWidgetAsync(WidgetClass, assetName, parentNode, ...args)`；释放 widget 会销毁它托管的 prefab 节点。
- 列表 item 由 `ListView.setItemWidget(ItemClass, owner)` 注册后自动创建和刷新。
- 父 UI 扫描绑定节点时遇到 `m_item` 边界会停止递归，避免父脚本绑定列表 item 内部节点。
- `UIWidget.recycle()` 会释放当前动态资源但保留节点绑定和事件，用于列表 item 高频复用。
- `UIWidget.release()` 会释放子 widget、事件、动态资源和节点引用，父 UI 关闭时会自动释放持有的子 widget。
- 普通动态 Widget prefab 默认只需要 `onCreate/onRefresh/onClosed`；`onRecycle` 主要给列表 item 或开发者手动池化的 widget 使用，生成普通 Widget prefab 脚本时不生成空 override。
- Widget 内动态 Spine 使用 `this.loadSpineAsync()` / `this.loadSpineEffectAsync()`，不要在可复用 item 中直接调用 `tyou.res.loadSpineAsync()`。
- `ui/widget/WidgetImportAll.ts` 由生成器维护，并通过 `UIImportAll.ts` side-effect 引入；Widget 脚本不导入 `UIName` 或父 UI，避免循环依赖并防止小游戏 Tree Shaking 剔除。

## 组件检查

层级菜单“检查前缀组件”分两阶段执行：

1. 移除互斥组件，记录待添加组件。
2. 等引擎刷新后补加目标组件。

不要手写一套新的互斥规则，优先复用扩展。

## UI 脚本创建红线

UI 预制体对应的 UI 脚本原则上不手写创建。必须优先使用 `uitscreate`，因为只有这条路径会自动维护 `UIName.ts` 和 `UIImportAll.ts`。

如果开发者要求手写，先提醒风险：枚举、统一 import、节点绑定、按钮注册容易漏，可能导致 `showUIAsync` 找不到 UI 或运行时报空。

## AI 生成 UI 的最小流程

1. 确认 UI 名称：必须以 `UI` 结尾。
2. 创建或导入 Prefab/节点树。
3. 按前缀命名需要绑定的节点。
4. 执行前缀组件检查。
5. 生成 UI 脚本。
6. 确认 `UIName.ts` 和 `UIImportAll.ts` 更新。
7. 用 `tyou.ui.showUIAsync(UIName.XxxUI)` 打开。

如果 UI 中包含循环列表，`m_list` 内必须有且只能有一个服务于该列表的 `m_item`。执行前缀组件检查后结构会被规范化为：

```text
m_listX
  content
    m_itemX
```

执行前缀组件检查时，item 脚本会生成到 `Client/assets/scripts/logic/ui/widget/`，类名为 `Item` + `m_item` 后缀，例如 `m_itemContent` -> `ItemContent`；生成 UI 脚本时父 UI 会自动导入并向 `ListView` 注册 item widget。普通动态 widget 选中名称包含 `Widget` 标记的 prefab 或节点后使用“生成Widget脚本”单独生成。

## 报空时优先检查

1. 节点名是否符合 `ui-component-config.json` 前缀。
2. 是否执行过“检查前缀组件”。
3. 是否通过“生成 UI 脚本”创建/更新脚本。
4. `UIName.ts` 是否有枚举。
5. `UIImportAll.ts` 是否有 side-effect import。
6. 预制体内是否有重名节点。

## 重名节点

参与绑定的 `m_` 前缀节点名应优先保持唯一。运行时发现同名绑定节点时：

- `this.get(name)` 返回第一个扫描到的节点，保持兼容。
- 控制台输出包含所有重复节点路径的 warning。
- `this.getAll(name)` 返回所有同名节点。
- `this.getByPath(path)` 可按相对路径取具体节点。
- `this.getRequired(name)` 找不到时会报出包含 UI 名称和节点名的明确错误。

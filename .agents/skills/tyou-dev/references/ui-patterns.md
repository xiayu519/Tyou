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

## 前缀到代码类型

| 前缀 | 组件 | 代码类型 |
| --- | --- | --- |
| `m_go` | Node | `Node` |
| `m_tf` | UITransform | `UITransform` |
| `m_text` | Label | `Label` |
| `m_btn` | Button | `Node` |
| `m_img` | Sprite | `Sprite` |
| `m_grid` | Layout | `Layout` |
| `m_list` | ScrollView/ListView | `ListView` |
| `m_scroll` | ScrollView | `ScrollView` |
| `m_toggle` | Toggle | `Toggle` |
| `m_slider` | Slider | `Slider` |
| `m_progress` | ProgressBar | `ProgressBar` |
| `m_eb` | EditBox | `EditBox` |
| `m_rt` | RichText | `RichText` |

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

## 报空时优先检查

1. 节点名是否符合 `ui-component-config.json` 前缀。
2. 是否执行过“检查前缀组件”。
3. 是否通过“生成 UI 脚本”创建/更新脚本。
4. `UIName.ts` 是否有枚举。
5. `UIImportAll.ts` 是否有 side-effect import。
6. 预制体内是否有重名节点。

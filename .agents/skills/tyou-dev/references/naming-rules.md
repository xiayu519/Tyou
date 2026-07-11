# 命名规范

## TypeScript

- 类名：大驼峰，如 `TestUI`、`ResourceModule`。
- 私有字段：项目现有 UI 示例多用 `_btnEnter` 风格，保持一致。
- 方法：小驼峰，如 `onBtnEnterClick`。
- 异步方法：已有代码使用 `Async` 后缀，如 `showUIAsync`、`loadSceneAsync`。
- 枚举：大驼峰枚举名和值，如 `UIName.TestUI`。

## UI 命名

- UI 类、根节点、Prefab、`UIName` 建议保持同名：`XxxUI`。
- 需要绑定的节点使用 `m_` 前缀。
- 按钮点击方法：`onBtnXxxClick`。

## UI 节点前缀

| 前缀 | 含义 |
| --- | --- |
| `m_go` | 仅 Node |
| `m_tf` | UITransform |
| `m_text` | Label |
| `m_btn` | Button，代码绑定为 Node |
| `m_img` | Sprite |
| `m_grid` | Layout |
| `m_list` | ListView |
| `m_scroll` | ScrollView |
| `m_toggle` | Toggle |
| `m_slider` | Slider |
| `m_progress` | ProgressBar |
| `m_eb` | EditBox |
| `m_rt` | RichText |
| `m_list` + `m_item` | 循环/虚拟列表与唯一 item 模板 |

`m_item` 必须服务于最近的 `m_list`，每个 `m_list` 有且只能有一个 `m_item`。执行前缀组件检查后会固定为 `m_listX/content/m_itemX`。

生成器会将 item/widget 脚本放到：

```text
Client/assets/scripts/logic/ui/widget/
```

列表 item 类名使用 `Item` + `m_item` 后缀，例如 `m_itemContent` 生成 `ItemContent`；同一次生成内出现重复类名必须先重命名节点。通用动态 widget 的 prefab/根节点名必须包含 `Widget` 标记，生成脚本名与 prefab/根节点名一致，例如 `WidgetShop` 生成 `WidgetShop`。

## 资源命名

- `l_` 表示独立图片需要被 `assetool` 收录到资源索引，并供运行时通过逻辑名直接加载，不是所有图片的默认前缀。
- Prefab 固定展示的图片直接静态绑定 `SpriteFrame`，不添加 `l_`。
- 同一 Sprite 按数据切换多张独立图片、配置驱动选择、可选 Bundle 或确实需要延迟加载时，才考虑使用 `l_`；同时必须明确资源 owner 和释放点。
- SpriteAtlas 序列帧优先索引 Atlas，通过 Atlas 名和帧名访问；不要为了逐帧访问给每张底图添加 `l_`。
- 预加载资源可用 `P_` / `p_` 标记。
- 运行时逻辑名通常是文件名；重名时生成器会追加序号。

## 报错提示规则

当 UI 绑定报空时，如果节点名不在本表前缀中，优先提示“命名不符合自动生成规则”，不要直接补手写绑定。

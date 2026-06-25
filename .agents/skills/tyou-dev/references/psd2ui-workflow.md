# PSD 到 UI 工作流

## 工具链

1. Photoshop 导出脚本：`Client/tools/psd/Psd2CCC-Digest.jsx`
2. Photoshop 打标签脚本：`Client/tools/psd/Psd2CCC-LayerTagMenu.jsx`
3. Cocos 导入扩展：`Client/extensions/psd2ccc/`
4. 公共图集检查、前缀组件检查与 UI 脚本生成：`Client/extensions/uitscreate/`
5. 资源索引：`Client/extensions/assetool/`

## 标准流程

1. PSD 放在 `Client/assets/asset-art/psd/`。
2. 如需 `.img` 合图或九宫格参数，先在 Photoshop 选中图层运行 `Psd2CCC-LayerTagMenu.jsx`。
3. 在 Photoshop 运行 `Psd2CCC-Digest.jsx`。
4. 输出 PNG 到 `assets/asset-art/atlas/{psdName}/`。
5. 输出结构 JSON 到 `assets/asset-art/psd/tool/{psdName}/{psdName}-structure.json`。
6. 在 Cocos 资源面板右键 `assets/asset-art/psd/tool/{psdName}/{psdName}-structure.json`，执行“PSD生成UI”。
7. 扩展在当前场景 Canvas 下生成 `{psdName}UI` 节点树。
8. 如需治理重复图片，层级面板右键根节点，执行“🧩 检查公共图集”。
9. 人工调整节点命名，加 `m_btn/m_text/m_img/...` 前缀。
10. 层级面板右键根节点，执行“检查前缀组件”。
11. 右键根节点，执行“生成UI脚本”。
12. 生成/更新 UI 脚本、`UIName.ts`、`UIImportAll.ts`。

## 循环列表

PSD 生成后如需无限/虚拟列表，按以下命名整理节点：

```text
m_listX
  ...任意中间结构...
  m_itemX
```

执行“检查前缀组件”后，工具会把该列表转换成固定可运行结构：

```text
m_listX
  content
    m_itemX
```

规则：

- `m_list` 会补齐 `cc.UITransform`、`cc.ScrollView`、`cc.Mask` 和 `pkg:ListView`。
- `content` 会补齐 `cc.UITransform` 和 `cc.Layout`，使用顶中锚点对齐列表顶部，并写入 `ScrollView.content`。
- `m_item` 会补齐 `cc.UITransform` 和 `pkg:ListItem`，并写入 `ListView.tmpNode`。
- 每个 `m_list` 必须有且只能有一个服务于当前列表的 `m_item`；缺失或多个都会弹出错误，不会静默选择。
- “检查前缀组件”会在 `Client/assets/scripts/logic/ui/widget/` 下生成 item `UIWidget` 脚本；`m_itemContent` 生成 `ItemContent.ts`。之后“生成UI脚本”会让父 UI 绑定 `m_list`，不绑定 `m_item` 内部节点。

普通动态 widget 不使用静态前缀；选中名称包含 `Widget` 标记的 prefab 或节点后使用“生成Widget脚本”生成同名脚本，再由父 UI 运行时动态加载和持有。生成器会维护 `ui/widget/WidgetImportAll.ts` 并由 `UIImportAll.ts` side-effect 引入，防止小游戏构建剔除未直接挂到 UIWindow 注册链的 Widget 类。

## 智能对象

- PSD 导出默认尝试展开智能对象内部结构，让美术常用的嵌套 UI 结构在 Cocos 中生成可编辑子节点。
- 展开后的智能对象会作为 group 节点，内部可见图层继续按普通 group/png/text 规则生成。
- 智能对象打开、解析、坐标映射或递归展开失败时，工具会回退为单张 PNG，并在 report 中记录原因。
- 程序仍在 Cocos 生成后整理节点名；不要求美术在 PSD 图层名中添加 `m_btn/m_text/m_img` 前缀。

## 图像组合

- PSD 中名称以 `.img` 结尾的图层、组合或智能对象一律视为图像组合，会按 Photoshop 视觉结果整合成 PNG 节点。
- `.img` 不继续拆子节点，也不展开智能对象内部，避免剪贴蒙版、调整层、混合效果被拆开后在 Cocos 中失真或遮挡其它 UI。
- `Psd2CCC-LayerTagMenu.jsx` 可对单选或多选图层追加 `.img` 标签；该标签和九宫格是互斥用途，`.img` 导出不参与九宫格裁切。

## 九宫格

PSD 图层后缀：

- `_9s`
- `_scale9`
- `_9s_T_B_L_R`
- `_scale9_T_B_L_R`

导入后会写入 SpriteFrame border，并将 Sprite 设置为 sliced。

`Psd2CCC-LayerTagMenu.jsx` 的九宫格入口会手动填写上/下/左/右数字，并追加 `_9s_T_B_L_R` 后缀。

## 公共图集检查

- PSD 导出阶段不再承担最终 PNG 去重，重复图片会先按图层忠实导出。
- `*-structure.json` 只是生成 UI 的中间结构，不作为最终资源去重依据，也不在公共图集检查中同步修改。
- 生成节点后，在 Cocos 层级面板右键 UI 根节点执行“🧩 检查公共图集”；入口与“生成UI脚本”“检查前缀组件”同级。
- 公共图集检查在 Cocos 侧按解码后的可见 PNG 像素和 SpriteFrame 导入语义做强确定匹配；透明像素 RGB 可忽略，九宫格 border、trim、尺寸等语义不同则不合并。
- 工具优先复用 `assets/asset-art/atlas/common/` 已存在的等价资源；不存在时复制一张代表图到 common。
- 引用替换只基于真实 Cocos UUID：选中节点树 Sprite 组件、可解析 Prefab/Scene，以及 `.prefab/.scene/.anim/.mtl` 文本资源中的 SpriteFrame UUID；不要扫描或替换 `*-structure.json`。
- 删除重复 PNG 前必须确认旧 image UUID 和 SpriteFrame UUID 在 `assets/` 下不再被引用；仍有引用则跳过删除并报告原因。
- 执行过程优先使用 Cocos 编辑器进度反馈；进度接口不可用时回退到控制台日志和完成弹窗。

## AI 注意事项

- 不直接重写 PSD 流程，优先修补现有扩展。
- Cocos 右键流程只从 `*-structure.json` 生成 UI；PSD 切图导出仍在 Photoshop 内运行 `Psd2CCC-Digest.jsx`。
- 公共图集检查不得修改 `*-structure.json`；重新生成 UI 后重新执行“🧩 检查公共图集”即可。
- 生成后文字颜色和 PSD 视觉不一致时，先检查结构 JSON 的 `options.textColor`；修复导出脚本后必须重新在 Photoshop 中导出 JSON。
- 生成节点后不要跳过“前缀组件检查”。
- `m_list` 转循环列表时不要手动拖 `ScrollView.content` 或 `ListView.tmpNode`，应通过“检查前缀组件”统一转换，避免生成结构与脚本不一致。
- `{psdName}UI` 必须与最终 UI 类名、Prefab 名、`UIName` 保持一致。
- PSD 导出资源若要运行时加载，还要考虑资源索引规则。

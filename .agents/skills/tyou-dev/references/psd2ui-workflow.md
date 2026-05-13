# PSD 到 UI 工作流

## 工具链

1. Photoshop 导出脚本：`Client/tools/psd/Psd2CCC-Digest.jsx`
2. Photoshop 打标签脚本：`Client/tools/psd/Psd2CCC-LayerTagMenu.jsx`
3. Cocos 导入扩展：`Client/extensions/psd2ccc/`
4. 前缀组件检查与 UI 脚本生成：`Client/extensions/uitscreate/`
5. 资源索引：`Client/extensions/assetool/`

## 标准流程

1. PSD 放在 `Client/assets/asset-art/psd/`。
2. 如需 `.img` 合图或九宫格参数，先在 Photoshop 选中图层运行 `Psd2CCC-LayerTagMenu.jsx`。
3. 在 Photoshop 运行 `Psd2CCC-Digest.jsx`。
4. 输出 PNG 到 `assets/asset-art/atlas/{psdName}/`。
5. 输出结构 JSON 到 `assets/asset-art/psd/tool/{psdName}/{psdName}-structure.json`。
6. 在 Cocos 资源面板右键 PSD 或结构 JSON，执行“PSD生成UI”。
7. 扩展在当前场景 Canvas 下生成 `{psdName}UI` 节点树。
8. 人工调整节点命名，加 `m_btn/m_text/m_img/...` 前缀。
9. 层级面板右键根节点，执行“检查前缀组件”。
10. 右键根节点，执行“生成UI脚本”。
11. 生成/更新 UI 脚本、`UIName.ts`、`UIImportAll.ts`。

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

## AI 注意事项

- 不直接重写 PSD 流程，优先修补现有扩展。
- 生成节点后不要跳过“前缀组件检查”。
- `{psdName}UI` 必须与最终 UI 类名、Prefab 名、`UIName` 保持一致。
- PSD 导出资源若要运行时加载，还要考虑资源索引规则。

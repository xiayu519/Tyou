# PSD 到 UI 工作流

## 工具链

1. Photoshop 脚本：`Client/tools/psd/Psd2CCC-Digest.jsx`
2. Cocos 导入扩展：`Client/extensions/psd2ccc/`
3. 前缀组件检查与 UI 脚本生成：`Client/extensions/uitscreate/`
4. 资源索引：`Client/extensions/assetool/`

## 标准流程

1. PSD 放在 `Client/assets/asset-art/psd/`。
2. 在 Photoshop 运行 `Psd2CCC-Digest.jsx`。
3. 输出 PNG 到 `assets/asset-art/atlas/{psdName}/`。
4. 输出结构 JSON 到 `assets/asset-art/psd/tool/{psdName}/{psdName}-structure.json`。
5. 在 Cocos 资源面板右键 PSD 或结构 JSON，执行“PSD生成UI”。
6. 扩展在当前场景 Canvas 下生成 `{psdName}UI` 节点树。
7. 人工调整节点命名，加 `m_btn/m_text/m_img/...` 前缀。
8. 层级面板右键根节点，执行“检查前缀组件”。
9. 右键根节点，执行“生成UI脚本”。
10. 生成/更新 UI 脚本、`UIName.ts`、`UIImportAll.ts`。

## 九宫格

PSD 图层后缀：

- `_9s`
- `_scale9`
- `_9s_T_B_L_R`
- `_scale9_T_B_L_R`

导入后会写入 SpriteFrame border，并将 Sprite 设置为 sliced。

## AI 注意事项

- 不直接重写 PSD 流程，优先修补现有扩展。
- 生成节点后不要跳过“前缀组件检查”。
- `{psdName}UI` 必须与最终 UI 类名、Prefab 名、`UIName` 保持一致。
- PSD 导出资源若要运行时加载，还要考虑资源索引规则。

## Why

美术有时只想在交付给 `Psd2CCC-Digest.jsx` 前，把明确标记为 `.img` 的组合压成单图层，同时保留其它 PSD 结构可继续被 Digest 拆成可编辑节点。现有 `PSD2UIForm-导出PSD.jsx` 会额外处理特效、蒙版、剪贴蒙版等内容，作为 Tyou 通用前置步骤过重。

## What Changes

- 新增一个独立 Photoshop JSX 脚本，放在 `Client/tools/psd/`。
- 脚本仅处理名称以 `.img` 结尾的 `LayerSet`：在副本文档中把该组合按 Photoshop 当前视觉结果合并成单个像素图层，并保留 `.img` 后缀名称。
- 脚本将处理后的副本文档另存为新的 PSD，默认文件名使用原文件名追加 `_ImgFlatten.psd`。
- 不修改 `Psd2CCC-Digest.jsx`、Cocos 导入扩展、资源索引、UI 运行时或现有 PSD 标准流程。

## Capabilities

### New Capabilities
- `psd-img-flatten-export`: 约束独立 Photoshop 导出脚本对 `.img` 组合压平和另存 PSD 的可观察行为。

### Modified Capabilities
- 无。

## Impact

- 新增文件：`Client/tools/psd/Psd2CCC-ExportImgFlattenPSD.jsx`
- 不影响现有 `Psd2CCC-Digest.jsx` 输出 PNG/JSON 的协议。
- 不影响 Cocos Creator 扩展、Prefab、Scene、meta、`ty-framework` 或 Luban。

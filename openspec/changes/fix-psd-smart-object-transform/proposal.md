## Why

PSD2CCC 展开智能对象时，部分未打 `.img` 的智能对象在 Cocos 中出现图标压扁、内容碎片偏移和表现不贴近 PSD 的问题。当前映射逻辑疑似以智能对象文档画布尺寸为基准，遇到内部透明边距或可见区域不贴边时会产生错误缩放。

## What Changes

- 修正 Photoshop 导出脚本中智能对象展开的坐标映射基准。
- 保持 `.img` 显式合图规则不变，不新增自动判断合图策略。
- 增加轻量诊断信息，便于确认智能对象展开使用的内部可见区域。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `psd-ui-generation`: 智能对象展开时应使用内部可见内容区域进行坐标映射，而不是简单使用智能对象文档画布尺寸。

## Impact

- 影响 `Client/tools/psd/Psd2CCC-Digest.jsx` 的智能对象展开导出逻辑。
- 影响 PSD 重新导出的 `*-structure.json` 和 atlas PNG 尺寸/坐标。
- 不修改 `Client/assets/ty-framework/`，不修改 Cocos 运行时 UI 框架。

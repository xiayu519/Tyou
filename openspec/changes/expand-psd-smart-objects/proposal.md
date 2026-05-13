## Why

当前 PSD2CCC 会把 Photoshop 智能对象栅格化成单张 PNG，导致美术常用的嵌套 UI 结构在 Cocos 中丢失为一个 Sprite，程序无法在生成后拆分、重命名和接入 UI 脚本。`TestPsd_dzxq` 还暴露了生成节点的坐标和层级与 PSD 视觉不一致的问题，现有结果无法作为可用 Prefab 基础。

## What Changes

- **BREAKING**: PSD 导出默认尝试展开智能对象内部结构，不再默认把智能对象合成为单张 PNG。
- 智能对象展开失败、遇到暂不支持的复杂情况时，回退为现有 PNG 导出并在报告中记录原因。
- 修正 PSD 到 Cocos 节点生成的层级顺序，避免按钮、图标等前景层被背景层遮挡。
- 修正 group/child 坐标协议或生成逻辑，解决 `TestPsd_dzxq` 中左下背景图明显偏移的问题。
- 保持九宫格手工命名规则和现有 JSON/PNG 导入链路可继续工作。

## Capabilities

### New Capabilities
- `psd-ui-import`: PSD 到 Cocos UI 节点树的导出和生成行为，包括智能对象展开、坐标、层级和失败降级。

### Modified Capabilities
- 无

## Impact

- 影响 Photoshop 导出脚本：`Client/tools/psd/Psd2CCC-Digest.jsx`。
- 影响 Cocos 导入扩展：`Client/extensions/psd2ccc/source/scene-walker.ts` 及构建产物。
- 不修改 `Client/assets/ty-framework/` 框架代码。
- 不改变 UI 脚本生成工具的工作流；程序仍可在 Cocos 生成后重命名节点并执行前缀组件检查。

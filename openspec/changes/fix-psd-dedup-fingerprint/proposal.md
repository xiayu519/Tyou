## Why

PSD2CCC 当前用尺寸加直方图作为 PNG 去重指纹，直方图不能区分像素排列不同但颜色分布接近的图。师祖赐福 PSD 中 `img_masterlove_once` 被误复用为 `img_masterlove_five`，说明现有去重会把不同 UI 资源合并错。

## What Changes

- 将 PSD 导出脚本的 PNG 去重判断改为精确内容指纹，只有导出结果完全一致时才复用已有 PNG。
- 普通图层、`.img` 合图和九宫格裁切后的 PNG 都使用同一套精确指纹规则。
- 保持已有 `dedup` 统计和 `relativePath` 复用语义。
- 不修改 Cocos 导入端、不修改 Prefab、不自动清理 PSD 中已有重叠合成层。

## Capabilities

### New Capabilities
- `psd-ui-generation`: PSD 导出与 Cocos UI 生成链路中 PNG 切图去重的可观察行为。

### Modified Capabilities

## Impact

- 影响 `Client/tools/psd/Psd2CCC-Digest.jsx` 的 PNG 去重逻辑。
- 重新在 Photoshop 中导出 PSD 后，`*-structure.json` 中误复用的 `relativePath` 会恢复为独立 PNG。
- 对真实完全一致的 PNG 仍会复用，资源数量只会在之前误判重复的场景增加。

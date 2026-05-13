## Why

当前 PSD 导出脚本已经支持 `.img` 图层/组合按视觉结果合成为单张 PNG，也支持手写九宫格后缀，但 Photoshop 内没有项目定制的轻量打标签入口。程序或美术需要手动拼接后缀，容易写错参数顺序或重复追加标签。

## What Changes

- 新增一个与 `Psd2CCC-Digest.jsx` 同目录的 Photoshop JSX 打标签脚本。
- 脚本仅覆盖项目当前需要的两个标签动作：追加 `.img`，以及通过输入上/下/左/右数值追加九宫格后缀。
- 支持单选/多选图层，尽量保留原 Photoshop 选择状态。
- 将 `.img` 合图规则同步到项目 README 的 PSD 流程说明。
- 不修改 PSD 解析主流程、不修改 Cocos 导入扩展、不修改 `Client/assets/ty-framework/`。

## Capabilities

### New Capabilities
- `psd-layer-tagging`: 覆盖 Photoshop 内为 PSD 图层批量追加 `.img` 与九宫格命名后缀的辅助行为。

### Modified Capabilities
- 无。

## Impact

- 影响 `Client/tools/psd/` 下的 Photoshop 脚本文件。
- 影响项目 README 中 PSD → UI 流程的图层命名说明。
- 不引入新的运行时依赖，不影响 Cocos Creator 运行时代码。
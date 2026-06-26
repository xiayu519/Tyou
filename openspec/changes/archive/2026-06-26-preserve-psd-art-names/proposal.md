## Why

当前 `Psd2CCC-Digest.jsx` 会把 PSD 名和图层路径做中文转拼音首字母、拼接父级路径并追加短 hash，导致美术反复调图、调九宫格时资源文件名不直观，且图层路径变化容易生成新 PNG 和新 uuid。用户希望普通 PSD 导出的文件夹和图片名直接沿用美术在 PSD 中的原名，减少 uuid 丢失和沟通成本。

## What Changes

- `Psd2CCC-Digest.jsx` 的普通 PSD 图集目录名改为使用 PSD 文件名本身，不再中文转英文。
- 普通 PSD 导出的 PNG 文件名改为使用 PSD 图层/合图后的图片名本身，不再拼父级路径、不再中文转英文、不再追加 hash。
- 当同一个 PSD 中导出图片重名时，第一张保留原名，后续同名图片依次追加 `1`、`2`、`3` 等数字。
- 继续对文件系统非法字符做最小替换，避免 Windows/Photoshop 无法保存。
- `.img`、九宫格 `_9s...` / `_scale9...` 后缀继续作为工具标签剥离，不参与 PNG 文件名，保证合图标签和九宫格参数不改资源文件名。
- `common` 公共图集命名规则保持不变，继续使用内容指纹生成 `common_xxx`。

## Capabilities

### New Capabilities
- `psd-export-naming`: 约束普通 PSD 导出图集目录、PNG 文件名、重复名和 `common` 命名的可观察行为。

### Modified Capabilities
- 无。

## Impact

- Photoshop 导出脚本：`Client/tools/psd/Psd2CCC-Digest.jsx`
- Cocos 导入扩展 legacy prefix helper：`Client/extensions/psd2ccc/source/psd-legacy.ts` 及编译后的 `dist/psd-legacy.js`
- 文档/规范：`README.md`、`.agents/skills/tyou-dev/references/psd2ui-workflow.md`、`openspec/specs/`
- 不影响 `Client/extensions/psd2ccc/source/common-atlas-checker.ts` 的 `common` 命名规则。
- 不修改 `Client/assets/ty-framework/`、Prefab、Scene、Luban 或资源索引运行时。

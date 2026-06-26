## Why

当前 PSD 导出虽然已经让 PNG 文件名保留美术原名，但结构 JSON 的 `name` 仍会带 `.img`、`_9s...` 等工具后缀，导致“PSD生成UI”后的节点名混入功能标签。公共图集仍使用 `common_<hash>` 命名，也不利于后续换皮时按原图名直接覆盖。

## What Changes

- `Psd2CCC-Digest.jsx` 生成结构 JSON 时，UI-facing `name` 剥离 `.img`、`_9s`、`_scale9` 及参数化九宫格后缀。
- 普通 PNG 的 `relativePath` 和 JSON `name` 继续使用同一套工具后缀剥离规则，避免文件名和 UI 节点名分叉。
- 公共图集检查创建 common PNG 时，使用来源 PNG 的美术基名，不再新建 `common_<hash>.png`。
- common 目录中目标美术名已被不同内容占用时，后续 common 文件依次追加 `1`、`2`、`3` 等数字。
- 公共图集仍按内容指纹判断等价资源和复用关系，不改变 SpriteFrame border、trim、尺寸等去重语义。

## Capabilities

### New Capabilities
- 无。

### Modified Capabilities
- `psd-export-naming`: 结构 JSON/UI 节点名剥离工具后缀，并将 common 命名从内容 hash 文件名改为来源美术名。

## Impact

- Photoshop 导出脚本：`Client/tools/psd/Psd2CCC-Digest.jsx`
- Cocos 公共图集检查：`Client/extensions/psd2ccc/source/common-atlas-checker.ts` 及编译后的 `dist/common-atlas-checker.js`
- 文档/规范：`README.md`、`.agents/skills/tyou-dev/references/psd2ui-workflow.md`、`openspec/specs/psd-export-naming/spec.md`
- 不修改 `Client/assets/ty-framework/`、Prefab、Scene、Luban 或资源索引运行时。

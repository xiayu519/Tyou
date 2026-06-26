## ADDED Requirements

### Requirement: PSD 导出目录保留 PSD 原名
`Psd2CCC-Digest.jsx` SHALL use the PSD file base name as the ordinary atlas folder name without converting Chinese characters to English or pinyin.

#### Scenario: 中文 PSD 名导出目录
- **WHEN** 用户在 Photoshop 中对 `活动弹窗.psd` 执行 `Psd2CCC-Digest.jsx`
- **THEN** PNG atlas folder SHALL be `assets/asset-art/atlas/活动弹窗`
- **THEN** structure JSON `atlasPath` SHALL be `asset-art/atlas/活动弹窗`

### Requirement: PSD 图片文件保留图层原名
`Psd2CCC-Digest.jsx` SHALL use the exported PSD image layer name as the ordinary PNG file base name without converting Chinese characters to English or pinyin, without prepending the PSD name, without prepending parent group names, and without appending a hash.

#### Scenario: 中文图层名导出 PNG
- **WHEN** 用户导出一个名为 `背景` 的可见图片图层
- **THEN** 导出的 PNG 文件名 SHALL be `背景.png`
- **THEN** structure JSON `relativePath` for that PNG SHALL be `背景`

#### Scenario: 九宫格参数调整不改变 PNG 名
- **WHEN** 用户分别导出名为 `背景_9s_20_20_20_20` 和 `背景_9s_30_30_30_30` 的同一图片图层
- **THEN** both exports SHALL use `背景.png` as the PNG file name when no other exported image already uses that name

#### Scenario: `.img` 合图标签不进入 PNG 名
- **WHEN** 用户导出一个名为 `按钮.img` 的图像组合
- **THEN** 导出的 PNG 文件名 SHALL be `按钮.png` when no other exported image already uses that name
- **THEN** structure JSON `relativePath` for that PNG SHALL be `按钮`

### Requirement: PSD 导出重复图片名追加数字
`Psd2CCC-Digest.jsx` SHALL avoid overwriting repeated ordinary PNG names by appending increasing decimal digits to subsequent duplicate file base names.

#### Scenario: 重复图层名导出
- **WHEN** 同一次 Digest 导出中存在三个导出图片基名都为 `按钮` 的图层
- **THEN** first PNG SHALL be `按钮.png`
- **THEN** second PNG SHALL be `按钮1.png`
- **THEN** third PNG SHALL be `按钮2.png`

### Requirement: PSD 导出仅做文件系统必要清洗
`Psd2CCC-Digest.jsx` SHALL preserve art-facing names except for characters that cannot be saved as Windows file names or empty names.

#### Scenario: 非法字符替换
- **WHEN** 导出图片名包含 Windows 文件名非法字符
- **THEN** script SHALL replace only those illegal characters with `_`
- **THEN** script MUST NOT convert Chinese characters to English or pinyin

### Requirement: Common 图集命名保持内容指纹规则
The common atlas checker SHALL keep using the existing `common_<hash>` naming rule and MUST NOT switch common assets to PSD art names.

#### Scenario: 公共图集命名
- **WHEN** 公共图集检查创建一个新的 common PNG
- **THEN** its file name SHALL continue to use the `common_<hash>.png` format

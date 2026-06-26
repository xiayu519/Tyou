## MODIFIED Requirements

### Requirement: PSD 图片文件保留图层原名
`Psd2CCC-Digest.jsx` SHALL use the exported PSD image layer name as the ordinary PNG file base name and structure JSON UI-facing `name` without converting Chinese characters to English or pinyin, without prepending the PSD name, without prepending parent group names, and without appending a hash. Tool suffixes such as `.img`, `_9s`, `_scale9`, `_9s_T_B_L_R`, and `_scale9_T_B_L_R` SHALL be stripped from both the PNG file base name and the structure JSON `name`.

#### Scenario: 中文图层名导出 PNG 和 JSON 名称
- **WHEN** 用户导出一个名为 `背景` 的可见图片图层
- **THEN** 导出的 PNG 文件名 SHALL be `背景.png`
- **THEN** structure JSON `relativePath` for that PNG SHALL be `背景`
- **THEN** structure JSON `name` for that PNG node SHALL be `背景`

#### Scenario: 九宫格参数调整不改变 PNG 名和 JSON 名称
- **WHEN** 用户分别导出名为 `背景_9s_20_20_20_20` 和 `背景_9s_30_30_30_30` 的同一图片图层
- **THEN** both exports SHALL use `背景.png` as the PNG file name when no other exported image already uses that name
- **THEN** structure JSON `name` for each exported PNG node SHALL be `背景`

#### Scenario: `.img` 合图标签不进入 PNG 名和 JSON 名称
- **WHEN** 用户导出一个名为 `按钮.img` 的图像组合
- **THEN** 导出的 PNG 文件名 SHALL be `按钮.png` when no other exported image already uses that name
- **THEN** structure JSON `relativePath` for that PNG SHALL be `按钮`
- **THEN** structure JSON `name` for that PNG node SHALL be `按钮`

### Requirement: Common 图集命名保持内容指纹规则
The common atlas checker SHALL keep using content fingerprints to decide whether SpriteFrame assets are equivalent, and SHALL name newly created common PNG files from the source art base name instead of creating `common_<hash>.png` files. If the desired common file name is already occupied by different content, the checker SHALL append increasing decimal digits to the source art base name.

#### Scenario: 公共图集使用来源美术名
- **WHEN** 公共图集检查为来源 PNG `按钮.png` 创建新的 common PNG
- **THEN** the new common PNG file name SHALL be `按钮.png`
- **THEN** the checker MUST NOT create a new `common_<hash>.png` file for that source

#### Scenario: 公共图集同名不同内容追加数字
- **WHEN** 公共图集检查要为来源 PNG `按钮.png` 创建 common PNG
- **AND** `assets/asset-art/atlas/common/按钮.png` already exists with a different content fingerprint
- **THEN** the new common PNG file name SHALL be `按钮1.png` when that name is available

#### Scenario: 公共图集仍按内容指纹复用
- **WHEN** 公共图集检查发现 existing common PNG has the same content fingerprint and SpriteFrame import semantics as the source PNG
- **THEN** the checker SHALL reuse the equivalent common SpriteFrame instead of creating a duplicate for the same content

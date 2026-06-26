## ADDED Requirements

### Requirement: PSD img 组合压平另存
Photoshop export script SHALL create a processed PSD copy in which every visible or hidden layer group whose name ends with `.img` is flattened into a single image layer while keeping other PSD structure unchanged.

#### Scenario: 压平 img 组合
- **WHEN** 用户打开 PSD 并运行 img 压平导出脚本，且文档包含名称以 `.img` 结尾的组合
- **THEN** 脚本在副本文档中将该组合合并为一个图层
- **THEN** 合并后的图层名称 MUST keep the `.img` suffix

#### Scenario: 保留非 img 组合结构
- **WHEN** 用户运行 img 压平导出脚本，且文档包含名称不以 `.img` 结尾的组合
- **THEN** 脚本 MUST preserve that group as a group unless it is contained inside a flattened `.img` group

#### Scenario: 原始 PSD 不被修改
- **WHEN** 用户运行 img 压平导出脚本并完成或取消保存
- **THEN** 原始 Photoshop 文档 MUST remain open and unmodified by the script workflow

#### Scenario: 另存新 PSD
- **WHEN** 用户运行 img 压平导出脚本并选择保存位置
- **THEN** 脚本 SHALL save the processed copy as a PSD file
- **THEN** 默认保存文件名 SHALL append `_ImgFlatten.psd` to the original PSD base name

#### Scenario: 不导出 PNG 或结构 JSON
- **WHEN** 用户运行 img 压平导出脚本
- **THEN** 脚本 MUST NOT write PNG atlas files
- **THEN** 脚本 MUST NOT write `*-structure.json` or report JSON files

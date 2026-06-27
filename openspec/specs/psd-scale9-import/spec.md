# psd-scale9-import Specification

## Purpose
TBD - created by archiving change persist-psd-scale9-meta. Update Purpose after archive.
## Requirements
### Requirement: structure border 通过 AssetDB 持久化

PSD UI 导入扩展 SHALL 将 structure JSON 的 `sliceBorder` 通过 AssetDB 保存到对应 image asset 的 sprite-frame meta，SHALL 在保存后重新导入资源并回读校验，MUST NOT 只修改运行时 SpriteFrame inset 来代表持久化成功。

#### Scenario: 旧 meta 与 structure 不一致
- **WHEN** structure JSON 的 border 为 `100/100/100/100`，而 AssetDB meta 中仍为其它值
- **THEN** 扩展通过 `save-asset-meta` 保存 structure border
- **AND** reimport 后回读的四个 border 均为 `100`

#### Scenario: 资源尚未完成导入
- **WHEN** structure 引用的 PNG 尚无可查询的 AssetDB UUID 或 sprite-frame meta
- **THEN** 扩展中止本次 UI 生成并提示等待资源导入后重试

#### Scenario: 持久化校验失败
- **WHEN** 保存和 reimport 后回读的 border 与 structure 不一致
- **THEN** 扩展报告具体资源并中止 UI 生成

### Requirement: 公共图集继续使用持久化 SpriteFrame 语义

公共图集检查 SHALL 继续使用实际 AssetDB meta 中的 border、trim、尺寸等 SpriteFrame 语义生成指纹，不得仅因像素相同而合并语义不同的资源。

#### Scenario: 像素相同且持久化 border 相同
- **WHEN** 两张 PNG 的解码像素和持久化 SpriteFrame 语义均相同
- **THEN** 公共图集检查将它们视为同一指纹候选

#### Scenario: 像素相同但持久化 border 不同
- **WHEN** 两张 PNG 解码像素相同但持久化 border 不同
- **THEN** 公共图集检查保留两者，不进行不安全合并


# psd-scale9-export Specification

## Purpose
TBD - created by archiving change fix-psd-scale9-zero-insets. Update Purpose after archive.
## Requirements
### Requirement: 显式九宫格支持零 inset 和单轴裁切

`Psd2CCC-Digest.jsx` SHALL 独立判断显式九宫格的水平和垂直裁切。任意 inset 为 0 MUST NOT 中止其它有效方向；某一轴的起止 inset 均为 0 时 MUST 保持该轴原始尺寸；任一启用轴只有单侧 inset 为 0 时 MUST 避免创建 0 像素裁切区域。

#### Scenario: 左右均为 0
- **WHEN** 图层使用 `_9s_T_B_0_0` 且上下 inset 可裁切
- **THEN** 导出 PNG 保持原始宽度并只压缩高度方向的中心区域

#### Scenario: 上下均为 0
- **WHEN** 图层使用 `_9s_0_0_L_R` 且左右 inset 可裁切
- **THEN** 导出 PNG 保持原始高度并只压缩宽度方向的中心区域

#### Scenario: 单侧 inset 为 0
- **WHEN** 某一启用裁切的轴只有起始或末端 inset 为 0
- **THEN** 脚本完成该轴裁切且不执行 0 像素区域 crop

#### Scenario: 四个 inset 全为 0
- **WHEN** 图层使用 `_9s_0_0_0_0`
- **THEN** 脚本保留 PNG 原始宽高并继续输出合法九宫格 border 数据


## ADDED Requirements

### Requirement: PSD PNG 去重使用精确内容指纹

PSD 导出脚本 SHALL 只在导出后的 PNG 内容完全一致时复用已有 PNG 资源路径。

#### Scenario: 不同文字图层不被误去重
- **WHEN** 两个 PSD 图层导出的 PNG 尺寸相同但像素内容不同
- **THEN** 导出脚本 SHALL 为它们生成不同的 `relativePath`
- **AND** 结构 JSON MUST NOT 将后导出的图层指向前一个不同 PNG

#### Scenario: 完全一致 PNG 仍然复用
- **WHEN** 两个 PSD 图层导出的 PNG 内容完全一致
- **THEN** 导出脚本 SHALL 复用已有 PNG 的 `relativePath`
- **AND** 导出报告中的 `dedup` 统计 SHALL 继续记录该复用

#### Scenario: 九宫格裁切后按最终 PNG 去重
- **WHEN** PSD 图层带 `_9s_T_B_L_R` 或 `_scale9_T_B_L_R` 后缀
- **THEN** 导出脚本 SHALL 在完成九宫格裁切后计算 PNG 去重指纹
- **AND** 只有最终裁切 PNG 内容完全一致时才复用已有 PNG

#### Scenario: 完全透明像素 RGB 差异不阻止复用
- **WHEN** 两个 PSD 图层导出的 PNG 可见像素一致，但完全透明像素下方 RGB 数据不同
- **THEN** 导出脚本 SHALL 将它们视为相同视觉内容并复用已有 PNG 的 `relativePath`
- **AND** 半透明像素、非透明像素或九宫格边界不同 MUST NOT 被该规则忽略

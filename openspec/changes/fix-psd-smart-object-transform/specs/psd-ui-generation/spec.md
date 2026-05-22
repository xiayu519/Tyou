# psd-ui-generation Specification Delta

## ADDED Requirements

### Requirement: 智能对象展开使用内部可见 bounds 映射

PSD 导出脚本在展开未显式 `.img` 的智能对象时，SHALL 使用智能对象内部可见像素 bounds 作为坐标映射基准，而不是无条件使用智能对象内容文档的画布尺寸。

#### Scenario: 智能对象内部存在透明边距

- **WHEN** 智能对象内容文档的可见像素范围小于内容文档画布
- **AND** 智能对象未以 `.img` 结尾
- **THEN** 导出脚本 SHALL 将内部可见像素 bounds 映射到外层智能对象图层 bounds
- **AND** 展开的子节点位置与尺寸 SHOULD 尽量贴近 Photoshop 中的智能对象显示结果

#### Scenario: 内部可见 bounds 无法计算

- **WHEN** Photoshop 无法通过合并可见图层或图层 bounds union 计算智能对象内部可见 bounds
- **THEN** 导出脚本 SHALL 回退到原有文档画布尺寸映射
- **AND** 导出报告 SHOULD 记录 warning，说明该智能对象使用了回退映射

#### Scenario: 显式 img 标签保持合图

- **WHEN** 智能对象、图层或组名称以 `.img` 结尾
- **THEN** 导出脚本 SHALL 保持现有合图 PNG 导出行为
- **AND** 导出脚本 MUST NOT 自动判断其它智能对象是否应该合图

### Requirement: 不支持的智能对象变换回退为 PNG

PSD 导出脚本在遇到智能对象包含 warp、包络变形、旋转、透视或其它无法用当前 Cocos 节点树表达的非矩形变换时，SHALL 回退为单张 PNG，而不是继续展开子节点。

#### Scenario: 智能对象包含包络变形

- **WHEN** 智能对象图层包含 `customEnvelopeWarp` 或非 none 的 warp 设置
- **THEN** 导出脚本 SHALL 不展开该智能对象
- **AND** 普通图层导出流程 SHALL 将其按 Photoshop 当前视觉结果导出为 PNG
- **AND** report SHALL 记录该智能对象因不支持的变换回退

#### Scenario: 智能对象是普通轴对齐缩放

- **WHEN** 智能对象图层只有轴对齐矩形缩放
- **THEN** 导出脚本 MAY 继续按内部可见 bounds 展开

### Requirement: 智能对象内部合成语义无法还原时回退为 PNG

PSD 导出脚本在展开智能对象前，SHALL 检查其内容文档是否包含剪贴蒙版或调整层；当当前 Cocos 节点树无法保持这些 Photoshop 合成语义时，SHALL 回退为单张 PNG。

#### Scenario: 智能对象内容包含剪贴蒙版

- **WHEN** 智能对象内容文档存在 grouped/clipped 图层
- **THEN** 导出脚本 SHALL 不继续拆分该智能对象内容
- **AND** 普通图层导出流程 SHALL 将该智能对象按 Photoshop 当前视觉结果导出为 PNG
- **AND** report SHALL 记录该智能对象因剪贴蒙版回退

#### Scenario: 智能对象内容包含调整层

- **WHEN** 智能对象内容文档存在 Photoshop 调整层
- **THEN** 导出脚本 SHALL 回退为 PNG，避免调整层被跳过后视觉失真

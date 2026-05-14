# psd-layer-tagging Specification

## Purpose
定义 PSD Photoshop 标签脚本对 `.img` 合图与九宫格后缀的可观察行为，并约束项目 README 对 `.img` 导出规则的说明。

## Requirements
### Requirement: PSD 图层 img 标签追加
Photoshop 标签脚本 SHALL allow users to append the `.img` suffix to the currently selected PSD layer or layers.

#### Scenario: 单个图层追加 img 标签
- **WHEN** 用户在 Photoshop 中选中一个未带 `.img` 后缀的图层并执行 img 标签动作
- **THEN** 脚本将该图层名称追加 `.img`

#### Scenario: 多个图层追加 img 标签
- **WHEN** 用户在 Photoshop 中多选图层并执行 img 标签动作
- **THEN** 脚本将每个未带 `.img` 后缀的选中图层追加 `.img`

#### Scenario: 避免重复追加 img 标签
- **WHEN** 选中图层名称已经以 `.img` 结尾
- **THEN** 脚本 MUST keep that layer name unchanged for the img action

### Requirement: PSD 九宫格标签追加
Photoshop 标签脚本 SHALL allow users to enter top, bottom, left, and right inset values and append a `_9s_T_B_L_R` suffix to the selected PSD layer or layers.

#### Scenario: 输入九宫格参数
- **WHEN** 用户填写上、下、左、右四个非负整数并确认
- **THEN** 脚本将选中图层名称追加 `_9s_上_下_左_右` 后缀

#### Scenario: 九宫格参数非法
- **WHEN** 任一九宫格输入值为空、非数字或小于 0
- **THEN** 脚本 MUST reject the operation and leave selected layer names unchanged

#### Scenario: 替换已有九宫格标签
- **WHEN** 选中图层名称已经带 `_9s`、`_scale9` 或其参数化后缀
- **THEN** 脚本 SHALL replace the existing nine-slice suffix with the newly entered `_9s_T_B_L_R` suffix

### Requirement: PSD 九宫格可视化编辑
Photoshop 标签脚本 SHALL provide a visual nine-slice preview for a single selected layer when the selected layer can be rendered to a temporary preview image, SHALL repaint guide positions during dialog interaction when numeric values change, and SHALL clean up temporary preview resources when the dialog closes.

#### Scenario: 单选图层显示九宫格预览
- **WHEN** 用户在 Photoshop 中选中一个可渲染图层并打开标签脚本
- **THEN** 九宫格区域显示该图层的预览图和四条可视化切分线

#### Scenario: 手动输入同步预览
- **WHEN** 用户手动修改上、下、左、右数字输入框并输入合法非负整数
- **THEN** 预览图上的九宫格切分线同步到对应位置
- **THEN** 该同步在输入变化期间可见，不需要关闭并重新打开标签脚本

#### Scenario: 确认九宫格标签
- **WHEN** 用户确认九宫格设置
- **THEN** 标签脚本追加或替换 `_9s_T_B_L_R` 后缀并使用当前输入框中的值

#### Scenario: 预览资源清理
- **WHEN** 用户通过确定、取消或关闭窗口结束标签脚本对话框
- **THEN** 标签脚本 MUST close temporary preview documents and remove temporary preview image files on a best-effort basis

#### Scenario: 预览不可用时保留手动流程
- **WHEN** 选中多个图层或 Photoshop 无法生成预览图
- **THEN** 标签脚本仍允许用户通过上、下、左、右数字输入框追加 `_9s_T_B_L_R` 后缀

#### Scenario: 九宫格切分线边界限制
- **WHEN** 用户输入数值导致左右或上下内边距超出图像尺寸
- **THEN** 标签脚本 MUST clamp the values to keep all guide lines inside the preview image bounds

### Requirement: PSD 标签脚本选择保持
Photoshop 标签脚本 SHALL preserve the user's selected layer set after a successful or rejected tagging operation when Photoshop exposes selected layer IDs.

#### Scenario: 标签操作后恢复选择
- **WHEN** 用户对一个或多个选中图层执行标签动作
- **THEN** 脚本完成后仍选中原来的图层集合

### Requirement: 项目文档记录 img 合图规则
The project README SHALL document that PSD layers, groups, or smart objects whose names end with `.img` are exported as one composite PNG node by `Psd2CCC-Digest.jsx`.

#### Scenario: README 描述 img 规则
- **WHEN** 用户阅读项目 README 的 PSD 图层规范
- **THEN** README explains the `.img` suffix behavior and its relationship to composite PNG export


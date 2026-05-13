## ADDED Requirements

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
## Context

`Psd2CCC-Digest.jsx` 已经用 `buildExportName()` 剥离 `.img` 和九宫格后缀来生成 PNG 文件名，但 JSON 节点的 `name` 仍直接写入原始图层名 `nm`。Cocos 侧“PSD生成UI”按结构 JSON 生成节点，因此功能性后缀会继续出现在 UI 层级里。

公共图集检查当前按像素和 SpriteFrame 导入语义生成内容指纹，再用 `common_<hash>` 文件名创建 common PNG。这个命名利于避免冲突，但不利于换皮覆盖和美术定位资源。

## Goals / Non-Goals

**Goals:**

- JSON `name` 使用面向 UI 的干净图层名，剥离 `.img`、`_9s`、`_scale9` 及参数化九宫格后缀。
- PNG `relativePath` 和 JSON `name` 对同一个图层使用一致的工具后缀剥离规则。
- common PNG 新建时使用来源 PNG 的美术基名。
- common 名称冲突时追加紧贴数字，不覆盖已有不同内容资源。
- 保持 common 的内容指纹匹配、SpriteFrame 语义检查和 UUID 替换流程不变。

**Non-Goals:**

- 不修改 Photoshop 打标签脚本的标签追加规则。
- 不改变 UI 节点树结构、布局、文本、九宫格 border 或 SpriteFrame 导入参数。
- 不批量迁移所有历史 common 资源；仅在公共图集检查处理到等价资源时采用新命名/可安全复用的资源。
- 不修改 `Client/assets/ty-framework/`、Prefab、Scene、Luban 或资源索引运行时。

## Decisions

### 1. 在 Digest 生成 JSON 时过滤 UI 节点名

`.img` 和九宫格后缀是 Photoshop 导出阶段的工具标签。导出脚本解析完标签后，结构 JSON 不应再把标签暴露给下游 UI 生成器。这样 `bg1_9s_120_120_120_120` 的 JSON `name` 直接变成 `bg1`，Cocos 生成器不需要理解 Photoshop 标签细节。

### 2. 复用同一套工具后缀剥离函数

Digest 增加一个 `stripToolSuffixes()` 小函数，内部复用九宫格剥离并移除 `.img`。`buildExportName()` 和 JSON `name` 都调用它，避免文件名是 `bg1` 但节点名仍是 `bg1_9s...` 的分叉。

### 3. common 文件名使用来源 PNG 基名，内容指纹仍负责判重

公共图集仍先按指纹找到等价图片；创建 common 时只改变目标文件名来源，不改变“哪些图片可以合并”的判断。目标名使用来源 PNG 的 `baseName`，仅做文件系统非法字符清洗和工具后缀剥离。

### 4. common 名称冲突追加数字

如果 `common/按钮.png` 已存在且内容指纹不同，则尝试 `按钮1.png`、`按钮2.png`，直到找到空位或同指纹可复用文件。这样不会覆盖不同内容，也保留换皮覆盖时可读的文件名。

## Risks / Trade-offs

- [Risk] 历史 `common_<hash>.png` 资源不会在未参与本次检查时自动改名。Mitigation: 本次只改公共图集检查的新建/处理路径，避免脱离引用上下文批量移动资源。
- [Risk] 多个不同来源名指向同一内容时，common 名称取决于本次重复组的代表图。Mitigation: 内容指纹仍保证合并正确；同名冲突使用数字后缀避免覆盖。
- [Risk] 美术命名包含 Windows 非法字符时无法完全原样。Mitigation: 仍只做保存文件所必需的最小清洗。

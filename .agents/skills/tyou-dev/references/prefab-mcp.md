# Prefab MCP 精简指南

本文件只描述 AI 创建 UI Prefab 需要的最小 MCP 能力。不要读取或依赖完整通用 MCP 工具全集，避免 token 浪费。

## 使用场景

仅当没有 PSD，且开发者希望 AI 自动创建简单 UI 原型或弹窗时使用。

优先级仍然是：

1. PSD 一键生成。
2. AI + 精简 MCP 创建。
3. 手动拼。
4. AI 结构化 JSON 编辑。

直接编辑源 `.prefab` JSON 的授权和边界见 `prefab-workflow.md`；本文件只描述 MCP 方式。

## 需要的 MCP 能力

只需要这几类能力：

| 能力 | 用途 |
| --- | --- |
| 查询当前场景/Canvas | 找到 UI 根节点或确认场景可编辑 |
| 创建 Node | 创建 UI 根节点和子节点 |
| 设置 Transform/UITransform | 设置位置、尺寸、锚点 |
| 添加组件 | 添加 Sprite、Label、Button、Layout、ScrollView 等必要组件 |
| 保存 Prefab | 将节点树保存到 `Client/assets/asset-raw/ui/` |
| 刷新资源 | 让 Cocos 识别新 Prefab 和 meta |

不需要场景分析、性能调试、广播、偏好设置、复杂资源分析等通用 MCP 能力。

## AI 创建步骤

1. 明确 UI 名称，必须以 `UI` 结尾。
2. 明确尺寸、层级、控件列表和需要绑定的节点。
3. 创建根节点，名称与 UI 类名一致。
4. 子节点必须按 `m_` 前缀命名，例如 `m_btnClose`、`m_textTitle`、`m_imgIcon`。
5. 给节点添加与前缀匹配的组件。
6. 保存为 Prefab。
7. 执行前缀组件检查。
8. 执行 UI 脚本生成工具。
9. 执行资源索引生成。

## 最小组件映射

| 前缀 | 必要组件 |
| --- | --- |
| `m_go` | Node |
| `m_tf` | UITransform |
| `m_text` | Label |
| `m_btn` | Button |
| `m_img` | Sprite |
| `m_grid` | Layout |
| `m_list` | ListView |
| `m_scroll` | ScrollView |
| `m_toggle` | Toggle |
| `m_slider` | Slider |
| `m_progress` | ProgressBar |
| `m_eb` | EditBox |
| `m_rt` | RichText |

## 失败处理

- MCP 不能连接：优先提示开发者启用精简 Prefab MCP 或改用 PSD/手动拼；若任务适合小范围源 JSON 编辑，可按 `prefab-workflow.md` 的授权边界继续。
- 找不到 Canvas：提示先打开可编辑 UI 场景。
- 保存 Prefab 后加载失败：优先检查是否刷新资源和生成资源索引。
- UI 脚本报空：优先检查是否执行前缀组件检查和 UI 代码生成。

## 禁止

- 不要为了创建 Prefab 加载完整 MCP 文档。
- 不要直接手写 UI 脚本绕过生成工具。
- 不要在未读取 `prefab-workflow.md` 的情况下直接编辑 `.prefab` JSON 或 `.prefab.meta`。
- 不要修改 `ty-framework` 来适配某个 Prefab。

## Context

本项目使用 Cocos Creator 3.8.7。抽样文件包括：

- `Client/assets/asset-raw/ui/TipUI.prefab`
- `Client/assets/asset-raw/ui/TestUI.prefab`
- `Client/assets/asset-art/ui/LoadingUI.prefab`
- `Client/assets/scenes/main.scene`
- `Client/assets/scenes/psd2ui.scene`
- `Client/assets/asset-raw/scene/login.scene`
- `Client/assets/asset-raw/scene/game.scene`

这些源资产文件均可用 `ConvertFrom-Json` 解析，文件头分别为 `[` + `cc.Prefab` 或 `[` + `cc.SceneAsset`。对应 `.meta` 的 `importer` 分别为 `prefab` 和 `scene`，`files` 为 `[".json"]`。

## Goals / Non-Goals

**Goals:**

- 明确开发者已授权 AI 操作 Prefab 和 Scene 源资产。
- 将 Prefab 与 Scene 结构记录拆分到不同规则文件。
- 规定直接 JSON 编辑时必须使用结构化解析和引用校验。
- 保持 OpenSpec、UI 生成、资源索引和框架保护规则不变。

**Non-Goals:**

- 不创建新的 Cocos 编辑器扩展或 MCP 工具。
- 不修改现有 Prefab/Scene 资源内容。
- 不把 Cocos 生成缓存或构建产物当作源资产编辑。

## Decisions

- Prefab 与 Scene 分开维护规则：Prefab 继续使用 `prefab-workflow.md`，Scene 新增 `scene-workflow.md`。这样后续任务可以按资产类型读取最少上下文。
- 直接编辑只面向源 JSON：允许范围限定为 `Client/assets/**/*.prefab`、`Client/assets/**/*.scene` 及必要配套 `.meta`，不编辑 `Client/library`、`Client/temp`、`Client/build` 等生成目录。
- 结构化编辑优先：增删改查必须先解析 JSON 数组，维护 `__id__` 引用、父子关系、组件引用、`PrefabInfo`/`CompPrefabInfo` 或 Scene 全局对象，而不是盲目文本替换。
- 工具链仍优先：PSD2CCC、精简 MCP、Cocos 编辑器保存、UI 脚本生成和资源索引仍是推荐路径；直接 JSON 编辑是已授权的可用路径，不是跳过校验的捷径。

## Risks / Trade-offs

- `__id__` 引用错位会导致 Cocos 反序列化失败或节点/组件错绑 -> 通过 JSON 解析、引用完整性检查和抽样读取验证降低风险。
- `.meta` uuid 或资源索引遗漏会导致运行时找不到 Prefab/Scene -> 创建、删除、改名时检查 `.meta` 与 `asset-index.json` 生成链路。
- Scene 可能承载启动节点契约 -> 修改 Scene 时先识别 `UICanvas`、`GameRoot`、`PoolRoot` 等当前场景节点，涉及启动契约时同步相关规则或文档。
- 嵌套 Prefab 实例和 override 结构复杂 -> 遇到 `cc.PrefabInstance`、`targetOverrides`、自定义脚本类型时优先小步修改，必要时用 Cocos 编辑器/MCP 保存确认。

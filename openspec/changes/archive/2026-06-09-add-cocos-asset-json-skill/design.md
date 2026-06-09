## Context

`D:\aipro\first-game` 提供了更多 Cocos Creator 3.8.7 样本：`24` 个 `.prefab`、`5` 个 `.scene`、`22` 个 `.plist` SpriteAtlas、`573` 个 `.meta`。这些样本确认 Prefab/Scene 源文件是 JSON 对象数组，复杂场景中包含 Prefab instance override，自定义脚本组件以 Cocos 短类型 ID 序列化。

后续稳定编辑需要一个可复用解析入口，避免每次临时写 PowerShell 或手工扫描。

## Goals / Non-Goals

**Goals:**

- 为 Cocos 源资产结构检查提供低 token、可执行的脚本。
- 支持 Prefab/Scene 的对象统计、节点树、组件摘要、自定义组件字段摘要、悬空 `__id__` 引用检查。
- 支持 `.meta` uuid 索引和 `asset-index.json` 摘要。
- 支持 SpriteAtlas `.plist` 与 `.plist.meta` 的帧名、uuid、rect 查询。
- 明确排除 Luban `.bin`。

**Non-Goals:**

- 不自动重写 `.prefab/.scene/.meta/.plist`。
- 不替代 `prefab-workflow.md`、`scene-workflow.md`、`resource-api.md` 的安全规则。
- 不处理剧情脚本、地图 JSON、材质/Effect、战斗日志。

## Decisions

- 新 skill 命名为 `cocos-asset-json`：表达它处理 Cocos 源资产序列化、meta 和索引，而不是 Tyou UI 生命周期或 Luban 表。
- 使用 Python 脚本：JSON、XML plist、目录扫描和引用校验更适合脚本化，避免反复写 fragile shell。
- 首版只读：先提供 `inspect`、`validate`、`uuid-index`、`asset-index`、`atlas` 子命令。写入功能留给具体 Prefab/Scene 任务按工作流执行。
- 自定义脚本组件只做字段摘要和源码候选搜索提示：Cocos 短类型 ID 不能稳定直接从 `.ts.meta` 字符串映射，不能假装有完美映射。
- Luban `.bin` 明确排除：二进制是生成物，配表工作使用 `luban-dev` 和源表。

## Risks / Trade-offs

- 脚本只读导致不能一键完成编辑 -> 这是首版有意边界，降低误写 Cocos 资源风险。
- Cocos 自定义组件短 ID 无法精确映射类名 -> 输出字段摘要和节点上下文，由 Codex 结合源码 `@ccclass` 和字段名判断。
- SpriteAtlas `.plist` 解析依赖 XML plist 结构 -> 使用 Python 标准库 `plistlib`，失败时给出错误并保留人工检查路径。

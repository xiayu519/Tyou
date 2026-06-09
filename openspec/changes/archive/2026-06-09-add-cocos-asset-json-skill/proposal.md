## Why

开发者确认 Prefab、Scene、SpriteAtlas、meta/asset-index 这三类 Cocos 源资产解析能力值得做成专用 skill，方便后续对 Cocos Creator 3.8.7 源资产进行稳定增删改查和引用核验。

同时开发者明确纠正：Luban `.bin` 完全不需要解析，配表工作应看源表数据和 Luban 生成访问面，不把二进制产物作为解析或编辑对象。

## What Changes

- 新增 `.agents/skills/cocos-asset-json/`，用于 Cocos 源资产 JSON/metadata 的只读解析和编辑前校验辅助。
- 提供脚本化入口，支持 `.prefab/.scene` inspect、`__id__` 引用校验、`.meta` uuid 索引、`asset-index.json` 摘要、SpriteAtlas `.plist/.meta` 查询。
- 更新 Tyou skill 路由，将 Prefab/Scene/Atlas/meta/asset-index 深度解析任务路由到新 skill。
- 更新 Prefab/Scene/资源规则，推荐使用新 skill 的脚本做结构检查。
- 记录“不解析 Luban `.bin`”为开发者反馈，避免后续误判。

不做以下事项：

- 不处理剧情脚本、地图 JSON、`.mtl/.effect`、战斗日志等后续候选结构。
- 不解析、不修改 Luban `.bin`。
- 不创建写入 Cocos 源资产的自动重写器；本次 skill 先提供可靠只读解析、索引和校验，实际写入仍按 Prefab/Scene 工作流小步执行。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `codex-ai-workflow`: Codex 工作流新增 Cocos 源资产解析 skill 路由，并明确 Luban `.bin` 不属于该解析范围。

## Impact

- 新增 `.agents/skills/cocos-asset-json/` skill 与脚本。
- 修改 `.agents/skills/tyou-dev/SKILL.md` 路由。
- 修改 `.codex/rules/tyou-dev/prefab-workflow.md`、`.codex/rules/tyou-dev/scene-workflow.md`、`.codex/rules/tyou-dev/resource-api.md`、`.codex/rules/tyou-dev/luban-config.md`。
- 更新 `.codex/memory/`、`Books/AI-Development-Workflow.md`、`openspec/specs/codex-ai-workflow/spec.md`。

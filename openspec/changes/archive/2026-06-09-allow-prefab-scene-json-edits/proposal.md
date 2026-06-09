## Why

开发者已明确放开 AI 对 Cocos Prefab 和 Scene 源资产的增删改查权限，并要求记录当前项目里这两类文件的大概序列化结构，方便后续稳定操作。

此前规则把 `.prefab` JSON 手工编辑视为默认禁止，且没有独立的 Scene 工作流。实际抽样确认本项目提交的 `.prefab` 和 `.scene` 源文件都是 Cocos Creator 3.8.7 的文本 JSON 对象数组，而不是不可读的纯二进制文件，因此需要把授权、边界和格式速记写入长期工作流。

## What Changes

- 调整 Prefab 工作流：允许 AI 在 OpenSpec 监督和结构校验下直接增删改查源 `.prefab` 与必要的 `.prefab.meta`。
- 新增 Scene 工作流：独立记录源 `.scene` 与 `.scene.meta` 的文本 JSON 结构、引用关系和安全边界。
- 更新 Tyou skill 路由：Prefab 和 Scene 分开路由到各自规则，保持单一职责。
- 记录可复用 memory：分别归档 Prefab/Scene 源 JSON 结构参考，以及开发者授权的持久协作决策。
- 同步 OpenSpec 长期工作流 spec 和工作流文档。

不做以下事项：

- 不修改任何现有 `.prefab`、`.scene` 资源内容。
- 不把授权扩展到 `Client/library`、`Client/temp`、`Client/build` 等生成或缓存目录。
- 不绕过 UI 脚本生成、资源索引、引用检查、OpenSpec 门禁或 `ty-framework` 保护规则。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `codex-ai-workflow`: Codex 工作流允许在受控边界内结构化编辑 Cocos Prefab 和 Scene 源 JSON，并要求 Prefab/Scene 规则分开维护。

## Impact

- 影响 `.codex/rules/tyou-dev/` 的 Prefab/Scene 主题规则。
- 影响 `.agents/skills/tyou-dev/SKILL.md` 的文档路由和回归用例。
- 影响 `.codex/memory/` 的长期协作记忆。
- 影响 `openspec/specs/codex-ai-workflow/spec.md` 与 `Books/AI-Development-Workflow.md` 的工作流描述。

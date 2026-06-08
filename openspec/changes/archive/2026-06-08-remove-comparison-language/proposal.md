## Why

项目文档应该聚焦 Tyou 当前实现、约束和使用方式。带有来源对照或横向比较意味的词会分散读者注意力，也容易让项目定位变得不清楚。

## What Changes

- 清理 README、Books、Codex 规则、skills、memory、OpenSpec specs 和相关归档记录中的来源对照词。
- 将“参考材料复核”规则改成更中性的“非源码材料复核”，强调写文档前以本地源码、工具输出和工作区 diff 为准。
- 删除上一轮新增的参考资料 memory，避免项目记忆里保留无必要的材料位置说明。
- 不修改业务代码、框架代码、Prefab/Scene/meta、Luban 配表或生成物。

## Capabilities

### New Capabilities

- `<none>`: 不新增能力。

### Modified Capabilities

- `codex-ai-workflow`: 工作流复核规则改为“非源码材料”，避免文档出现无意义的来源对照词。
- `project-overview-documentation`: 项目介绍只描述 Tyou 本地事实，不写来源对照。

## Impact

- 文档：`README.md`、`Books/AI-Development-Workflow.md`、`AGENTS.md`、`.agents/skills/tyou-dev/SKILL.md`、`.codex/rules/tyou-dev/*.md`、`.codex/memory/*`。
- OpenSpec：`openspec/specs/**` 与相关 archive 记录。
- 验证：全仓文档关键词搜索、wiki-sync 只读扫描、OpenSpec status、Codex observability sensor。

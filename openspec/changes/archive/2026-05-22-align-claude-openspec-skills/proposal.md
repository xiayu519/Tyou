## Why

上一轮已把 `CLAUDE.md` 与 `.claude/skills/tyou-dev/SKILL.md` 对齐到 Codex 工作流，但最终抽查发现 `.claude/skills/openspec-*` 仍比 `.agents/skills/openspec-*` 简略很多。用户要求 Claude Code 工作流内容与 Codex 一模一样，除 CLI 特性区别外不能缩水，因此 OpenSpec 四阶段 skill 壳也必须补齐。

## What Changes

- 补齐 `.claude/skills/openspec-propose/SKILL.md`，保留 `/opsx:propose` 与 Claude Code 表述。
- 补齐 `.claude/skills/openspec-apply-change/SKILL.md`，保留 `/opsx:apply` 与 Claude Code 表述。
- 补齐 `.claude/skills/openspec-archive-change/SKILL.md`，保留 `/opsx:archive` 与 Claude Code 表述。
- 补齐 `.claude/skills/openspec-explore/SKILL.md`，保留 `/opsx:explore` 与 Claude Code 表述。
- 检查 `.claude/commands/opsx/*` 是否需要同步到同等行为入口；commands 可保持更短，但不能与 skill 行为冲突。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `ai-workflow-adapters`: 强化 Claude Code OpenSpec skill 壳与 Codex OpenSpec skill 壳的行为等价要求。

## Impact

- 更新 `.claude/skills/openspec-*`。
- 必要时更新 `.claude/commands/opsx/*`。
- 不修改业务代码、资源、Prefab 或 `Client/assets/ty-framework/`。

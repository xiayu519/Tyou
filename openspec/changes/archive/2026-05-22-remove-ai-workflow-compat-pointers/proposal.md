## Why

Tyou 目前是框架基线，没有既有业务依赖旧 Codex reference 路径。保留 `.agents/skills/tyou-dev/references/` 兼容指针会制造视觉噪声，也容易让后续维护误以为仍有两份规则源。

同时，双 CLI 工作流后续变更需要有明确同步准则：无论当前由 Codex 还是 Claude Code 执行，只要修改 AI 工作流的共享规则、入口、触发或路由，就必须同步检查两个 CLI 适配壳，避免两边行为漂移。

## What Changes

- 删除 `.agents/skills/tyou-dev/references/` 兼容指针目录。
- 保留 `.ai/rules/tyou-dev/` 作为唯一规则正文目录。
- 在共享 workflow recovery 规则中增加“双壳同步维护”准则。
- 在 `AGENTS.md`、`CLAUDE.md` 和两边 `tyou-dev` skill 壳中加入同步检查规则。
- 更新 OpenSpec workflow adapter spec，要求 AI 工作流变更必须同步评估两个适配壳。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `ai-workflow-adapters`: 增加不保留旧 reference 兼容目录、AI 工作流变更必须同步评估两个 CLI 适配壳的要求。

## Impact

- 删除 `.agents/skills/tyou-dev/references/`。
- 更新 `.ai/rules/tyou-dev/workflow-recovery.md`、`AGENTS.md`、`CLAUDE.md`、`.agents/skills/tyou-dev/SKILL.md`、`.claude/skills/tyou-dev/SKILL.md`。
- 更新 `openspec/specs/ai-workflow-adapters/spec.md`。
- 不修改业务代码、资源、Prefab 或 `Client/assets/ty-framework/`。

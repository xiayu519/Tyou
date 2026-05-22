## Context

上一轮双适配壳改造为了降低旧路径断链风险，保留了 `.agents/skills/tyou-dev/references/*.md` 作为兼容指针。但用户明确指出 Tyou 目前是框架项目且没有业务，不需要兼容旧 AI 规则路径。继续保留这些文件会降低“单一规则源”的可读性。

用户还提出第二条底线：后续 AI 工作流规则有新增或修改时，不能只改当前 CLI 的壳，必须保证 Codex 与 Claude Code 两边工作流保持一致。

## Goals / Non-Goals

**Goals:**

- 删除旧 reference 兼容目录，让 `.ai/rules/tyou-dev/` 成为唯一可见的规则正文。
- 明确“AI 工作流变更必须同步检查两个 CLI 壳”的强规则。
- 保持 Codex/Claude 适配壳互不依赖，只同步语义，不互相引用专属目录。

**Non-Goals:**

- 不合并 Codex 与 Claude Code 的 CLI 壳。
- 不合并两边 memory。
- 不修改业务或框架代码。

## Decisions

### 1. 直接删除旧 references 目录

因为项目还没有业务依赖旧路径，删除比兼容指针更清晰。Codex skill 已直接路由到 `.ai/rules/tyou-dev/*.md`。

### 2. 同步准则放三层

- 放在 `.ai/rules/tyou-dev/workflow-recovery.md`：作为共享规则，约束所有 CLI。
- 放在 `AGENTS.md` 与 `CLAUDE.md`：保证每次会话入口都能看到。
- 放在两边 `tyou-dev/SKILL.md`：当具体 skill 触发时仍能看到。

### 3. OpenSpec spec 也记录该约束

`ai-workflow-adapters` spec 增加 requirement，让后续变更有可审查的规范依据。

## Risks / Trade-offs

- 删除旧路径后，任何仍写死旧 `references/` 的文档会失效 → 用 `rg` 验证旧路径残留。
- 同步两边壳会多一点维护成本 → 接受，因为这是避免两套 CLI 行为漂移的核心约束。

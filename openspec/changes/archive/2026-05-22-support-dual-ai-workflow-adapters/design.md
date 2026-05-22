## Context

Tyou 当前已经有一套有效的 Codex 工作流：根入口为 `AGENTS.md`，Codex skill 位于 `.agents/skills/`，精炼 reference 位于 `.agents/skills/tyou-dev/references/`，长期问题记录位于 `.codex/memory/`。用户希望兼容 Claude Code CLI，并明确要求：

- 尽量只维护一份具体规范内容。
- 必须尊重 Codex 与 Claude Code 各自的 CLI 特性，不能只靠普通 Markdown 触发。
- 两套工作流互不干扰：Codex 环境不能引用 Claude 工作流目录，Claude 环境不能引用 Codex 工作流目录。

参考 `D:\gitframework\TEngine\UnityProject` 的 Claude Code 工作流，Claude 侧正宗结构包含 `CLAUDE.md`、`.claude/settings.local.json`、`.claude/commands/`、`.claude/skills/`、`.claude/agents/` 和 agent memory。Tyou 应采用相同形态，但内容必须适配 Cocos Creator/Tyou，而不是复制 Unity/TEngine 规则。

## Goals / Non-Goals

**Goals:**

- 建立中性的共享规范目录 `.ai/rules/`，作为 Tyou AI 工作流真实内容的单一维护源。
- 将 Codex 入口和 skills 改成 Codex 专属薄壳，保留自动触发与按需读取能力。
- 新增 Claude Code 专属薄壳，使用 Claude 的 `CLAUDE.md`、skills、slash commands、settings 权限等 CLI 特性。
- 明确隔离规则：两个 CLI 壳不能互相引用对方专属目录。
- 保留 OpenSpec L2+ 监督与 L1 省 token 策略。

**Non-Goals:**

- 不引入 CI/git hook 级硬拦截。
- 不把 Claude agent memory 与 Codex memory 强行合并。
- 不修改 Tyou 框架代码或业务逻辑。
- 不复制 TEngine/Unity 规则到 Tyou。

## Decisions

### 1. 用 `.ai/rules/` 作为共享规范层

真实规范内容从 `.agents/skills/tyou-dev/references/` 迁移到 `.ai/rules/tyou-dev/`。原 Codex reference 文件改为短转向说明，避免两份内容并存。

替代方案：直接让 Claude 读取 `.agents/skills/tyou-dev/references/`。拒绝原因是这会让 Claude 依赖 Codex 专属目录，违反互不干扰边界。

### 2. Codex 与 Claude 各保留自己的 CLI 壳

Codex 壳保留 `AGENTS.md` 与 `.agents/skills/*/SKILL.md`，Claude 壳新增 `CLAUDE.md`、`.claude/skills/*/SKILL.md`、`.claude/commands/opsx/*.md`、`.claude/settings.local.json`。

替代方案：只建一个通用 Markdown 入口。拒绝原因是无法利用 Claude Code 的 skill、slash command、permission settings，也弱化 Codex 原生 skill 机制。

### 3. OpenSpec 是共享监督层，但调用入口分离

OpenSpec 目录和 change/specs 是共享事实；Codex 用 `$openspec-*` skill，Claude 用 `.claude/commands/opsx/*` 和 `.claude/skills/openspec-*`。两个入口描述同一流程，但不互相引用。

替代方案：只保留一种 OpenSpec skill。拒绝原因是 CLI 触发方式不同，尤其 Claude 的 `/opsx:*` slash commands 是实际工作入口之一。

### 4. Memory 不强行合并

Codex 继续使用 `.codex/memory/`，Claude Code 使用 `.claude/agent-memory/` 或 Claude 自身 memory。共享规则只规定“何时记录”和“记录字段”，不规定同一个物理文件。

替代方案：统一到 `.ai/memory/`。拒绝原因是两个 CLI 的记忆机制不同，强行合并会削弱各自工具特性。

## Risks / Trade-offs

- 共享规范迁移后旧路径引用遗漏 → 用 `rg` 检查 `.agents/skills/tyou-dev/references`、`Codex`、`Claude` 等引用并修正。
- 旧 Codex reference 变成转向文件可能增加一次跳转 → 接受该成本，换取单一维护源和兼容旧路径。
- Claude settings 权限过宽 → 只加入 OpenSpec 与 skill 相关最小权限，不配置破坏性命令。
- 仍存在少量壳文件重复描述流程名 → 壳文件只描述触发方式和路由，不承载具体 Tyou 规则。

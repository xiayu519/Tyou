## Context

`ManagedAssetLoader.releaseAll()` 当前会清理托管缓存并延迟 `decRef`，但没有处理 `_pendingLoads`。如果释放发生在 Cocos 底层加载完成前，完成回调仍可能进入缓存并调用 `ReleaseScheduler.addRef()`，形成“已释放范围重新保留”的边界风险。

多语言运行时已存在：`TableLocalizationText` 由 Luban 生成，`TableModule.onCreate()` 构建 `Tables` 后调用 `tyou.i18n.onCreate()`，业务通过 `tyou.i18n.get(key, ...args)` 或 `LocalizeLabel` 使用。缺口在 AI 工作流：新增/修改文案时容易绕过 Luban 源表、直接写运行时代码或生成物。

## Goals / Non-Goals

**Goals:**

- `releaseAll()` 清理托管缓存时，匹配范围内的 in-flight 请求不再重新进入托管缓存。
- 新增简洁精确的多语言 skill，强制路由到 `luban-dev` 和 `#TableLocalizationText.xlsx`。
- 保持资源 public API、索引加载、多语言运行时代码和 Luban 数据格式不变。

**Non-Goals:**

- 不重写资源加载架构。
- 不改 `LocalizationModule`、`LocalizeLabel` 或现有多语言表字段。
- 不自动新增多语言表数据。
- 不引入新的导表脚本或第三方依赖。

## Decisions

- 用 `ManagedAssetLoader` 内部取消标记处理 in-flight 释放边界，而不是暴露新的 public API。这样保持 `tyou.res.releaseAll()` 对外语义稳定。
- in-flight 被取消后，完成回调不写缓存、不新增托管引用；若底层仍返回 Asset，则只做轻量 `addRef/decRef` 对冲，延续旧 `Loader` 的取消后释放习惯。
- 多语言 skill 命名为 `localization-dev`，放在 `.agents/skills/`，因为它是 Tyou 项目工作流的一部分，不是用户全局通用 skill。
- `localization-dev` 只放 `SKILL.md` 和 UI metadata；详细 Luban 操作复用现有 `luban-dev`，避免重复维护两份配表规则。

## Risks / Trade-offs

- [Risk] 取消 in-flight 后 Promise 仍需等底层 Cocos 回调才完成。→ Mitigation：立即通知已登记 callback 为 `null`，底层完成时再让 Promise 收敛为 `null`。
- [Risk] skill 与 `luban-dev` 重复。→ Mitigation：skill 只负责多语言路由和字段约束，实际表操作仍转交 `luban-dev`。
- [Risk] 工作流新增后文档清单遗漏。→ Mitigation：同步 `codex-ai-workflow` spec 和必要的 Tyou skill 清单。

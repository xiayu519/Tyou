# Tyou AI 开发工作流

本文档说明本仓库的 Codex AI 工作流。目标是：每次会话自动进入规则、任务目标明确、按需读取文档，避免因为"工作流"本身造成更高 token 消耗。

## 入口

项目级入口是仓库根目录的 `AGENTS.md`。Codex 进入仓库后会自动读取它。

`AGENTS.md` 只放：

- L1-L4 任务分级。
- skill 触发说明。
- 关键红线。
- OpenSpec 强制监督流程。

详细规范放在 `.agents/skills/tyou-dev/references/`，只在任务需要时读取。框架/扩展/openspec 等关键子目录另有 `AGENTS.override.md` 在 cd 进入时强约束。

## Token 策略

1. L1 不读 reference。
2. L2 只读一个主题。
3. L3 读取 2-4 个相关主题。
4. L4 先读必要主题并给方案，不全量加载。
5. 同一会话已读主题只复用摘要，不重复读取。
6. 不保存与当前仓库无关的外部项目对照信息到常驻工作流。
7. reference 与代码冲突时读源码验证，避免靠长文档猜。

这套策略不能承诺任何模型环境下"绝对 0 浪费"，但目标是让工作流增加的是判断质量，而不是上下文噪声。

## 工作流

```text
用户需求
  -> 读 AGENTS.md
  -> 判断 L1/L2/L3/L4
  -> L2+ 检查/进入 OpenSpec
  -> 触发或显式调用对应 Codex skill（tyou-dev、openspec-*）
  -> 读取最少 reference
  -> 优先 `rg`；不可用时用 `grep_search` / `Select-String`；再读源码确认实际 API
  -> 实施或先给方案
  -> 运行可承受校验
  -> 总结改动、流程、验证
```

## OpenSpec 监督

除 L1 简单任务外，实现类任务必须使用 OpenSpec 监督，详细规则见 `.agents/skills/tyou-dev/references/openspec-workflow.md`：

1. 探索：只读调查，明确目标、边界、风险（`$openspec-explore`）。
2. 提案：写 proposal / design / specs / tasks（`$openspec-propose`）。
3. 实施：按 tasks.md 逐项完成，完成一项勾一项（`$openspec-apply-change`）。
4. 归档：完成测试与文档后归档（`$openspec-archive-change`）。

如果仓库未初始化 OpenSpec，L2+ 任务必须先初始化或等待开发者确认；不能在没有 OpenSpec 监督的情况下直接实施。L1 为了省 token 可以跳过。

## 容错与同步

当源码、工具实际行为和 AI 工作流 md 不一致时，以源码和工具实际行为为准，并修正对应 md。详细规则见 `.agents/skills/tyou-dev/references/workflow-recovery.md`。

## 当前工作流能力

当前仓库的 AI 工作流由以下本地文件和机制组成：

- `AGENTS.md`：项目级入口，负责中文输出、任务分级、OpenSpec 监督和核心红线。
- `.agents/skills/tyou-dev/`：Codex 原生 Tyou 开发 skill，按主题读取精简 reference。
- `.agents/skills/openspec-*`：OpenSpec explore / propose / apply / archive 四阶段 skill。
- `.codex/memory/`：问题沉淀目录，记录文档与代码不一致、环境差异、AI 踩过的坑。
- `openspec/`：变更监督目录，L2+ 实现类任务进入 change 后按 tasks 推进。
- `Books/AI-Development-Workflow.md`：人读版流程说明，记录当前工作流的实际规则。

当前项目的强约束：

- `Client/assets/ty-framework/` 是框架代码，默认不改；确需修改必须先确认。
- UI 脚本创建必须优先走 `uitscreate`，不能绕开 `UIName/UIImportAll` 自动链路。
- UI 图片加载、按钮点击、事件监听必须优先用 `UIBase` 内置能力，确保关闭时统一清理。
- 资源必须走自动索引，禁止同名资源，加载找不到先检查是否执行索引生成。
- 资源引用计数必须配对，崩溃或泄漏优先查 `addRef/decRef`。
- Prefab 创建优先级：PSD 一键生成 > AI + 精简 MCP Prefab 流程 > 手动拼。
- `assetool` 资源索引流程。
- `@UIDecorator + UIName + UIImportAll` 注册链路。
- Cocos Creator 编辑器扩展约束。

## 纠偏与自我维护

工作流不是只负责“读规范再写代码”，还要在发现偏差时把问题收回来，避免下一次继续踩坑。

### 源码优先

当 reference、OpenSpec artifact、README、Books 或 agent 记忆与实际源码/工具行为冲突时：

1. 先读源码、工具输出或生成物确认真实行为。
2. 以当前仓库的真实实现为准。
3. 如果文档过期，优先修正文档，而不是让后续 AI 继续读错规则。
4. 如果发现的是框架层设计问题，先停下说明影响，再等开发者确认。

### 文档同步

出现以下情况时，需要同步对应文档：

- API 名称、生命周期、资源释放规则、UI 生成链路与 reference 不一致。
- OpenSpec proposal/design/specs/tasks 与源码事实冲突。
- README 或 Books 描述了已经删除或改名的功能。
- 编辑器扩展、资源索引、Prefab 创建流程的实际操作发生变化。

优先同步位置：

- 当前会话必须知道的规则：`AGENTS.md`。
- Tyou 开发路由和原则：`.agents/skills/tyou-dev/SKILL.md`。
- 具体主题规范：`.agents/skills/tyou-dev/references/*.md`。
- 人读工作流说明：`Books/AI-Development-Workflow.md`。
- 面向项目用户的概要说明：`README.md`。

### 问题记录

以下问题需要追加到 `.codex/memory/problem_YYYY-MM-DD.md`：

- 文档与源码/工具不一致。
- 本机环境特有雷区，例如命令不可用、脚本路径差异、Cocos 声明检查异常。
- AI 已经踩过且可能再次复发的问题。

记录格式保持简洁：现象、定位、根因、修正动作。当天已有文件就追加，不为每个问题单开文件。

### OpenSpec 收尾

每个 change 完成前检查：

1. `tasks.md` 是否全部勾选。
2. 是否跑过能承受的验证。
3. 是否需要把 delta spec 同步到 `openspec/specs/`。
4. 是否还有 reference、README、Books 与源码不一致。
5. 是否需要归档到 `openspec/changes/archive/YYYY-MM-DD-<name>/`。

### 可选增强

以下能力当前不是强制现状，需要明确实施后才能写成规则：

- 用 git hook 或 CI 检查敏感路径改动是否关联 OpenSpec change。
- 为高频 Luban 或 Prefab 任务拆独立 skill。
- 为团队文档建立 wiki 同步流程。
- 为 Cocos 编辑器生成物增加自动校验脚本。

# OpenSpec 工作流

OpenSpec 是本项目 AI 实现类任务的监督层。除 L1 简单任务外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，都必须先确认 OpenSpec 可用，再进入对应 change。

## 启动检查

每次 L2+ 任务开始时先做最小检查：

```powershell
openspec --version
Test-Path openspec
```

Windows PowerShell 若拦截 npm 生成的 `openspec.ps1`，改用：

```powershell
cmd /c openspec.cmd --version
cmd /c openspec.cmd list --json
```

判断规则：

- `openspec` 不存在：停止实现，请开发者确认是否安装 OpenSpec CLI。
- `openspec/` 不存在：停止实现，请开发者确认初始化，然后执行 `openspec init`。
- 已初始化：检查是否已有匹配 change；没有就先 propose。
- 已有匹配 change：读取该 change 的 `proposal.md`、`design.md`、`specs/`、`tasks.md` 后再 apply。

L1 typo、注释、日志、单行无框架语义改名可以跳过 OpenSpec。只读排查也可以先 explore，但一旦准备修改，就必须回到 OpenSpec change。

## 何时使用

| 场景 | 是否使用 |
| --- | --- |
| L1 typo/注释/日志 | 不使用 |
| L2 轻量 | 使用，走最小 schema 兼容 change |
| L2 重量 | 使用，保持当前 L2 保护 |
| L3 新功能/跨文件/UI+资源协作 | 使用 |
| L4 架构/多模块/框架规则 | 使用 |
| 开发者明确要求 | 使用 |

## L2 分流

L2 不是按代码行数判断，而是按长期行为影响判断。

轻量 L2 同时满足：

- 单一文件或单一小模块内修改。
- 调用已知 API，不改变公共 API、参数语义、返回值或错误处理。
- 不改变运行时调度、资源引用计数、UI 生命周期、事件分发、Luban、Prefab/Scene/meta、工作流规则或 OpenSpec specs。
- 验证方式直接明确，例如静态搜索、局部脚本或可承受的编译检查。

重量 L2 任一满足：

- 改公共 API 语义、错误处理或可复用行为。
- 改资源加载、缓存、引用计数、释放、索引生成或 UI 生命周期。
- 改计时器、网络、对象池、事件、状态机等运行时行为。
- 改 Codex 工作流文档、`.codex/rules/`、OpenSpec specs、skills 或 Wiki 同步配置。
- 发现可复发坑，或验证不直接、剩余风险需要记录。

规则：

- 不确定时按重量 L2。
- 轻量 L2 实施中发现风险扩大，立即升级重量 L2 或 L3。
- 轻量 L2 只减少文档负担，不跳过 OpenSpec 启动检查和 tasks 验收。
- 轻量 L2 不新增长期 spec；如果当前 OpenSpec schema 要求 `specs/` 或其他 artifact，就写最小 schema 兼容内容，不扩展长期规范。

## 四阶段

### 1. explore

只读探索，不改代码。

用途：

- 需求不清楚。
- 需要调查现有代码。
- 有多种方案要比较。
- 需要评估风险和影响范围。

硬约束：

- 只读探索不修改代码、资源、Prefab、Scene、meta、配置、生成物或工作流文档。
- 只有开发者要求沉淀结论时，才写 OpenSpec artifact。
- 输出探索结论时说明是否建议进入 propose。

输出：

- 目标。
- 现状。
- 方案对比。
- 推荐路径。
- 风险和待确认点。

### 2. propose

创建变更文档。

推荐命令流：

```powershell
openspec new change "<change-name>"
openspec status --change "<change-name>" --json
openspec instructions <artifact-id> --change "<change-name>" --json
```

Windows 可把上面命令改成 `cmd /c openspec.cmd ...`。

执行方式：

- 先用 `openspec new change` 创建 scaffold。
- 再用 `openspec status --change --json` 读取 artifact 依赖顺序和 `applyRequires`。
- 按依赖顺序读取 `openspec instructions`，根据模板生成对应 artifact。
- 生成每个 artifact 后重新检查 status，直到达到 apply-ready。

建议结构：

```text
openspec/changes/<change-name>/
  proposal.md
  design.md
  specs/
  tasks.md
```

要求：

- `proposal.md` 写为什么做、做什么、不做什么。
- `design.md` 写技术方案、影响范围、风险和回滚点。
- `specs/` 写行为规范，不写实现流水账。
- `tasks.md` 写可勾选任务，任务粒度要能逐项验证。

### 3. apply

实施任务。

推荐命令流：

```powershell
openspec list --json
openspec status --change "<change-name>"
openspec status --change "<change-name>" --json
```

规则：

- 先读 proposal/design/specs/tasks。
- 优先读取 `openspec instructions apply --change "<change-name>" --json` 返回的 `contextFiles`；CLI 不支持时再回退到直接读取当前 change artifacts。
- 一次处理一个任务，不跳过未完成任务。
- 完成一项马上把 `- [ ]` 改成 `- [x]`。
- 发现源码与 OpenSpec/md 不一致时，以源码为准，先同步文档再继续。
- 发现设计问题、框架代码修改、`ty-framework` 改动需求时暂停，先询问开发者。
- 发现 Prefab/Scene/meta、Luban 破坏性变更、资源索引生成链路不清楚时暂停，先确认安全流程。
- L3/L4 change 实施时，在 change 目录维护 `run-report.md`；模板位于 `.agents/skills/tyou-dev/templates/run-report.md`。
- 轻量 L2 只写最小 schema 兼容 artifact；重量 L2 可写必要 spec delta。`design.md` 或 `run-report.md` 仅用于开发者要求、风险扩大、触发可复发 workflow/wiki-sync 风险的场景。
- L1 使用直接处理流程。

### 3.5 observability

本项目 Codex 可观测性只记录本地、可复核、低噪音的证据，不记录大段原始日志。

短期证据：

- `openspec/changes/<change-name>/run-report.md` 先写 `## Executive Summary`，再记录目标、状态、验证结论、关键决策、sensor 结果、剩余风险和是否需要 wiki-sync。
- `run-report.md` 只写 review 需要的验证结论和风险，不写过程流水；必须避免写入密钥、绝对私有路径、完整第三方日志或无关终端输出。

中期 sensor：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/tyou-dev/scripts/codex-observability-check.ps1 -Change <change-name>
```

Review 证据以 `run-report.md`、sensor 输出、OpenSpec 状态和必要验证命令为准。

### 4. archive

完成后归档。

推荐命令流：

```powershell
openspec status --change "<change-name>" --json
```

归档前检查：

- tasks 是否全部完成。
- 代码是否已验证。
- Codex 规则是否需要同步更新。
- 是否存在开发者确认过的未完成项。
- 是否仍有与源码不一致的 Codex 工作流文档。
- L3/L4 change 是否存在 `run-report.md`，以及 sensor 结果是否已作为 review 证据检查。
- 若存在 `openspec/changes/<change-name>/specs/`，归档前评估是否需要同步到 `openspec/specs/`。
- 归档目录使用 `openspec/changes/archive/YYYY-MM-DD-<change-name>/`，避免覆盖已有归档。
- Windows 下归档使用 PowerShell `Move-Item -LiteralPath`，并确认目标仍在 `openspec/changes/archive/`。

归档决策：

- 当 change 名称明确、artifacts 完成、tasks 全部勾选、delta specs 已同步到主 specs、必要验证通过、无阻塞风险时，Codex 直接归档。
- 当 change 不明确、存在未完成 tasks、artifacts 未完成、delta specs 未同步、验证失败、archive 目标已存在或需要开发者确认的风险时，Codex 暂停并询问开发者。

## 本项目集成规则

- OpenSpec 不能绕过 `AGENTS.md`、`.agents/skills/` 和 `tyou-dev` Codex 规则。
- OpenSpec 只监督目标、范围、任务和验收；具体实现仍以 Tyou 源码和 `.codex/rules/tyou-dev/` Codex 规则为准。
- 涉及 UI 时仍必须走 UI 自动生成链路。
- 涉及资源时仍必须走资源索引和引用计数约束。
- 涉及 Luban 时必须先检查是否导表和 Excel 原始数据，不能直接改生成脚本或二进制数据。
- 涉及 `ty-framework` 时仍必须先确认。

## 省 token 约束

- 启动检查只做 `openspec --version` 和目录存在性判断，不全量读取 `openspec/`。
- 只读取当前 change 的必要文件，不扫描所有历史 change。
- 轻量 L2 只写最小 schema 兼容内容；重量 L2 保持当前保护，不为了流程堆长文档。
- L3/L4 后续复查先读 `run-report.md` 的 `## Executive Summary`，只有需要细节时再读完整报告。
- 同一会话已读过的 change 内容只复用摘要，除非文件被修改。

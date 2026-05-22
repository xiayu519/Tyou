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
| L2 单点 API 修改 | 使用，走轻量 change |
| L3 新功能/跨文件/UI+资源协作 | 使用 |
| L4 架构/多模块/框架规则 | 使用 |
| 开发者明确要求 | 使用 |

## 四阶段

### 1. explore

只读探索，不改代码。

用途：

- 需求不清楚。
- 需要调查现有代码。
- 有多种方案要比较。
- 需要评估风险和影响范围。

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
- 一次处理一个任务，不跳过未完成任务。
- 完成一项马上把 `- [ ]` 改成 `- [x]`。
- 发现源码与 OpenSpec/md 不一致时，以源码为准，先同步文档再继续。
- 发现设计问题、框架代码修改、`ty-framework` 改动需求时暂停，先询问开发者。

### 4. archive

完成后归档。

推荐命令流：

```powershell
openspec status --change "<change-name>" --json
```

归档前检查：

- tasks 是否全部完成。
- 代码是否已验证。
- reference 是否需要同步更新。
- 是否存在开发者确认过的未完成项。
- 是否仍有与源码不一致的 AI 工作流文档。
- 若存在 `openspec/changes/<change-name>/specs/`，归档前评估是否需要同步到 `openspec/specs/`。
- 归档目录使用 `openspec/changes/archive/YYYY-MM-DD-<change-name>/`，避免覆盖已有归档。

## 本项目集成规则

- OpenSpec 不能绕过当前 CLI 适配壳和 `tyou-dev` 共享规则；Codex 入口是 `AGENTS.md` 与 `.agents/skills/`，Claude Code 入口是 `CLAUDE.md` 与 `.claude/`。
- OpenSpec 只监督目标、范围、任务和验收；具体实现仍以 Tyou 源码和 `.ai/rules/tyou-dev/` 共享规则为准。
- 涉及 UI 时仍必须走 UI 自动生成链路。
- 涉及资源时仍必须走资源索引和引用计数约束。
- 涉及 Luban 时必须先检查是否导表和 Excel 原始数据，不能直接改生成脚本或二进制数据。
- 涉及 `ty-framework` 时仍必须先确认。

## 省 token 约束

- 启动检查只做 `openspec --version` 和目录存在性判断，不全量读取 `openspec/`。
- 只读取当前 change 的必要文件，不扫描所有历史 change。
- L2 change 可以保持轻量，只写必要 proposal/tasks，不为了流程堆长文档。
- 同一会话已读过的 change 内容只复用摘要，除非文件被修改。

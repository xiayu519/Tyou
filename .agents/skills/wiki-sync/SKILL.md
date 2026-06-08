---
name: wiki-sync
description: Tyou 项目 Wiki/文档知识库同步 skill。用于 README、Books、.codex/rules、openspec/specs、AGENTS.md、AGENTS.override.md、memory、skills 与源码/工具行为之间的差异扫描、报告和受控修正。触发词：wiki、Wiki、知识库、同步文档、文档过期、规则不一致、扫描文档差异、更新 Books、README 和代码不一致、wiki-sync。
---

# Tyou Wiki 同步

本 skill 是 Tyou 当前唯一的 Wiki/文档知识库同步入口。扫描范围由项目根目录 `wiki-sync.yaml` 定义。

## 配置

同步配置位于项目根目录 `wiki-sync.yaml`。

关键字段：

- `source_paths`：需要和文档对齐的源码/工具/规则目录。
- `wiki_include`：当前本地 Wiki/文档集合的包含规则。
- `mappings`：源码目录到文档路径的映射。
- `ignore`：源码和文档扫描忽略规则。
- `write_enabled`：默认 `false`，写入必须显式开启或命令传入 `-Write`。
- `conflict_strategy`：冲突处理策略，默认 `ask`。
- `backup.directory`：写入前备份目录，默认 `.wiki-sync-backups`。
- `sensitive_patterns`：写入文档前必须脱敏的敏感信息模式。

## 脚本

只读扫描：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 scan
```

只读差异：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 diff
```

报告输出属于写操作；需要 `write_enabled: true` 或传入 `-Write`：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 report -Output wiki-sync-report.md -Write
```

## 模式

### scan

只读扫描覆盖关系和明显缺口。

- 输入：模块、功能、目录、最近改动范围或文档主题。
- 输出：涉及源码、README/Books、`.codex/rules/`、OpenSpec specs、skills、memory 的覆盖表。

### diff

只读比较源码/工具行为与文档描述。

- 先查源码或工具实现。
- 再查对应文档。
- 标记新增、删除、过时、冲突、缺少验收。

### sync

执行文档修正。

- L1 文档 typo 可以直接改。
- 任何影响 Codex 工作流、规则、OpenSpec specs、开发约束的同步属于 L2+，必须使用 OpenSpec change。
- 修改工作流时同步检查 `AGENTS.md`、`**/AGENTS.override.md`、`.agents/skills/*`、`.codex/rules/`、`.codex/memory/`、`wiki-sync.yaml`、`README.md`、`Books/AI-Development-Workflow.md`、`openspec/specs/`。
- 方向 A（项目到 Wiki）不自动覆盖文档；必须先生成报告，再按 OpenSpec 修改文档。
- 方向 B（Wiki 到项目）只生成待办，不自动改业务代码。

## 安全约束

- 不自动改业务代码；发现代码和文档冲突时，以源码为准，先报告再修文档。
- 不把非本项目规则写入 Tyou 文档；只写入已确认适合 Tyou 的机制。
- 不写敏感信息、绝对私有路径或临时日志进 README/Books。
- 写入报告或待办前必须确认 `write_enabled` / `-Write`，并使用 `.wiki-sync-backups` 作为备份目录。
- 可复发坑写入结构化 `.codex/memory/`。

## 输出格式

```text
Wiki 同步报告
- 范围：
- 源码/工具依据：
- 已查文档：
- 差异：
- 已修改：
- 仍需确认：
```

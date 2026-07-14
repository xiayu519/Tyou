---
name: wiki-sync
description: Tyou 项目文档知识库同步 skill。用于 README、Books、skill references、AGENTS.md、AGENTS.override.md、`.codex/memory` Project Knowledge、skills 与源码/工具行为之间的差异扫描、报告和受控修正。用户明确要求“同步文档、修正文档过期、扫描文档差异、更新 Books/README、处理文档与代码不一致”时使用；不用于仅查询文档位置、存在性或内容的问题。
---

# Tyou 文档同步

扫描范围、映射、写入开关、备份和脱敏规则由根目录 `wiki-sync.yaml` 定义。先报告源码/工具证据与文档差异，再在用户授权的任务范围内修正文档；不自动修改业务代码。

## 命令

```powershell
# 只读覆盖扫描
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 scan

# 只读差异扫描
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 diff

# 生成报告属于写操作
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-sync/scripts/wiki-sync.ps1 report -Output wiki-sync-report.md -Write
```

## 模式

### scan

检查源码、README/Books、skill references、AGENTS、skills 和 Project Knowledge 的覆盖关系与明显缺口。

### diff

先查源码或工具实现，再查对应文档，标记新增、删除、过时、冲突和缺少验证。

### sync

在当前任务已授权修改文档时实施受控修正：

1. 以源码和工具实际行为为准。
2. 工作流变更同时检查 `AGENTS.md`、`**/AGENTS.override.md`、`.codex/config.toml`、`.agents/skills/*`、`.codex/memory/` Project Knowledge、`wiki-sync.yaml`、`README.md` 和 `Books/AI-Development-Workflow.md`；只有官方 Codex 命令审批策略变化时才检查 `.codex/rules/*.rules`。
3. 项目到文档方向先确认差异，不无条件覆盖；文档到项目方向只生成待办，不自动改业务代码。
4. 报告或备份写入必须满足 `write_enabled` 或显式 `-Write`。

## 安全约束

- 不写敏感信息、绝对私有路径或临时日志到 README/Books。
- 不把外部通用参考直接写成 Tyou 规则；只记录已验证适用于本项目的结论。
- 可复发问题、长期决策、明确反馈，或包含 Tyou 特有取舍且无法由稳定 topic reference 替代的外部参考，才进入 `.codex/memory/` Project Knowledge；稳定官方链接清单不重复镜像，官方 Codex Memories 不由本 skill 手工维护。

## 输出

```text
文档同步报告
- 范围：
- 源码/工具证据：
- 已查文档：
- 差异：
- 已修改：
- 仍需确认：
```

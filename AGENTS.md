# AGENTS.md

请使用中文写提案和回答；代码标识、命令、路径、API 名称和日志原文保持原样。

本项目是 Cocos Creator 3.8.7 + TypeScript 的 Tyou 客户端框架。

## 规则位置

- 主题规则：`.codex/rules/tyou-dev/*.md`
- 记忆沉淀：`.codex/memory/INDEX.md` 与分类条目
- 变更监督：`openspec/`

按任务主题读取最少规则；规则与源码冲突时，以源码为准，并修正文档。

## 任务等级

| 等级 | 判断标准 | 处理 |
| --- | --- | --- |
| L1 | typo、注释、日志、单行无框架语义改名 | 直接处理，不走 OpenSpec |
| L2 | 单一模块局部修改、调用已知 API | 读 1 个相关规则，走轻量 OpenSpec change |
| L3 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 读 2-4 个相关规则，必须走 OpenSpec |
| L4 | 多模块协作、框架规则、Codex 工作流、重构决策 | 先探索和提案，再实施 |

不确定等级时上调一级。

## OpenSpec 门禁

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，先确认 OpenSpec 可用并进入 change：

1. 检查 `openspec --version` 和 `openspec/`；PowerShell 拦截 `openspec.ps1` 时用 `cmd /c openspec.cmd ...`。
2. 未安装或未初始化时停止实现，请开发者确认。
3. 没有匹配 change 就先 propose；已有 change 就按 tasks apply。
4. L3/L4 change 维护 `run-report.md`，并运行 Codex 可观测性 sensor 辅助 review。
5. tasks 全部完成、spec 已同步、验证通过且无阻塞时直接 archive；存在未完成项、未同步 delta、验证失败或目标不明确时才询问开发者。

L2 change 保持轻量：只写必要 proposal/tasks/spec delta；`run-report.md` 仅用于开发者要求或发现可复发工作流风险的场景。

## 代码优先

1. 优先用 `rg` 定位源码；不可用时用 VS Code `grep_search` 或 PowerShell `Select-String`。
2. 以源码和工具实际行为为准。
3. 文档过期时同步修正。
4. 可复发的问题记录到 `.codex/memory/` 分类条目，并更新 `INDEX.md`；memory 必须遵守 `.codex/rules/tyou-dev/memory-workflow.md` 的 frontmatter、stale 复核和不写入清单。

## 结束自检

1. 规则是否要同步：代码与 `.codex/rules/**/*.md` 不一致时同步规则。
2. 工作流是否一致：改动工作流时检查 `AGENTS.md`、`**/AGENTS.override.md`、`.agents/skills/*`、`.codex/rules/`、`.codex/memory/`、`wiki-sync.yaml`、`README.md`、`Books/AI-Development-Workflow.md`、`openspec/specs/`。
3. memory 是否要追加：可复发坑、决策、用户反馈或外部资料位置才记录；源码可查事实、临时状态、最近改动和未验证猜测不写入。
4. OpenSpec 是否要推进：走了 change 就检查 tasks；全绿且目标明确时直接 archive。

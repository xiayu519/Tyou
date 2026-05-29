# Tyou AI 开发工作流

## 文件

- `AGENTS.md`：会话入口规则。
- `.codex/rules/tyou-dev/*.md`：Tyou 主题规则，按需读取。
- `.codex/memory/`：可复发问题记录。
- `openspec/`：L2+ 变更监督。

## 等级

| 等级 | 场景 | 处理 |
| --- | --- | --- |
| L1 | typo、注释、日志、单行无框架语义改名 | 直接处理 |
| L2 | 单一模块局部修改、调用已知 API | 读 1 个相关规则，走轻量 change |
| L3 | 新功能、跨文件、UI/资源/事件/配表逻辑 | 读 2-4 个相关规则，必须走 change |
| L4 | 多模块协作、框架规则、AI 工作流、重构决策 | 先探索和提案，再实施 |

## OpenSpec

除 L1 外，任何会修改代码、资源、Prefab、配置、工作流文档或框架行为的任务，先确认 OpenSpec 可用并进入 change。

PowerShell 拦截 `openspec.ps1` 时，用：

```powershell
cmd /c openspec.cmd ...
```

## 代码优先

规则与源码冲突时：

1. 用 `rg` 定位源码；不可用时用 VS Code `grep_search` 或 PowerShell `Select-String`。
2. 以源码和工具实际行为为准。
3. 同步修正文档。
4. 可复发问题记到 `.codex/memory/problem_YYYY-MM-DD.md`。

## 强约束

- `Client/assets/ty-framework/` 默认不改；确需修改必须先确认。
- UI 脚本创建优先走 `uitscreate`，不绕开 `UIName/UIImportAll`。
- UI 图片加载、按钮点击、事件监听优先用 `UIBase` 内置能力。
- 资源走自动索引；禁止同名资源；找不到资源先检查索引生成。
- `addRef/decRef` 必须配对。
- Prefab 创建优先级：PSD 一键生成 > AI + 精简 MCP Prefab 流程 > 手动拼。
- 战斗设计优先组合，先评估现有 `tyou.ecs`。
- 高频战斗逻辑必须考虑小游戏 JavaScript 运行成本。

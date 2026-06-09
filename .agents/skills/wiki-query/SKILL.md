---
name: wiki-query
description: Tyou 项目 Wiki/文档知识库只读检索 skill。用于查 README、Books、skill references、openspec/specs、AGENTS.md、AGENTS.override.md、memory 与源码之间的对应关系，回答“wiki 在哪、文档在哪、参考是否存在、哪份文档过期、如何查项目文档”等问题。不修改文件。
---

# Tyou Wiki 查询

本 skill 是 Tyou 当前唯一的 Wiki/文档知识库只读检索入口。文档集合由项目根目录 `wiki-sync.yaml` 定义。

## 工作方式

1. 优先读取 `wiki-sync.yaml` 的 `wiki_include`，建立当前文档集合；如果配置不存在，再退回默认文档路径。
2. 用 `.agents/skills/wiki-query/scripts/wiki-query.ps1` 或 `rg` 定位关键词；不可用时用 PowerShell `Select-String`。
3. 只读最小相关文档；不整份复制长文档。
4. 文档和源码冲突时，以源码为准，并指出应进入 `wiki-sync` 或对应 OpenSpec change 修正。
5. 输出时列出查阅路径、当前结论、冲突或缺口。

## 脚本

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-query/scripts/wiki-query.ps1 -Query Luban -Limit 20
```

## 输出格式

- **查阅位置**：列出关键文件。
- **当前结论**：说明规则或说明是否存在。
- **冲突或缺口**：若有，说明源码依据。
- **建议下一步**：是否需要进入 `wiki-sync` 或 OpenSpec change。

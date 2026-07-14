---
name: wiki-query
description: Tyou 项目文档知识库只读检索 skill。用于查 README、Books、skill references、AGENTS.md、AGENTS.override.md、`.codex/memory` Project Knowledge 与源码的对应关系，回答“文档在哪、参考是否存在、哪份说明过期、如何查项目文档”等位置或事实问题；只读，不修改文件，也不用于请求同步或修正文档的任务。
---

# Tyou 文档查询

只读检索 Tyou 当前文档集合。文档范围由根目录 `wiki-sync.yaml` 的 `wiki_include` 定义。

## 工作方式

1. 读取 `wiki-sync.yaml` 的 `wiki_include`，确定当前文档集合。
2. 使用 `.agents/skills/wiki-query/scripts/wiki-query.ps1` 或 `rg` 定位关键词；不可用时使用 PowerShell `Select-String`。
3. 只读取最少相关文档，并在需要判断真伪时对照源码或工具实际输出。
4. 文档与源码冲突时，以源码为准，指出冲突以及应由 `wiki-sync` 修正的位置；本 skill 不写文件。
5. 输出查阅位置、当前结论、冲突或缺口；只有用户要实际同步时才切换到 `wiki-sync`。

## 命令

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/wiki-query/scripts/wiki-query.ps1 -Query Luban -Limit 20
```

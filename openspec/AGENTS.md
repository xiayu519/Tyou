# openspec/AGENTS.md

**当前目录是 OpenSpec 治理目录。**

修改 `changes/` 或 `specs/` 必须遵循四阶段：

1. **explore**：只读探索，可调用 `$openspec-explore`。
2. **propose**：创建/补全 `proposal.md`、`design.md`、`specs/`、`tasks.md`，可调用 `$openspec-propose`。
3. **apply**：逐项完成 `tasks.md`，每完成一项立刻把 `- [ ]` 改成 `- [x]`，可调用 `$openspec-apply-change`。
4. **archive**：完成后移动到 `changes/archive/YYYY-MM-DD-<name>/`，可调用 `$openspec-archive-change`。

约束：
- 未走 propose 直接新建 change 子目录；
- 跳过未完成 tasks 直接 archive；
- `archive/` 清理必须通过明确的 OpenSpec change 记录原因和验证结果。

推荐 CLI 校验：

```powershell
openspec --version
openspec list --json
openspec status --change "<name>" --json
```

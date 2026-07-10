# Codex Memory Index

本索引用于记录跨会话可复用信息。当前仓库为干净初始状态，暂无 memory 条目。

索引约束：每条 memory 只占一行，长解释写在正文；目标不超过 80 行、2 KB。正文必须有 `type`、`description`、`status`、`last_verified`、`source` frontmatter。

## Problems

- [codex-skill-utf8-bom-discovery.md](problems/codex-skill-utf8-bom-discovery.md): `SKILL.md` 带 UTF-8 BOM 会使 Codex CLI 漏载仓库 skill。

## Decisions

暂无。

## Feedback

- [verify-codex-behavior-before-claim.md](feedback/verify-codex-behavior-before-claim.md): 工具行为结论必须由实现输出或隔离实验确认。

## References

暂无。

## Context

The active workflow already separates entrypoints, topic rules, OpenSpec specs, and memory. The remaining token risk is mostly entrypoint size and scan noise, not missing governance.

## Goals / Non-Goals

**Goals:**

- Keep skill activation precise for Tyou-specific work.
- Reduce `tyou-dev` entrypoint text that duplicates detailed `.codex/rules/` behavior.
- Keep Wiki sync scans focused on source and documentation files, not generated caches.
- Preserve OpenSpec, memory, protected framework, and end-of-task guardrails.

**Non-Goals:**

- Do not relax OpenSpec requirements.
- Do not change business runtime behavior or Cocos assets.
- Do not remove specialized skills such as `luban-dev`, `cocos-asset-json`, `tyou-shader-dev`, `wiki-query`, or `wiki-sync`.

## Decisions

- `tyou-dev/SKILL.md` remains the router and short principle sheet; detailed step-by-step workflow stays in `.codex/rules/tyou-dev/*.md`.
- Trigger wording keeps explicit Cocos/Tyou terms and avoids broad generic terms where a specialized skill should only load on precise context.
- `wiki-sync.yaml` ignores Python cache artifacts so scan counts better reflect durable source and docs.
- `openspec/AGENTS.md` wording is clarified as a guardrail typo-level fix within this workflow change.

## Risks / Trade-offs

- Over-compressing the skill could make Codex miss required guardrails. Mitigation: keep the core protected-path, OpenSpec, source-first, and topic-routing constraints in the entrypoint.
- Narrowing triggers too far could skip a skill. Mitigation: retain concrete API, asset, tool, and workflow names in the frontmatter description.

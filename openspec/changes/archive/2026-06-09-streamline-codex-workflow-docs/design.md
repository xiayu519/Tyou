## Context

Official Codex skills use progressive disclosure: metadata is always visible, full `SKILL.md` loads only when selected, and additional references/scripts should be opened only as needed. Tyou already uses this layout for topic references; the OpenSpec phase skills can use the same pattern.

## Goals / Non-Goals

**Goals:**

- Preserve the exact Tyou workflow behavior and current CLI usage.
- Reduce duplicated long-form workflow text in specs and selected OpenSpec phase skills.
- Keep phase skill descriptions stable so implicit and explicit invocation remain unchanged.
- Keep deterministic validation and OpenSpec archive gates.

**Non-Goals:**

- Do not remove OpenSpec gates from `AGENTS.md` or `tyou-dev`.
- Do not alter OpenSpec command names, schema, or artifact expectations.
- Do not migrate project memory to official generated Codex memories.

## Decisions

- Keep each OpenSpec phase skill's frontmatter `name` and `description` unchanged.
- Keep `SKILL.md` as a short dispatcher with must-not-break guardrails, and move detailed procedures to `references/*.md` inside the same skill.
- Merge project memory specification into the existing structured memory requirement rather than keeping a second near-duplicate requirement.

## Risks / Trade-offs

- If a shortened phase skill omits a guardrail, behavior could change. Mitigation: keep critical guardrails in the short `SKILL.md` and put full details in references.
- If spec cleanup removes too much wording, archive validation may still pass but review clarity may suffer. Mitigation: preserve scenarios and normative requirements, only remove duplication.

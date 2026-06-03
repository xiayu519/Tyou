## Context

The live dashboard is human-facing and local-only. It should match the project's Chinese-facing Codex workflow style.

## Goals / Non-Goals

**Goals:**

- Make dashboard labels understandable in Chinese.
- Translate derived statuses such as connected, partial, missing, warning, and healthy.
- Add short Chinese explanations for what each area means.

**Non-Goals:**

- Do not change data collection.
- Do not change refresh interval or server behavior.
- Do not translate literal file paths, commands, or API names.

## Decisions

- Translate in the browser layer where possible so the collector can keep stable English IDs.
- Keep English status source values in detail JSON but show Chinese labels in visible badges.

## Risks / Trade-offs

- [Risk] Some details are still JSON with English keys -> Mitigation: visible summaries and headings are Chinese; technical keys stay stable for debugging.

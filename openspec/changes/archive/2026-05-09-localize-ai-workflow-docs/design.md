## Context

Tyou now has a working Codex-native workflow. The documentation should stop describing how it compares to another project and instead describe the current local behavior. Some correction ideas are still useful if expressed as Tyou/Codex mechanisms rather than imported concepts.

## Goals / Non-Goals

**Goals:**

- Remove external project comparison language from AI workflow docs.
- Keep the documentation practical and truthful: describe only files and behaviors that exist or are explicitly optional.
- Codex-localize useful correction mechanisms: source-first checks, reference updates, memory notes, OpenSpec sync/archive checks, validation summaries, and optional engineering hard gates.
- Keep token policy conservative and avoid universal guarantees.

**Non-Goals:**

- Do not add Claude-specific installation, slash command, memory, or plugin instructions.
- Do not add wiki sync or vector memory as if it already exists.
- Do not change runtime framework code.

## Decisions

1. **Replace comparison sections with current-state sections.**
   The book should describe "当前工作流能力" and "纠偏与自我维护", not external project comparisons.

2. **Treat advanced correction features as optional directions unless implemented.**
   `.codex/memory` exists, so problem notes are documented as active. Wiki sync, hard gates, and richer diagnostics are optional future additions.

3. **Keep README concise.**
   README only needs a factual summary and link; detailed correction policy belongs in the workflow book.

## Risks / Trade-offs

- [Risk] Removing comparisons may hide useful design rationale. -> Mitigation: preserve reusable mechanisms as local Tyou workflow statements.
- [Risk] Optional future ideas may be mistaken as current behavior. -> Mitigation: label them under "可选增强".

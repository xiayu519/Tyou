## Context

AGENTS.md currently begins with a Chinese-language instruction, but it names only proposals, explanations, and summaries. The reference workflow uses the broader baseline "请使用中文写提案和回答", which makes normal chat answers clearly covered.

## Goals / Non-Goals

**Goals:**
- Align the Tyou Codex entry instruction with the reference workflow's Chinese proposal and answer baseline.
- Clarify the local Codex interpretation of "回答" so progress updates, clarifications, explanations, summaries, and final responses are covered.
- Keep code identifiers, commands, file paths, API names, and logs in their original literal language.

**Non-Goals:**
- No runtime framework changes.
- No TEngine/Unity workflow concepts are added to Tyou.
- No generated Cocos assets, Prefabs, or OpenSpec schema files are changed.

## Decisions

- Use the reference wording as the leading sentence in AGENTS.md: "请使用中文写提案和回答。"
- Add one local clarification sentence after it instead of replacing other workflow content, because Codex may interpret "answer" narrowly unless the scope is explicit.
- Add a dedicated requirement to `codex-ai-workflow` so future workflow edits preserve the language contract.

## Risks / Trade-offs

- Broad Chinese-response wording could accidentally translate code or logs. Mitigation: explicitly preserve code identifiers, commands, file paths, API names, and logs as literal text.
- Instructions remain probabilistic in LLM behavior. Mitigation: make the first AGENTS.md sentence match the reference baseline and keep the requirement testable in OpenSpec.
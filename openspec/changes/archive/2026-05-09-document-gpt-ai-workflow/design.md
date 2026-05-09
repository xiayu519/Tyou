## Context

Tyou now has a Codex-native AI workflow using `AGENTS.md`, `.agents/skills/`, OpenSpec, and `.codex/memory/`. The reference TEngine project has a larger Claude Code workflow document. This README update should mirror the explanatory style and structure only, while staying accurate to the current repository.

## Goals / Non-Goals

**Goals:**

- Add a concise README section for GPT/Codex AI workflow.
- Keep the section local and factual: list actual files and actual guarantees.
- Explicitly state that Claude Code differs and needs separate adaptation.
- Mention OpenSpec supervision for L2+ work and the L1 skip path for token control.
- Fix stale README mention of the removed debug panel.

**Non-Goals:**

- Do not document Claude installation, ccswitch, claude-mem, Unity-MCP, or TEngine runtime concepts.
- Do not claim OpenSpec is a technical hard gate like CI/pre-commit.
- Do not claim the workflow is always cheaper than having no workflow.
- Do not change the existing `Books/AI-Development-Workflow.md` deep-dive unless README needs a link to it.

## Decisions

1. **Put a concise section in README and keep the detailed version in Books.**
   README should orient project users quickly; `Books/AI-Development-Workflow.md` remains the deeper workflow document.

2. **Use GPT/Codex wording, not generic AI wording.**
   The actual checked-in workflow uses Codex-native `.agents/skills`, `AGENTS.md`, and OpenSpec skills. Claude Code has different skill/command/memory mechanics.

3. **Describe token savings conservatively.**
   The workflow reduces unnecessary reads and rework for complex tasks, but trivial tasks still pay the root instruction cost. The README should say exactly that.

## Risks / Trade-offs

- [Risk] README becomes too long. -> Mitigation: keep it concise and link to `Books/AI-Development-Workflow.md`.
- [Risk] Readers assume Claude can use the same workflow unchanged. -> Mitigation: explicitly state this is GPT/Codex only.
- [Risk] OpenSpec is perceived as a hard technical blocker. -> Mitigation: describe it as project workflow supervision, not CI-level enforcement.

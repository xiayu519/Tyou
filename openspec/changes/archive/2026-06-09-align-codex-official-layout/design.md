## Context

The refreshed Codex manual says Codex discovers project instructions from `AGENTS.override.md`, `AGENTS.md`, and configured fallback filenames from the repository root down to the current directory. It discovers repository skills from `.agents/skills` along the current directory-to-root path. It describes `.codex/rules/*.rules` as experimental command approval policy, not Markdown topic documentation.

## Goals / Non-Goals

**Goals:**

- Match official Codex layout as closely as possible without reducing Tyou guardrails.
- Keep the root `AGENTS.md` small and durable, with directory overrides close to protected folders.
- Keep rich repeatable workflows and references under `.agents/skills` using progressive disclosure.
- Keep Tyou structured memory indexed and routed, while documenting that it is a project workflow layer rather than the official generated `~/.codex/memories` store.

**Non-Goals:**

- Do not introduce project-local `.rules` policy unless there is a command approval need.
- Do not remove OpenSpec supervision.
- Do not change Cocos runtime behavior or resource assets.

## Decisions

- Move topic Markdown files into `.agents/skills/tyou-dev/references/` because official skills support references and progressive disclosure.
- Update all project docs and specs to call these files `Tyou topic references` instead of Codex `.rules`.
- Keep `.codex/memory/` for the existing Tyou structured memory workflow because it is intentionally checked into the repo and indexed; clarify it is distinct from official Codex generated memories.
- Keep nested `AGENTS.override.md` files where they are: they match the official closer-directory override model.

## Risks / Trade-offs

- Path churn can break local routing if any reference is missed. Mitigation: use `rg` replacement checks and wiki-sync diff.
- Moving from `.codex/rules` to skill references changes terminology. Mitigation: update `AGENTS.md`, Books, specs, memory references, skills, and wiki-sync together in this change.
- Existing dirty worktree entries from earlier workflow changes remain. Mitigation: edit only paths required by this change and do not revert unrelated changes.

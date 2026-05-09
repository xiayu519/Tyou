## Context

Tyou already has a Codex entrypoint in `AGENTS.md` and a project-specific knowledge layer in `.codex/skills/tyou-dev`. Before this change, OpenSpec was documented but not installed or initialized, so future implementation tasks could still bypass spec supervision.

The reference project uses the same general pattern: a main AI entry file, project skill references, and OpenSpec propose/apply/archive/explore workflows. Tyou must keep that structure while replacing all engine-specific content with Cocos Creator rules.

## Goals / Non-Goals

**Goals:**

- Make OpenSpec available in the current repository.
- Make Codex implementation tasks follow OpenSpec changes for L2+ work.
- Keep Tyou framework, UI, resource, Luban, and prefab constraints visible to OpenSpec artifact generation.
- Keep token usage bounded through AGENTS routing and small reference files.

**Non-Goals:**

- No modification to `Client/assets/ty-framework/`.
- No Unity/TEngine runtime concepts in Tyou workflow documents.
- No broad MCP import; prefab MCP remains minimal and prefab-focused.

## Decisions

- Use `openspec init --tools codex --force` so OpenSpec creates Codex-compatible skills without Claude/Cursor integrations.
- Keep generated OpenSpec skills separate from `tyou-dev`. OpenSpec controls change lifecycle; `tyou-dev` controls Tyou framework knowledge.
- Put Tyou constraints in `openspec/config.yaml` so proposal/design/spec/tasks generation receives the same project rules without reading every reference.
- Document Windows execution via `cmd /c openspec.cmd ...` because PowerShell may block npm-generated `.ps1` shims.
- Keep L1 outside OpenSpec to preserve token efficiency for trivial edits; L2+ implementation must use OpenSpec.

## Risks / Trade-offs

- [Risk] OpenSpec CLI is installed globally and may differ by machine. -> Mitigation: document `openspec --version` and Windows `openspec.cmd` usage.
- [Risk] Generated OpenSpec skills add files under `.codex/skills/`. -> Mitigation: keep them scoped to OpenSpec lifecycle and keep `tyou-dev` as the framework skill.
- [Risk] Overusing OpenSpec for tiny edits increases token cost. -> Mitigation: L1 bypass remains explicit.

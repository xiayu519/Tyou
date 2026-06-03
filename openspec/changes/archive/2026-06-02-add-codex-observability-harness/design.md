## Context

Current Tyou Codex workflow uses:

- `AGENTS.md` and `.agents/skills/*` as entrypoints and routing.
- `.codex/rules/tyou-dev/*.md` as compact topic rules.
- `openspec/` as the L2+ SDD gate.
- `.codex/memory/` and `wiki-sync.yaml` for local correction loops.

This already covers much of the SDD + Harness pattern, but the observable evidence is spread across chat summaries, terminal output, `tasks.md`, git diff, memory entries, and ad hoc validation notes. The new harness layer should make evidence easy to collect and review while staying local, simple, and cheap.

## Goals / Non-Goals

**Goals:**

- Make L3/L4 Codex changes leave a compact run report under the change directory.
- Provide deterministic sensor entrypoints that inspect existing workflow artifacts without touching business code.
- Generate a human-readable dashboard from OpenSpec change artifacts, git status, run report, and sensor output.
- Feed recurring issues back into `.codex/memory/` and docs through existing wiki-sync/OpenSpec rules.
- Keep the implementation local to PowerShell scripts and Markdown conventions.

**Non-Goals:**

- Do not build a web service, database, live monitor, or multi-agent orchestration system.
- Do not copy Unity/Claude terms into Tyou rules unless the local Codex equivalent exists.
- Do not modify `Client/assets/ty-framework/`, Prefab/Scene/meta files, Luban data, generated files, or Cocos runtime code.
- Do not make L1 tasks produce reports or dashboards.

## Decisions

1. Keep trace data as Markdown inside each OpenSpec change.
   - Chosen: `openspec/changes/<change>/run-report.md`.
   - Alternative: JSON trace store. Rejected for now because Markdown is easier for humans and existing OpenSpec review.

2. Add scripts as skill-local tools.
   - Chosen: `.agents/skills/tyou-dev/scripts/`.
   - Alternative: root `scripts/`. Rejected because the behavior is Codex workflow-specific, not product runtime tooling.

3. Use deterministic sensors before inferential review.
   - Chosen checks: OpenSpec status, required artifact presence, task checkbox progress, protected-path changes, workflow consistency file presence, and run-report shape.
   - Alternative: AI-only review checklist. Rejected because it is not reproducible.

4. Generate a static Markdown dashboard.
   - Chosen: `codex-observability-dashboard.md` or caller-provided output.
   - Alternative: HTML/GUI dashboard. Deferred until the Markdown report proves useful.

5. Treat external articles as references, not project rules.
   - Chosen: record references in `.codex/memory/references/` and local design decision in `.codex/memory/decisions/`.
   - Alternative: paste article concepts into README/Books. Rejected to avoid external comparison sections and stale borrowed terminology.

## Risks / Trade-offs

- [Risk] Reports become busywork for small tasks -> Mitigation: require them for L3/L4 and optional for L2, never for L1.
- [Risk] Sensor scripts over-promise enforcement -> Mitigation: document them as local checks and keep hard gates limited to existing OpenSpec/sandbox behavior.
- [Risk] Dashboard repeats sensitive terminal logs -> Mitigation: summarize commands and outcomes, do not capture full raw logs by default.
- [Risk] Workflow docs drift across entrypoints -> Mitigation: include consistency checks in tasks and specs, then validate with `rg`.

## Migration Plan

1. Add OpenSpec delta requirements for Codex observability.
2. Add local scripts for sensor checks and dashboard generation.
3. Update `tyou-dev` routing and OpenSpec workflow rules to mention the observability artifacts.
4. Update README/Books overview without duplicating long mechanics.
5. Record memory references/decision.
6. Run local validation and leave the change ready for archive.

# Proposal

## Why

The project is a new framework project, so the Codex memory workflow can adopt a stricter structure now without preserving legacy memory formats. The current workflow already keeps memory lightweight, but it lacks explicit frontmatter, stale handling, memory write exclusions, index size discipline, L2 lightweight limits, and a compact run-report summary.

## What

- Add structured memory frontmatter and templates for `problem`, `decision`, `feedback`, and `reference` memory entries.
- Define what must not be written to memory, memory source priority, and stale verification behavior.
- Keep `.codex/memory/INDEX.md` as a compact index with line/byte discipline.
- Add an executive summary section to the `run-report.md` template and sensor requirement.
- Define L2 OpenSpec lightweight limits so small tasks do not become heavy workflow artifacts.
- Update active workflow docs, skill routing, evals, memory, and OpenSpec specs.

## Non-Goals

- Do not add automatic memory extraction.
- Do not add an LLM/top-k memory selector.
- Do not introduce user/team/local memory layers.
- Do not reintroduce dashboard, web, or live visualization.
- Do not preserve old memory formats; this project may use the new schema directly.

## Impact

- Memory entries become easier to route and safer to use.
- Future memory growth is controlled early.
- L2 workflow remains light while L3/L4 retains evidence quality.

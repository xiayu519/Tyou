## Executive Summary

- Goal: align the Tyou Codex workflow layout with current official Codex guidance while preserving existing OpenSpec, skill routing, wiki-sync, and project memory behavior.
- State: Tyou topic Markdown files moved from `.codex/rules/tyou-dev/` to `.agents/skills/tyou-dev/references/`; workflow docs, skills, memory references, wiki-query, wiki-sync, OpenSpec config, and specs now use the official-aligned path.
- Validation: OpenSpec strict validation, wiki-sync scan/diff, AGENTS layout scan, stale-path search, and skill metadata size checks were run.
- Remaining risk: `.codex/memory/` remains a Tyou checked-in project memory layer, distinct from official generated Codex memories under Codex home; this is intentional and documented in the workflow spec.

## Official Evidence

- Refreshed Codex manual: `D:\Personal\Temp\openai-docs-cache\codex-manual.md`, status reported as updated.
- `AGENTS.md`: official manual says Codex builds an instruction chain from global guidance, then project scope from repo root down to current directory, checking `AGENTS.override.md`, then `AGENTS.md`, then configured fallback names, and closer files override earlier guidance. Source page: `https://developers.openai.com/codex/guides/agents-md`.
- Skills: official manual says skills use progressive disclosure, Codex starts with name/description/path, loads full `SKILL.md` only when selected, and repo skills are discovered from `.agents/skills` along the current directory-to-root path. Source page: `https://developers.openai.com/codex/skills`.
- Rules: official manual describes `.codex/rules/*.rules` as experimental command approval policy, not Markdown topic documentation. Source page: `https://developers.openai.com/codex/rules`.
- Memories: official manual says official memories live under Codex home, while required team guidance should stay in `AGENTS.md` or checked-in docs. Tyou's `.codex/memory/` is therefore documented as checked-in project memory, not official generated user memory. Source page: `https://developers.openai.com/codex/memories`.

## Validation

- `openspec validate align-codex-official-layout --strict`: passed.
- `openspec validate --all --strict`: 8 passed, 0 failed.
- `wiki-sync.ps1 scan`: completed; mappings now cover `.agents/skills/tyou-dev/references` and no source mapping gaps were reported.
- `wiki-sync.ps1 diff`: no mapping gaps detected.
- Stale path search for `.codex/rules/tyou-dev` in active workflow files returned no matches outside this change's historical migration notes.
- AGENTS scan confirmed active project instruction files remain root `AGENTS.md`, `Client/assets/ty-framework/AGENTS.override.md`, `Client/extensions/AGENTS.override.md`, and `openspec/AGENTS.md`.
- Skill metadata check showed repo skills remain under `.agents/skills`; total description text remains under the official initial-skill-list budget guidance.

## Change

- Moved 17 Tyou topic reference files to `.agents/skills/tyou-dev/references/`.
- Updated root `AGENTS.md`, Books workflow docs, wiki-sync config, wiki-query fallback paths, skill references, memory entries, OpenSpec config, and specs to use the official-aligned reference location.
- Left `.codex/rules/` empty and reserved for future official Codex `.rules` command policy files.

## Decisions

- Keep `AGENTS.md` as the durable project instruction entrypoint and keep nested `AGENTS.override.md` files close to protected folders, matching the official instruction layering model.
- Keep detailed Tyou topic guidance with `tyou-dev` as skill-owned `references/`, matching official skill progressive disclosure.
- Keep `.codex/memory/` because it is an explicit Tyou project memory workflow; distinguish it from official generated Codex user memories.
- Do not add `.codex/rules/*.rules` now because there is no command approval policy requirement in this task.

## Sensors

- Observability sensor will be run after this report and task validation are updated.

## Risks

- Any external scripts not covered by active `rg` searches that hard-code `.codex/rules/tyou-dev/` would need a separate update if discovered later.
- Historical OpenSpec archives keep old paths by design and were excluded from active workflow edits.

## Correction Loop

- Main workflow specs were synchronized because this change affects durable Codex layout behavior.
- No new memory entry was added: the durable decision is represented in active specs and checked-in workflow references.

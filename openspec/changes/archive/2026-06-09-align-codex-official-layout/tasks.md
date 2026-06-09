## 1. Align Layout

- [x] 1.1 Move Tyou topic Markdown rules from `.codex/rules/tyou-dev/` to `.agents/skills/tyou-dev/references/`.
- [x] 1.2 Update `AGENTS.md`, skills, memory entries, Books, wiki-query, wiki-sync, and OpenSpec specs to reference the new path.
- [x] 1.3 Leave `.codex/rules/` available only for official Codex `.rules` command policy and remove the old Markdown topic directory.

## 2. Preserve Behavior

- [x] 2.1 Confirm nested `AGENTS.override.md` files remain in the official closer-directory override layout.
- [x] 2.2 Confirm skill descriptions remain focused and repo skills remain under `.agents/skills`.
- [x] 2.3 Confirm project structured memory remains indexed and documented as Tyou project memory.

## 3. Validate And Archive

- [x] 3.1 Run OpenSpec validation and wiki-sync scan/diff.
- [x] 3.2 Run static searches for stale `.codex/rules/tyou-dev` references and official-layout wording.
- [x] 3.3 Record official documentation evidence in `run-report.md` and run the observability sensor.
- [x] 3.4 Archive the completed change when gates are green.

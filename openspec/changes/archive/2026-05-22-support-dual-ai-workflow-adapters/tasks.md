## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, delta specs, and tasks for the dual AI workflow adapter change
- [x] 1.2 Verify the change reaches apply-ready status

## 2. Shared Rule Source

- [x] 2.1 Create `.ai/rules/tyou-dev/` as the canonical shared Tyou rule source
- [x] 2.2 Convert legacy Codex reference files into compatibility pointers instead of duplicate rule content

## 3. Codex Adapter

- [x] 3.1 Update `AGENTS.md` to describe Codex as an isolated adapter over shared rules
- [x] 3.2 Update `.agents/skills/tyou-dev/SKILL.md` and OpenSpec skill wrappers to route to shared rules without referencing `.claude/`

## 4. Claude Code Adapter

- [x] 4.1 Add `CLAUDE.md` with Claude Code entry rules and shared-rule routing
- [x] 4.2 Add `.claude/settings.local.json`, `.claude/skills/`, and `.claude/commands/opsx/` wrappers that use Claude Code native workflow features without referencing `.agents/`

## 5. Documentation and Validation

- [x] 5.1 Update README, Books workflow documentation, and main OpenSpec specs to describe the dual-adapter architecture
- [x] 5.2 Validate path isolation, OpenSpec status, and absence of duplicated long-form rule content in adapter wrappers

## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, delta specs, and implementation tasks for removing Claude workflow support

## 2. Remove Claude Workflow Surface

- [x] 2.1 Delete `CLAUDE.md` and `.claude/` workflow adapter files
- [x] 2.2 Update README and Books workflow documentation to describe Codex-only workflow

## 3. Update Codex and Shared Rules

- [x] 3.1 Update `AGENTS.md` to remove dual-shell synchronization rules and keep Codex-only checks
- [x] 3.2 Update `.agents/skills/tyou-dev/SKILL.md` and `.ai/rules/tyou-dev/*` workflow rules to remove Claude workflow references
- [x] 3.3 Update main OpenSpec specs to match the Codex-only workflow requirements

## 4. Validation

- [x] 4.1 Verify current workflow docs and specs no longer require Claude workflow files
- [x] 4.2 Verify OpenSpec status for `remove-claude-workflow`

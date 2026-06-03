## ADDED Requirements

### Requirement: New framework projects may reset memory baseline
The Codex workflow MUST allow this new framework project to delete prior active memory entries after their authoritative rules have been captured elsewhere.

#### Scenario: Developer requests clean memory baseline
- **WHEN** the developer confirms old memory entries should be deleted for the new framework baseline
- **THEN** Codex removes active memory entry files
- **AND** keeps `.codex/memory/INDEX.md`, typed memory directories, `.gitkeep` files, rules, and templates
- **AND** updates `.codex/memory/INDEX.md` to show empty categories

#### Scenario: Memory content duplicates authoritative rules
- **WHEN** a memory entry duplicates behavior already encoded in `AGENTS.md`, `.codex/rules/`, `Books/`, or `openspec/specs/`
- **THEN** Codex may delete the memory entry rather than keeping duplicate supporting context

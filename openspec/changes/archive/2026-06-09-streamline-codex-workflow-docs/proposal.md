## Why

After aligning the Tyou workflow layout with official Codex guidance, a few workflow docs still duplicate equivalent memory requirements and some OpenSpec phase skills carry long operational details in `SKILL.md`. This adds reread cost without changing behavior.

## What Changes

- Merge duplicated memory specification language so project memory is described once as Tyou checked-in structured memory.
- Clean remaining legacy wording such as `rules` where the intended concept is Tyou topic references.
- Move detailed OpenSpec phase procedures from the four OpenSpec phase `SKILL.md` entrypoints into skill-owned `references/` files.
- Keep all user-facing CLI entrypoints, skill names, descriptions, OpenSpec gates, tasks behavior, archive behavior, and validation expectations unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: reduce duplicated wording while preserving the same workflow requirements.

## Impact

- Affects Codex workflow docs/specs and OpenSpec skill packaging only.
- Does not change business code, Cocos assets, Luban data, OpenSpec schema, or the CLI entrypoint behavior.

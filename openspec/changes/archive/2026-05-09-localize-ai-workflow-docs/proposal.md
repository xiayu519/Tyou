## Why

The current AI workflow documentation still contains comparison-oriented language about external projects. The workflow docs should describe Tyou's actual GPT/Codex workflow directly, without carrying extra comparison text.

## What Changes

- Remove external project comparison language from AI workflow documentation.
- Rewrite the workflow book section so it states the current Codex workflow, local correction loop, OpenSpec behavior, and token policy directly.
- Keep Claude differences where relevant, but do not frame Tyou's workflow as a comparison against another project.
- Add Codex-localized correction mechanisms that are useful for this repository: source-first correction, reference sync, OpenSpec artifact sync, memory notes, validation summaries, and optional future hard gates.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codex-ai-workflow`: AI workflow documentation must be local, factual, and free of external project comparison language.
- `project-readme-ai-workflow`: README AI workflow summary must link to the workflow book without saying it records external project differences.

## Impact

- Affected docs: `Books/AI-Development-Workflow.md`, `README.md`.
- No runtime code, assets, Prefab, generated UI, or framework modules are changed.

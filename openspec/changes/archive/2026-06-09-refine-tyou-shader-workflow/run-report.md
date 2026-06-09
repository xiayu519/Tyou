## Executive Summary

- Goal: refine Tyou shader workflow routing after inspecting a real Cocos Effect/Material sample from `D:\aipro\first-game`.
- State: shader sample reference, skill routing, trigger wording, eval, Books workflow note, and main OpenSpec spec are updated.
- Validation: skill validation, eval JSON parse, static routing/sample searches, OpenSpec status, and Codex observability sensor were run.
- Remaining risk: starter `.effect` templates still need Cocos Creator 3.8.7 editor/import validation before being copied into game assets.

## Validation

- `quick_validate.py .agents/skills/tyou-shader-dev`: passed.
- `.agents/skills/tyou-dev/evals/evals.json` JSON parse: passed.
- Static search confirmed `cocos-effect-samples.md`, `CCSampleWithAlphaSeparated`, precise shader routing requirements, and no standalone `、effect、` trigger in `tyou-dev`.
- `openspec status --change refine-tyou-shader-workflow --json`: artifacts complete.
- `codex-observability-check.ps1 -Change refine-tyou-shader-workflow`: first run passed core checks and warned only about uncompleted validation/archive tasks and missing run report; this report resolves the run-report warning before final sensor rerun.

## Change

- Added `.agents/skills/tyou-shader-dev/references/cocos-effect-samples.md` with the checked `first-game` Effect/Material/Prefab binding chain.
- Updated `tyou-shader-dev` routing, Cocos Effect workflow guidance, and UI/Sprite starter template to prefer Cocos Sprite texture binding when appropriate.
- Narrowed `tyou-dev` shader trigger wording and synced eval, Books workflow note, and `codex-ai-workflow` spec.

## Decisions

- Keep the real sample in an on-demand reference instead of `SKILL.md` to control token cost.
- Keep generic gameplay `effect` separate from shader `.effect` / Cocos Effect work.
- Treat the `first-game` path as reference material, not current Tyou source truth.

## Sensors

- `quick_validate.py`: passed.
- Eval JSON parse: passed.
- Static routing/sample searches: passed.
- OpenSpec status: complete.
- Codex observability sensor: pass with pre-archive warnings only before final task/archive completion.

## Risks

- Starter `.effect` templates are still starter assets and need Cocos Creator 3.8.7 import/compiler validation before production use.
- External sample assumptions must be rechecked against the current Tyou asset tree before editing game assets.

## Correction Loop

- Main workflow docs/specs were synchronized because this change touched skill routing and token-efficiency behavior.
- No new memory entry was added: the durable scope and external reference source were already covered by existing memory, and sample details now live in the shader skill reference.

## Notes

- `generate_openai_yaml.py` must be run with `PYTHONUTF8=1` on this Windows environment when reading Chinese UTF-8 `SKILL.md`; without it, Python defaulted to GBK and failed before writing.
- No `Client/assets`, generated Cocos cache, Luban files, or `ty-framework` files were changed.

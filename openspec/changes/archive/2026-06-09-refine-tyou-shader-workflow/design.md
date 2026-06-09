## Context

`tyou-shader-dev` already routes Tyou shader work into a dedicated skill and keeps detailed guidance in references. A real sample was later found in `D:\aipro\first-game`: `actor-occlusion-outline.effect`, `.mtl`, `.meta`, and a Prefab `cc.Sprite._customMaterial` binding.

The current `tyou-dev` routing still lists standalone `effect` as a trigger term. In this project, `effect` can also mean gameplay/VFX concepts that are not Cocos shader assets, so that wording can load shader context unnecessarily.

## Goals / Non-Goals

**Goals:**

- Preserve the real Cocos Effect/Material sample as an on-demand shader reference.
- Narrow shader trigger wording without hiding actual `.effect`/Cocos Effect tasks.
- Keep workflow docs/specs concise and avoid duplicating shader recipes outside the shader skill.

**Non-Goals:**

- Do not add or modify game runtime shaders under `Client/assets`.
- Do not expand scope to 3D shader, PBR, URP host APIs, Compute, or post-processing pipelines.
- Do not parse Luban `.bin` or change Cocos generated cache.

## Decisions

- Add the `first-game` sample details under `tyou-shader-dev/references/` instead of `SKILL.md`, because the sample is useful only when implementing or reviewing Cocos Effect/Material binding.
- Keep `SKILL.md` as a short router that names the reference and keeps startup context small.
- Replace standalone `effect` trigger wording in `tyou-dev` with shader-specific forms such as `Cocos Effect`, `.effect`, `Material`, and `shader/effect`.

## Risks / Trade-offs

- Reference project paths are external to this repository -> mark them as sample/reference material, not current Tyou source facts.
- Trigger narrowing could miss a vague user request that only says `effect` -> keep `shader/effect`, `Cocos Effect`, `.effect`, `Material`, `Spine shader`, and `flipbook` triggers for actual shader tasks.

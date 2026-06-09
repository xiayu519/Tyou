## Context

`unity_shader_dev` is a Unity URP execution-layer skill. It is valuable as a source of skill architecture, recipes, performance thinking, and reusable shader math, but its Unity host code does not fit Tyou/Cocos Creator directly.

The localized Tyou skill should treat Unity Built-in as a closer conceptual reference for simple material/pass/render-state thinking, but still rewrite syntax and host integration for Cocos Effect/Material. The user clarified that the initial useful scope is 2D, Spine, and sequence-frame images.

## Skill Shape

- `SKILL.md`: compact routing, workflow, boundaries, output contract.
- `references/cocos-effect-workflow.md`: source asset, material, meta, prefab/scene and validation rules.
- `references/2d-ui-sprite.md`: UI/Sprite effects such as flash, tint, dissolve, outline, flow light and UV distortion.
- `references/spine.md`: Spine-specific alpha, vertex color, atlas, premultiplied alpha and runtime parameter cautions.
- `references/sequence-frame.md`: flipbook and SpriteAtlas sequence-frame boundaries.
- `references/porting.md`: ShaderToy/GLSL/Unity Built-in/URP localization rules.
- `references/minigame-performance.md`: sample budget, overdraw, pass, branch and downgrade rules.
- `assets/templates/*`: starter artifacts for common future edits.

## Boundaries

- The skill must not trigger for 3D shader/PBR/water/raymarching/volume/path-tracing work.
- It must not directly copy Unity ShaderLab/URP/Compute/RenderGraph code.
- It must mark templates as starters until validated in a concrete Cocos project context.
- It should prefer low-cost 2D effects suitable for minigame runtime.

## Validation

- Skill frontmatter and `agents/openai.yaml` validation.
- Static search that `tyou-dev` routes shader/effect terms to `tyou-shader-dev`.
- OpenSpec status and observability sensor.

## Follow-Up

When the first real Cocos `.effect/.material` is added to `Client/assets`, update this skill with the verified local syntax and exact material binding examples.

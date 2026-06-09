## Why

The user wants a localized shader skill that absorbs everything useful from `D:\gitframework\unity_shader_dev` while fitting the current Tyou project. The scope was clarified to focus on 2D, UI/Sprite, Spine, and sequence-frame/flipbook needs, not 3D shader work.

The current project has no committed `.effect/.material` samples, so Codex needs a dedicated skill that states Cocos Creator 3.8.7 and minigame constraints clearly instead of accidentally copying Unity URP or ShaderToy host code.

## What Changes

- Add `.agents/skills/tyou-shader-dev/` as the Tyou-local shader skill.
- Include references for Cocos Effect workflow, UI/Sprite effects, Spine effects, sequence-frame effects, porting, and minigame performance.
- Include starter templates for UI/Sprite flash/dissolve, flipbook sequence frames, and a TypeScript material parameter driver snippet.
- Route shader/effect tasks from `tyou-dev` to the new skill.
- Sync workflow docs/specs/evals so future AI runs know the scope and boundaries.

## Non-Goals

- Do not implement a concrete game shader in `Client/assets` in this change.
- Do not cover 3D shader, PBR, water, volume rendering, path tracing, object-space raymarching, Unity ShaderLab, URP RendererFeature, RenderGraph, RTHandle, or Compute workflows.
- Do not claim the starter `.effect` templates are already validated against a project shader sample; they are first-pass starting points that must be verified in Cocos Creator 3.8.7 when used.

## Impact

- Adds a new skill directory and metadata.
- Updates `tyou-dev` skill routing/evals.
- Updates AI workflow docs/spec to list the shader skill and its 2D/Spine/sequence-frame boundary.
- No runtime code or source assets are changed.

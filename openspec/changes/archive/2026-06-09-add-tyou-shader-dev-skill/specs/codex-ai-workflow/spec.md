## ADDED Requirements

### Requirement: Tyou 2D shader skill is available
The Codex workflow MUST provide a localized Tyou shader skill for Cocos Creator 3.8.7 2D, UI/Sprite, Spine, and sequence-frame shader/effect work under minigame constraints.

#### Scenario: 2D shader work is requested
- **WHEN** Codex is asked to implement, migrate, review, or optimize a Cocos shader/effect for UI, Sprite, Spine, or sequence-frame images
- **THEN** Codex routes to `.agents/skills/tyou-shader-dev/`
- **AND** it applies Cocos Creator 3.8.7 and minigame performance constraints before proposing code

#### Scenario: Unity or ShaderToy shader reference is provided
- **WHEN** Codex receives Unity Built-in, Unity URP, ShaderToy, or GLSL shader material as reference for a Tyou 2D/Spine/sequence-frame effect
- **THEN** it preserves reusable math and effect intent
- **AND** it rewrites host integration, uniforms, texture binding, and validation for Cocos Effect/Material rather than copying Unity or ShaderToy host code

#### Scenario: Unsupported shader scope is requested
- **WHEN** the request is for 3D shader, PBR, water, volume rendering, path tracing, object-space raymarching, URP RendererFeature, RenderGraph, RTHandle, or Compute workflows
- **THEN** `tyou-shader-dev` does not treat that scope as supported by default
- **AND** Codex must explicitly confirm a separate plan or future skill expansion before implementing

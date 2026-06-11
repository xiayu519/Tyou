## MODIFIED Requirements

### Requirement: Tyou 2D shader skill is available
The Codex workflow MUST provide a localized Tyou shader skill for Cocos Creator 3.8.7 2D, UI/Sprite, Spine, and sequence-frame shader/effect work under minigame constraints.

#### Scenario: 2D shader work is requested
- **WHEN** Codex is asked to implement, review, or optimize a Cocos shader/effect for UI, Sprite, Spine, or sequence-frame images
- **THEN** Codex routes to `.agents/skills/tyou-shader-dev/`
- **AND** it applies Cocos Creator 3.8.7 and minigame performance constraints before proposing code

#### Scenario: Unsupported shader scope is requested
- **WHEN** the request is for 3D shader, PBR, water, volume rendering, path tracing, object-space raymarching, full-screen post-processing, history-buffer simulation, ping-pong simulation, or Compute workflows
- **THEN** `tyou-shader-dev` does not treat that scope as supported by default
- **AND** Codex must explicitly confirm a separate plan or future skill expansion before implementing

### Requirement: Tyou shader routing remains precise and token-efficient
The Codex workflow MUST route Cocos shader work to `tyou-shader-dev` using shader-specific cues and MUST avoid treating unrelated generic `effect` mentions as shader work by default.

#### Scenario: Shader-specific effect work is requested
- **WHEN** Codex is asked about Cocos Effect, `.effect`, Material, Sprite/UI shader, Spine shader, sequence-frame shader, or flipbook shader work
- **THEN** Codex routes to `tyou-shader-dev`
- **AND** it loads only the shader references relevant to the target carrier

#### Scenario: Generic gameplay effect work is requested
- **WHEN** Codex is asked about an `effect` without Cocos shader, `.effect`, Material, Sprite/UI, Spine, or sequence-frame shader context
- **THEN** Codex does not load `tyou-shader-dev` solely because of the word `effect`

### Requirement: Verified Cocos shader samples stay on-demand
The Codex workflow MUST keep verified Cocos Effect/Material samples discoverable from `tyou-shader-dev` while keeping detailed sample structure outside broad entry files.

#### Scenario: Cocos shader material binding needs a concrete example
- **WHEN** Codex implements, reviews, or debugs a Cocos Effect/Material binding for UI, Sprite, Spine, or sequence-frame work
- **THEN** Codex can load the dedicated sample reference from `tyou-shader-dev/references/`
- **AND** Codex treats sample structure as a reference that must be verified against the current Tyou project before editing assets

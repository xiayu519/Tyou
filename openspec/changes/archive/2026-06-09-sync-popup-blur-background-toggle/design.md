## Context

Both projects use the same Cocos Creator 3.8.7 Tyou UI framework shape. `first-game` adds an optional `blurBackground` window attribute and filters blur background ownership with it. The implementation is additive and defaults to the current behavior.

`unity_shader_dev` is not a Cocos/Tyou skill. It is a Unity URP execution-layer skill with recipes, templates, pipeline rules, HLSL includes, and examples. It is useful as source material, but later localization must translate concepts into Cocos/minigame constraints instead of copying Unity URP assets directly.

## UI Design

- Extend `IWindowAttribute` with `blurBackground?: boolean`.
- Add `blurBackground: true` to decorator/module defaults.
- Store the resolved flag on `UIWindow`.
- Pass the flag through `window.init()` from `UIModule.showUIAsync()`.
- Update top popup lookup so only non-fullscreen windows with `blurBackground` participate in blur background display and background-click handling.

## Shader Skill Familiarization

Read only enough of `D:\gitframework\unity_shader_dev` to understand the architecture:

- Entry: `SKILL.md` and `README.md`.
- Pipeline rules: `reference/pipeline/*`.
- Task recipes: `reference/recipes/*`.
- Templates: `assets/templates/*`.
- Includes/examples: `assets/includes/*`, `assets/examples/*`.
- Algorithm notes: `techniques/*` and legacy `reference/*`.

Future localization should likely become a Cocos/minigame shader skill, not a Unity skill fork. It should prefer Cocos Effect/material syntax, WebGL/mobile limits, low-pass counts, no Unity RenderGraph/URP APIs, and explicit minigame validation.

## Validation

- Static search for `window.init(` call sites to ensure signature impact is local.
- TypeScript compile or project-supported static check if available; otherwise run targeted syntax/static checks and `rg` verification.
- OpenSpec status and Codex observability sensor.

## Risks

- `blurBackground: false` also removes that window from blur-background click handling because there is no shared blur node behind it. A popup that still needs outside-click close without blur should provide its own mask node or a later separate non-blur overlay feature.
- The `unity_shader_dev` repository is Unity-specific; treating it as directly applicable to Tyou/Cocos would produce wrong runtime assumptions.

---
type: feedback
description: Tyou shader skill 首版只关注 2D、Spine、序列帧图，并可参考 Unity Built-in 概念
status: active
last_verified: 2026-06-09
source: user-confirmed
---

# Tyou Shader Skill Scope

开发者已确认 Tyou shader skill 首版不需要 3D shader，重点关注：

- 2D/UI/Sprite shader。
- Spine 骨骼动画材质效果。
- 序列帧图、flipbook、图集帧动画相关 shader。

Cocos Creator shader 环境在概念上比 Unity URP 更接近 Unity Built-in 的朴素材质/Pass/Blend/Cull/ZWrite 模型，可作为概念参考；但 Unity ShaderLab/CGPROGRAM、URP RendererFeature、RenderGraph、RTHandle、Compute 等宿主代码不能直接搬到 Tyou。

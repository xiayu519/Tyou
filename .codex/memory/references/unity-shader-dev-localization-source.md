---
type: reference
description: `D:\gitframework\unity_shader_dev` 是后续本土化 Tyou/小游戏 shader skill 的 Unity URP 参考源
status: active
last_verified: 2026-06-09
source: reference-material
---

# Unity Shader Dev 本土化参考源

## References

- `D:\gitframework\unity_shader_dev\SKILL.md`
- `D:\gitframework\unity_shader_dev\reference\pipeline\*.md`
- `D:\gitframework\unity_shader_dev\reference\recipes\*.md`
- `D:\gitframework\unity_shader_dev\assets\templates\*`
- `D:\gitframework\unity_shader_dev\assets\includes\*`
- `D:\gitframework\unity_shader_dev\reference\technique-index.md`

## Use

- 先看 `SKILL.md` 判断原仓库的 delivery path：Material/Surface、Fullscreen/Post、Persistent Simulation、Compute Simulation。
- 再看 `reference/pipeline/authoring-contract.md`、`version-matrix.md`、`porting-rules.md`、`performance.md`，理解其工程边界。
- recipes 和 templates 可作为“如何组织 shader skill”的参考，算法细节再从 `techniques/` 和 legacy `reference/` 按需抽取。

## Boundaries

- 这是 Unity URP skill，不是 Cocos Creator/Tyou skill。不要直接复制 ShaderLab、RendererFeature、RenderGraph、RTHandle、Compute/Multi-pass driver 等 Unity 宿主代码到 Tyou。
- 后续本土化应改成 Cocos Effect/material、WebGL/小游戏可运行、低 pass/低采样、移动端精度和资源工作流优先的规则体系。
- Compute、复杂后处理、多缓冲持久仿真在小游戏环境必须先确认平台能力和性能预算。

## Recheck

- 每次开始本土化 shader skill 或引用该仓库模板前，重新检查 `SKILL.md`、`reference/pipeline/` 和目标 Tyou/Cocos 渲染管线版本。

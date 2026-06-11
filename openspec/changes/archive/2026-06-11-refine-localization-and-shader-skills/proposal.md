## Why

多语言 skill 已能把文案改动路由到 Luban 源表，但缺少新增文案前的复用判断，容易生成重复 `id/key`。Shader skill 仍残留 Unity、ShaderToy、URP 和外部样本路径导向，不符合当前 Tyou 只聚焦 Cocos Creator 3.8.7 的项目需求。

## What Changes

- 多语言工作流新增“先查现有文案”的规则：完全一致直接复用旧 `id/key`；语义近似只在低 token/低上下文成本时列候选并让开发者确认，否则只做完全一致判断。
- 清理 `tyou-shader-dev` 的 Unity/ShaderToy/URP/GLSL/内置管线迁移口径，只保留 Cocos Creator 3.8.7 2D shader/effect、Material、Sprite/UI、Spine、序列帧图和小游戏约束。
- 清理 shader 参考文档中外部样本位置和非 Cocos 宿主表述，使样本只表达可复用的 Cocos Effect/Material 结构要点。
- 同步 OpenSpec workflow spec 与 Tyou skill regression eval。

## Impact

- 工作流影响：`.agents/skills/localization-dev/`、`.agents/skills/tyou-shader-dev/`。
- 规范影响：`openspec/specs/localization-workflow-skill/`、`openspec/specs/codex-ai-workflow/`。
- AI 行为验证影响：`.agents/skills/tyou-dev/evals/evals.json`。

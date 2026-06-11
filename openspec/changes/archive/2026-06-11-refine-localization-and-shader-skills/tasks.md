## 1. 多语言复用规则

- [x] 1.1 更新 `localization-dev` skill，新增完全一致文案复用旧 `id/key` 的规则。
- [x] 1.2 增加低成本语义近似候选策略：成本可控时询问开发者，成本高时只做完全一致判断。

## 2. Shader Skill 收敛

- [x] 2.1 清理 `tyou-shader-dev/SKILL.md` 中 Unity、ShaderToy、URP、GLSL、内置管线和外部参考来源表述。
- [x] 2.2 清理 shader references 中非 Cocos 宿主表述和外部样本位置导向。

## 3. 规范与验证

- [x] 3.1 同步 `localization-workflow-skill` 和 `codex-ai-workflow` 主 spec。
- [x] 3.2 同步 Tyou skill regression eval。
- [x] 3.3 运行 OpenSpec validate、可观测性 sensor 和基础 diff 检查。

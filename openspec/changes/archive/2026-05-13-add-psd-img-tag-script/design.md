## Context

`Client/tools/psd/Psd2CCC-Digest.jsx` 是当前 PSD → Cocos 流程的 Photoshop 导出脚本。它已经把名称以 `.img` 结尾的图层、组合和智能对象视为单张 PNG 节点，并通过 `_9s` / `_scale9` 后缀支持九宫格导出。外部参考脚本 `PSD2UGUI-LayerTagMenu.jsx` 提供了较成熟的 Photoshop 多选图层改名、选择恢复和标签识别方式，但其中大部分 UGUI 标签不属于本项目流程。

## Goals / Non-Goals

**Goals:**

- 在 `Client/tools/psd/` 新增一个项目定制的 Photoshop 标签脚本。
- 支持对当前单选或多选图层追加 `.img` 后缀。
- 支持在弹窗中输入九宫格上/下/左/右像素值，并追加 `_9s_T_B_L_R` 后缀。
- 对同一图层避免重复追加同类标签，并尽量保留 Photoshop 当前选择状态。
- 在项目 README 中补充 `.img` 合图规则，和现有九宫格说明并列。

**Non-Goals:**

- 不改变 `Psd2CCC-Digest.jsx` 的解析和导出规则。
- 不迁移外部 UGUI 标签体系。
- 不修改 Cocos 导入扩展、Prefab、资源索引或 `ty-framework` 运行时代码。

## Decisions

1. **新增独立脚本而不是扩展导出脚本。**  
   打标签是 PSD 编辑期辅助操作，导出脚本应继续专注结构 JSON 和 PNG 导出。独立脚本也便于复制到 Photoshop Scripts 菜单。

2. **后缀只包含项目解析脚本当前识别的规则。**  
   `.img` 和 `_9s_T_B_L_R` 已被当前导出链路消费；其它外部标签会制造无效约定，暂不引入。

3. **按图层 ID 改名并恢复选择。**  
   参考脚本的 AM layer id 方式对多选更稳定，能够减少切换 activeLayer 带来的 UI 展开和选择丢失。

4. **九宫格弹窗采用上/下/左/右输入顺序。**  
   该顺序与 `Psd2CCC-Digest.jsx` 的 `parseScale9` 命名约定一致，避免文档与工具不一致。

## Risks / Trade-offs

- Photoshop 不同版本的 Action Manager 多选 API 行为可能略有差异 → 脚本保留单选 fallback，并对失败操作静默跳过。
- 锁定图层或锁定父组可能无法直接改名 → 改名逻辑会尝试临时解锁后恢复，但无法保证所有特殊图层都成功。
- `.img` 与九宫格同时追加在同一名称末尾时，当前导出脚本只会优先按 `.img` 作为整图导出 → README 和脚本提示保持这两个标签为不同用途，避免混用。
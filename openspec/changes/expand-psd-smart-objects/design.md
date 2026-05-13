## Context

PSD2CCC 当前由 Photoshop JSX 负责导出 PNG 和结构 JSON，再由 Cocos 扩展读取 JSON 生成节点树。`Psd2CCC-Digest.jsx` 会在遍历前把智能对象、形状、填充、视频、3D 等特殊图层栅格化；这会让智能对象内部的“Prefab 式”嵌套结构丢失。`TestPsd_dzxq` 还显示当前生成结果存在坐标偏移和前后层级反转/遮挡问题。

项目真实 UI 流程是在 Cocos 生成节点后由程序整理命名，再执行前缀组件检查和 UI 脚本生成，因此 PSD 阶段的关键目标是保留可编辑节点结构，而不是要求美术在 PSD 内使用 `m_btn/m_text` 命名前缀。

## Goals / Non-Goals

**Goals:**
- 默认尝试展开智能对象内部图层，让嵌套 UI 结构生成 Cocos 子节点。
- 展开失败时保持可用输出：回退为当前 PNG 导出，并在报告里说明原因。
- 修正 `TestPsd_dzxq` 这类 PSD 的节点坐标和层级，使生成结果接近 Photoshop 原图。
- 继续支持现有文字层、普通图层、组、九宫格和资源导入链路。

**Non-Goals:**
- 不修改 `Client/assets/ty-framework/`。
- 不要求美术在 PSD 图层名中添加 UI 脚本前缀。
- 第一版不完整复刻 Photoshop 的全部智能对象高级语义；复杂变换、链接缺失、异常嵌套可降级为 PNG。
- 不改变 `uitscreate` 的 UI 脚本生成规则。

## Decisions

1. **默认展开智能对象，失败回退 PNG。**  
   美术大量使用智能对象表达嵌套 UI，默认合图会让 PSD 工具失去主要价值。回退 PNG 保证异常 PSD 仍能生成可见 UI。

2. **在 Photoshop 导出阶段展开，而不是在 Cocos 导入阶段解析 PSD。**  
   Photoshop JSX 已能访问图层、文字、bounds 和智能对象内容；Cocos 侧只应消费结构 JSON 并生成节点，避免引入新的 PSD 解析依赖。

3. **保留 JSON 的 `group/png/text` 递归模型。**  
   智能对象展开后作为 `group` 节点携带 `children`，内部图层复用现有节点生成逻辑。这样 Cocos 侧改动集中在坐标/层级修正。

4. **坐标以 PSD 画布绝对 `sourceBounds` 为准。**  
   Cocos 生成时根据父节点 `sourceBounds/size` 计算局部坐标，避免 group offset 与 trimmed PNG 尺寸混用造成偏移。

5. **层级按 Photoshop 显示顺序生成。**  
   节点添加顺序必须让 PSD 上方图层在 Cocos 中位于更高 sibling index，避免前景按钮被背景遮挡。

## Risks / Trade-offs

- **复杂智能对象变换还原不完整** → 第一版检测失败或无法可靠展开时回退 PNG，并写入 report。
- **展开后资源和节点数量增加** → 这是保留 UI 可编辑结构的必要代价；后续可按具体 Prefab 再做合批或手动整理。
- **智能对象整体滤镜/蒙版效果可能与拆分节点不同** → report 记录降级/警告，复杂视觉资源仍可通过回退 PNG 保持显示。
- **Photoshop JSX 的智能对象 API 差异** → 实现时优先使用 Action Manager 的 `placedLayerEditContents`，并保持异常恢复和文档关闭逻辑。

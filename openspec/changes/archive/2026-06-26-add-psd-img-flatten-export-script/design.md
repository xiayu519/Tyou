## Context

Tyou 当前 PSD 标准导出脚本是 `Client/tools/psd/Psd2CCC-Digest.jsx`，它已经能把 `.img` 图层、组合或智能对象导出为合成 PNG，同时保留其它 PSD 层级供 Cocos 生成可编辑节点。用户这次需要的是一个更早的 Photoshop 辅助脚本：只把 PSD 中 `.img` 后缀组合合并成单图层，并另存一个新的 PSD，方便后续再运行 Digest。

## Goals / Non-Goals

**Goals:**

- 新增独立 JSX 文件，不改现有 Digest、标签脚本或 Cocos 扩展。
- 在副本文档中递归查找名称以 `.img` 结尾的组合，将每个组合合并为单个像素图层。
- 保留压平后图层名称中的 `.img` 后缀，让 `Psd2CCC-Digest.jsx` 后续仍按 `.img` 单图导出。
- 另存新 PSD，默认文件名为原 PSD 名追加 `_ImgFlatten.psd`。

**Non-Goals:**

- 不处理图层特效、普通文本、剪贴蒙版、蒙版、智能对象展开或九宫格。
- 不生成 PNG、JSON 或 Cocos 节点。
- 不修改 `Client/assets/ty-framework/`、Prefab、Scene、meta 或资源索引。

## Decisions

### 1. 使用独立脚本而不是修改 Digest

Digest 是标准 PSD 到 PNG/JSON 导出链路，继续保持其现有协议和恢复逻辑。新增脚本只提供可选的前置 PSD 压平能力，避免改变当前项目导出结果。

### 2. 只压平名称以 `.img` 结尾的组合

脚本只把 `LayerSet` 且名称匹配 `/\.img$/i` 的节点合并为单个像素图层。普通 `.img` ArtLayer 已经是单图层，不需要处理；非 `.img` 结构继续保留，方便 Digest 拆节点。

### 3. 始终处理副本文档并另存

脚本复制当前文档，在副本上执行合并和保存。保存完成或取消后关闭副本，不保存临时修改，并切回原始文档，避免破坏美术源 PSD。

## Risks / Trade-offs

- [Risk] Photoshop 的 `LayerSet.merge()` 合成结果依赖当前可见状态和 Photoshop 版本。Mitigation: 只在副本上执行，并在完成弹窗中报告处理数量和保存路径。
- [Risk] 压平 `.img` 组合会丢失该组合内部可编辑层级。Mitigation: 工具名称和说明聚焦 `.img` 前置压平，不替代 Digest 标准流程。
- [Risk] 嵌套 `.img` 组合可能被外层 `.img` 一次性合并。Mitigation: 递归时遇到 `.img` 组合直接合并并停止深入，符合外层合图优先的直觉。

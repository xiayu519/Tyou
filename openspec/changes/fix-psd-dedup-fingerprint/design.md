## Context

`Psd2CCC-Digest.jsx` 在导出每个图层时会先把图层复制到临时文档、裁切透明区域、按需裁切九宫格，然后计算去重指纹。当前指纹使用 `tmp.histogram` 拼接尺寸得到，只能描述颜色数量分布，不能描述像素位置或真实图片内容。

这会导致同尺寸、同色系、同字体风格的不同 PNG 被误判为重复。例如 `img_masterlove_once` 与 `img_masterlove_five` 在 PSD 原层像素不同，但导出的结构 JSON 复用了同一个 `relativePath`。

## Goals / Non-Goals

**Goals:**
- 只有导出后的 PNG 内容完全一致时才复用已有 `relativePath`。
- 普通图层、九宫格裁切结果和 `.img` 合图遵循一致的精确去重标准。
- 保留现有文件命名、`dedup` 统计、`sourceBounds`、`trimmedSize` 和九宫格元数据行为。

**Non-Goals:**
- 不处理 PSD 中合成层与拆分层同时存在造成的视觉叠加问题。
- 不改 Cocos 导入端 `psd2ccc` 扩展。
- 不引入 Node/npm 依赖或外部哈希库。

## Decisions

- 使用导出后的 PNG 二进制内容生成指纹，而不是 Photoshop 直方图。
  - 理由：二进制内容能准确表达最终会落盘的资源，和 Cocos 实际使用的 PNG 一致。
  - 替代方案：逐像素采样或更细粒度直方图。缺点是 ExtendScript 像素访问成本高，且仍可能不是最终 PNG 内容。

- 在临时文件中保存 PNG 后再判断去重。
  - 理由：Photoshop ExtendScript 对图层像素直接哈希能力有限，保存临时 PNG 后可用 `File` 读取二进制内容。
  - 替代方案：先保存目标文件再删除重复文件。缺点是会产生短暂错误文件并增加清理复杂度。

- 保持 dedupMap 的返回信息结构。
  - 理由：导入端依赖 `relativePath`，九宫格逻辑依赖 `preScale9Size`，本次只替换指纹来源。

## Risks / Trade-offs

- PNG 保存到临时文件后再复制到目标路径会增加少量导出 IO 成本 -> PSD 导出本身已是离线工具流程，准确性优先。
- 如果 Photoshop 在 PNG 中写入非确定性元数据，完全相同像素可能无法复用 -> 验证时检查相同资源仍能 dedup；若遇到该问题，再改为临时 PNG 解码后的稳定像素哈希。
- 如果完全透明像素下方的 RGB 数据不同，压缩图像 chunk 仍会不同但 Cocos 视觉一致 -> 改为黑/白底合成后的可见像素指纹，透明 RGB 脏数据不参与去重；半透明像素会同时受黑/白底合成约束，仍能区分真实可见差异。
- 之前被模糊直方图合并的“相似但不同”图片会变成独立资源 -> 这是正确行为，资源数可能略增但 UI 不再画错。

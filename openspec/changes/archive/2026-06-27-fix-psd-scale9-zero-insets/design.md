## Context

Digest 使用 `_s9CropAxis()` 分别压缩水平和垂直中心区域。旧外层条件使用 `horizontal && vertical`，导致任一方向不可裁时整个九宫格裁切不启动；同时 `_s9CropAxis()` 无条件复制末端区域，`endInset = 0` 会产生零宽或零高 crop。

## Goals / Non-Goals

**Goals:**

- 任意 top/bottom/left/right 为 0 都不终止其它有效方向。
- 同轴两端为 0 时保持该轴原始尺寸。
- 单侧为 0 时该轴仍可正常裁切。

**Non-Goals:**

- 不改变九宫格标签格式、中心保留像素数或 SpriteFrame border 语义。
- 不调整无参数 `_9s` 的自动 inset 推算。

## Decisions

- 提取纯函数 `shouldCropScale9Axis()`，分别判断两个轴。
- 外层以 `cropH || cropV` 启动裁切，`cropScale9()` 内按轴执行。
- `endInset = 0` 时不创建末端副本文档，只保留起始区域与中心像素。

## Risks / Trade-offs

- [Risk] 旧版对零 inset 的失败输出尺寸可能被业务误用 → 新行为只修复显式零值输入，并保持非零参数路径不变。
- [Risk] Photoshop ExtendScript 无法在 Node 中执行文档操作 → 用纯判断函数和源码契约测试覆盖分支，保留实际 PSD 重导出验收。

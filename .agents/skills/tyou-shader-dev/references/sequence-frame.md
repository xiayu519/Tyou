# 序列帧图 Shader

## 适用效果

- 单张 flipbook 贴图播放火焰、烟雾、爆炸、光效。
- 图集序列帧叠加颜色、溶解、流光、遮罩。
- 帧间混合减少低帧率序列的跳变。
- 序列帧与 Spine/UI 的同屏表现统一色调。

## 数据形态

- **单张网格 flipbook**：一张贴图按行列切帧，shader 根据 frame index 重映射 UV。
- **SpriteAtlas 多帧**：Cocos SpriteFrame/Atlas 已经给出每帧 UV，shader 不应再按整图行列切分，除非材质明确绑定整张 flipbook。
- **多贴图序列**：不建议 shader 内切换多张贴图；用动画/脚本换 SpriteFrame 更稳定。

## Flipbook 参数

- `_FrameCountX` / `_FrameCountY`：行列数。
- `_FrameIndex`：当前帧，可由脚本或材质动画驱动。
- `_BlendFrames`：是否帧间混合。
- `_TintColor`、`_Intensity`、`_DissolveProgress`：可选效果参数。

## UV 计算思路

```text
frame = floor(_FrameIndex)
x = frame % columns
y = floor(frame / columns)
localUV = uv / float2(columns, rows)
flipbookUV = localUV + float2(x, y) / float2(columns, rows)
```

具体 Y 方向是否翻转要按 Cocos 实际纹理坐标验证，不要照搬 Unity 或 ShaderToy。

## 帧间混合

- 需要采样当前帧和下一帧，采样数翻倍。
- 只在大尺寸或低帧率特效上开启。
- 粒子/大量特效默认关闭或做低配开关。

## 与 Atlas 的边界

- 如果序列帧来自 Cocos SpriteAtlas 的多个 SpriteFrame，优先用 Cocos 动画系统换帧，再用 shader 做颜色/溶解等后处理。
- 如果美术给的是规则 flipbook 大图，shader 切帧才是合理路径。
- atlas 边缘需要 padding，否则 UV 扰动、描边或帧间混合容易采到邻帧。

## 小游戏建议

- 大量序列帧特效优先减少透明 overdraw，而不是堆复杂 shader。
- 爆炸、烟雾、火焰通常可用主贴图 + tint + 简单溶解，不要默认多层噪声。
- 帧率、尺寸和同屏数量比单个 shader 算法更影响性能。

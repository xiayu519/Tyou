# 像素图片规范

- 提示词明确 pixel art、目标画布、主体数量、方向、轮廓、有限调色板和冲突纯色 chroma key 背景。
- 避免摄影级细节、景深、抗锯齿、柔光边缘和高频纹理。
- 生成阶段可以使用较大画布，最终使用 perfect-pixel 收敛到目标像素画布。
- 缩放只使用 nearest-neighbor；最终像素资产默认只接受整数倍放大。
- imagegen 阶段不要要求透明 PNG；从洋红、绿色、蓝色中选择主体未使用的 key 色，生成后使用 chroma-key 转 RGBA。
- 普通角色和图标最终 alpha 应以 0/255 为主；烟雾、发光和粒子可以使用 chroma-key feather 保留半透明。
- 多方向、多帧素材必须统一 cell 尺寸、帧顺序和脚底锚点。
- Sprite sheet 提示词明确 cols × rows、每格方向或动作、无格线、无文字、统一纯色背景；使用 prepare-sheet 处理非整除尺寸和超大帧。
- perfect-pixel 不负责修复缺失武器、错误姿势或服装变化。

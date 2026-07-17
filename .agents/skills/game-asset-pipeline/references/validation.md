# 图片质量验证

## 通用

~~~powershell
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py inspect --input image.png
~~~

- 使用 view_image 检查主体、文字、裁切、额外物体和语义错误。
- 检查尺寸、颜色模式、alpha bbox、透明比例、唯一颜色数和 SHA-256。
- 检查 chroma-key 报告中的 key、border_match_ratio、removed_ratio；主体不得含 key 色残片或被误抠除。
- 批量产物使用 manifest 固化相对路径和属性。

## 专项

- Pixel：缩放必须 nearest；普通角色 alpha 默认收敛到 0/255。
- 四方向：必须 4 帧且顺序为 front/right/back/left。
- 八方向：必须 8 帧、画布一致、脚底线一致，正方向与斜方向使用相同主体高度目标；默认主体高度相对中位数偏差不得超过 5%，宽度偏差不得超过 20%。`validate-multiview` 会将主体归一化后检查帧间近重复候选，默认视觉相似度大于 95% 且 alpha IoU 不低于 95% 时直接失败。机器未发现重复仍不代表方向语义正确，必须逐格确认 diagonal 同时包含相邻正方向信息。失败时报告八方向失败并继续修复，不得自动降级四方向。
- UI：自动拆分数量等于规格数量；bbox 不包含相邻组件残片。
- Texture：使用 validate-seam；Dual-grid 必须 15 个 mask tile。
- Isometric：结果约为 2:1 diamond；Hex 外部透明。
- 动画：检查帧数、canvas、脚底、装备、轮廓和循环跳变。
- Sprite sheet：prepare-sheet 输出必须为 RGBA；每帧等于目标尺寸，重组 sheet 等于 cols×target-width、rows×target-height。

## 自测

~~~powershell
python .agents/skills/game-asset-pipeline/scripts/self_test.py
~~~

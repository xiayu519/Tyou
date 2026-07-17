---
name: game-asset-pipeline
description: 在 Tyou Cocos Creator 3.8.7 项目中只使用 Codex imagegen 与本地确定性脚本生成、编辑、处理、验证并接入游戏图片素材。用于 Pixel/HD 角色与道具、八方向角色、透明 PNG、背景移除、Perfect Pixel、UI sheet 与 bbox 拆分、无缝纹理、Dual-grid 15 tileset、Isometric/Hex、横版三层视差背景、Sprite sheet、帧动画和 Cocos bundle 接入；不调用 Meowa 或其他外部图片 API，也不用于音效、BGM 或纯视频生成。
---

# 游戏图片流水线

## 核心边界

- 使用系统 imagegen 完成新图生成和语义图片编辑。
- 使用 scripts/asset_pipeline.py 完成 chroma key 抠图、尺寸、透明度、像素化、切分、拼接、锚点、无缝、tileset、几何转换和质量报告。
- 不调用 Meowa、Gemini、第三方抠图或其他外部图片 Provider。
- Skill 可以提高成功率并自动发现部分问题，但不能把概率生成变成绝对的角色语义一致性保证。
- 中间产物默认放入 .codex/artifacts/game-assets/<task-slug>/，不要直接生成到 Cocos 正式资源目录。
- 不手写新资源 .meta；正式接入时让 Creator 导入。

## 开始任务

1. 读取 references/routing.md，选择 imagegen 生成/编辑与本地处理路径。
2. 像素素材读取 references/pixel-art.md；八方向或动画读取 references/multiview-animation.md。
3. 需要具体提示词结构时读取 references/prompts.md。
4. 运行能力检查：

~~~powershell
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py capabilities
~~~

5. Pillow 缺失时明确报错并安装：

~~~powershell
python -m pip install "Pillow>=10,<13"
~~~

## 标准流程

1. 固定素材规格：用途、画布、风格、方向、帧布局、锚点、目标 bundle 和 chroma key 色。
2. 从洋红、绿色、蓝色等候选中选择与主体调色板明显冲突的纯色背景；不要要求 imagegen 直接返回透明 PNG。
3. 先生成一个代表样本；确认轮廓、配色、纯色背景和主体未使用 key 色后再批量生成。
4. 调用 imagegen。编辑已有图片时必须携带目标图片，不要用 Pillow 代替语义编辑。
5. 使用 view_image 检查内容、布局、文字、裁切、key 色污染和明显语义漂移。
6. sprite sheet 优先使用 prepare-sheet 一次完成抠色、透明补边、拆分、缩放、锚点归一化和重组；多方向角色为正方向与斜方向指定相同 `--subject-height`，动画继续使用共享比例保留体积变化；UI 先 chroma-key 再 split-components。
7. 不合格时携带原图、角色设定图或完整 sheet 让 imagegen 定向编辑，再重新检查。
8. 按 references/validation.md 验收；只有用户要求正式接入时才读取 references/cocos-creator.md。

## 专项原则

- 多方向角色先建立 front/right/back/left 四方向基准。八方向必须补齐 front-right/back-right/back-left/front-left，使用统一主体高度归一化后由本地脚本组装；任何方向不合格时继续定向修复或明确报告八方向失败，不得自动改为四方向。只有用户明确把需求改为四方向时才交付四方向。
- UI sheet 使用与组件配色冲突的纯色背景并保留组件间距；chroma-key 后组件粘连或内部孔洞不透明时失败。
- Perfect Pixel 使用 imagegen 修复语义，再用 perfect-pixel 做 palette、nearest 和 alpha 收敛。
- 无缝纹理先生成可平铺内容，再运行 seam 检查；强制像素级一致时使用 blend 或 mirror。
- Dual-grid、Isometric、Hex 的最终结构由本地脚本构造，imagegen 只负责纹理和视觉内容。
- 动画先生成统一 sheet 或关键帧；逐帧检查主体、锚点、装备和循环跳变。

## 常用命令

~~~powershell
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py inspect --input image.png
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py chroma-key --input source.png --output transparent.png --key "#FF00FF" --tolerance 64
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py prepare-sheet --input directions.png --output-dir prepared --cols 4 --rows 2 --target-width 128 --target-height 128 --subject-height 108 --key "#FF00FF"
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py perfect-pixel --input source.png --output sprite.png --target-width 64 --colors 32
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py split-grid --input directions.png --output-dir directions --cols 4 --rows 2 --pad-to-grid
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py split-components --input ui-sheet.png --output-dir ui-components --padding 2
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py normalize-frames --inputs directions/*.png --output-dir normalized --width 128 --height 128 --subject-height 108 --margin 2 --fit contain --resize-filter nearest
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py validate-multiview --inputs normalized/*.png --mode eight
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py make-seamless-blend --input texture.png --output texture-loop.png --horizontal --vertical
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py dual-grid-15 --foreground grass.png --background water.png --output grass-water.png
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py to-isometric --input tile.png --output tile-iso.png
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py make-hex --input tile.png --output tile-hex.png
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py parallax-pack --foreground fg.png --midground mid.png --background bg.png --output-dir parallax
python .agents/skills/game-asset-pipeline/scripts/asset_pipeline.py validate-animation --inputs frames/*.png
~~~

## 失败规则

- 图片损坏、key 色与主体冲突、边框 key 匹配不足、帧数不符、透明组件粘连、接缝未通过或主体越界时直接失败。
- 四/八方向机器检查通过不等于方向语义一致；逐格检查朝向、武器侧、服装结构、发型和背面细节。
- 八方向任务缺少任一方向、方向语义错误或主体尺度不一致时必须判定失败；不得自动降级、静默丢弃对角方向或伪报成功。
- imagegen 多次编辑仍无法满足硬约束时报告真实剩余问题，不声称百分之百完成。
- 最终执行自测、目标产物检查和 git diff --check。

## 参考资料

- 能力路由：references/routing.md
- 提示词模板：references/prompts.md
- 像素图规范：references/pixel-art.md
- 八方向与动画：references/multiview-animation.md
- 质量验证：references/validation.md
- Tyou/Cocos 接入：references/cocos-creator.md

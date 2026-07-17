# 四/八方向角色与动画

## 方向顺序

四方向基准统一使用 2×2：

~~~text
front | right
back  | left
~~~

八方向统一使用 4×2：

~~~text
front | front-right | right | back-right
back  | back-left   | left  | front-left
~~~

## 生成流程

1. 先生成 front/right/back/left 四方向基准，固定发型、服装、武器侧、背包、颜色、比例和脚底线。
2. 使用与主体调色板冲突的统一纯色背景；不要要求 imagegen 直接生成透明 PNG。
3. 四方向通过视觉检查后，将完整四方向 sheet 作为唯一身份来源生成四个对角方向。
4. 优先在同一张 4×1 对角方向 sheet 中生成 front-right/back-right/back-left/front-left；某格错误时携带四方向基准和错误格定向重试。
5. 某个对角方向不合格时携带四方向基准和错误格继续定向修复。仍无法满足八方向硬约束时明确报告八方向失败；除非用户明确改变需求，否则不得改交四方向。
6. 使用 chroma-key 或 prepare-sheet 抠色、透明补边和拆分；正方向与斜方向必须使用同一个 `--subject-height` 归一化，再按固定顺序 compose-grid。
7. 四方向运行 `validate-multiview --mode four`；八方向运行 `validate-multiview --mode eight`。

## 视觉方向门禁

- front/back 必须能由面部、背部结构或装备遮挡关系明确区分。
- right/left 必须展示相反侧轮廓；不允许简单镜像导致武器换手或徽章换边。
- diagonal 必须同时展示相邻两个正方向的信息；若与纯侧面或纯背面几乎相同则不合格。
- 八个方向的主体高度必须使用同一像素目标归一化；宽度允许因正面、侧面和围巾等轮廓自然变化，但不得通过分别 contain 让不同批次各自撑满画布。
- 八方向机器检查不能证明方向语义正确；最终必须使用 view_image 逐格检查。
- 任意两格被 `validate-multiview` 标记为近重复时直接失败；即使机器未标记，人工发现相反方向共享同一侧非对称特征或 diagonal 退化为已有方向时同样失败。
- 对称角色缺少方向特征时，先增加围巾结、徽章、背包、发饰或武器侧等稳定非对称标记。

## 动画

- 先固定角色设定和方向，再生成动作。
- 同一 sheet 中写明帧序、格子数、循环动作、固定相机、纯色背景和脚底线。
- 使用 prepare-sheet，或依次运行 chroma-key、split-grid --pad-to-grid、normalize-frames --fit contain。
- 使用 validate-animation 检查尺寸、底部锚点和首尾差异，并生成 GIF 或在目标运行环境实际播放。
- 首尾是相邻相位而非同帧时提高 loop diff 阈值；机器通过后仍需检查肢体、装备和体积连续性。

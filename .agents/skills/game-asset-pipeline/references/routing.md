# 图片能力路由

| 请求 | imagegen 工作 | 本地工作 |
| --- | --- | --- |
| Pixel/HD 角色、怪物、道具、图标 | 使用冲突纯色背景生成或编辑内容 | chroma-key、inspect、perfect-pixel、尺寸 |
| 四/八方向角色 | 先生成四方向基准，再补对角方向；修复异常方向 | prepare-sheet、compose-grid、validate-multiview |
| UI sheet | 使用冲突纯色背景生成分离组件 | chroma-key、split-components、bbox 报告、命名 |
| 复杂背景移除 | 语义编辑为统一冲突纯色背景 | chroma-key、clean-alpha、透明 RGB 清理 |
| Perfect Pixel | 修复形体、轮廓和错误内容 | palette 量化、nearest、binary alpha |
| Self-loop/Texture | 生成自然纹理或滚动背景 | validate-seam、make-seamless-blend/mirror |
| Dual-grid 15 | 生成前景、背景纹理 | dual-grid-15 确定性构造 |
| Isometric | 生成 top-down 纹理或对象 | to-isometric |
| Hex | 生成纹理或俯视对象 | make-hex |
| 横版三层视差 | 分别生成 foreground/midground/background | parallax-pack、横向无缝检查 |
| Style generation | 以参考图执行风格编辑 | 尺寸、透明和 manifest |
| Sprite sheet/动画 | 使用统一冲突纯色背景生成 sheet 或关键帧 | prepare-sheet、validate-animation |
| Map preset | 复用项目内已确认提示词、纹理和布局样本 | manifest、命名、目录检索 |

纯 imagegen 路线没有 submit/poll/history/cancel/download、API key、动态 bootstrap 或 API 响应脱敏。imagegen 不承担透明通道交付；尺寸、格子、chroma key、透明度、锚点、mask 和几何转换由本地脚本处理。人物方向、装备、姿态、缺失部件、UI 粘连和错误文字返回 imagegen 编辑。

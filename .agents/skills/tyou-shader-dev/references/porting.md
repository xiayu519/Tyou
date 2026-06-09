# Shader 本土化迁移

## 可参考什么

### Unity Built-in

相对更接近 Cocos Effect 的概念层：

- 材质 + Pass。
- `Blend` / `Cull` / `ZWrite` / `ZTest` 这类渲染状态。
- 顶点/片元函数划分。
- 贴图、颜色、float 参数驱动效果。

不能直接复制：ShaderLab 文件结构、`CGPROGRAM`、Unity include、宏、语义和内置变量。

### Unity URP

可参考：

- recipe/template 的组织方式。
- 纹理采样、噪声、UV、SDF、颜色混合等数学片段。
- 性能意识：采样数、pass 数、透明 overdraw、精度。

不能直接复制：RendererFeature、RenderGraph、RTHandle、SRP Batcher CBUFFER、URP include、Compute driver。

### ShaderToy / GLSL

可参考：数学函数、噪声、UV 变换、调色、SDF 2D。

必须重写：

- `mainImage` -> Cocos Effect 的片元入口。
- `iTime` -> 材质参数或脚本传入时间。
- `iResolution` -> 节点尺寸/纹理尺寸/自定义 uniform。
- `iChannel*` -> Cocos 材质纹理属性。
- `gl_FragCoord` -> UV 或屏幕坐标，按目标载体确定。

## 语法迁移速记

| GLSL/Shadertoy | Cocos/类 HLSL 思路 |
| --- | --- |
| `vec2/vec3/vec4` | `vec2/vec3/vec4` 或目标语法支持的向量类型，按 Cocos Effect 实际编译为准 |
| `mix(a,b,t)` | `mix` 或 `lerp`，按目标语言支持确认 |
| `fract` | `fract` |
| `mod` | `mod` / `fmod`，按编译结果确认 |
| `texture(iChannel0, uv)` | 目标 effect 的纹理采样宏/函数 |

不要一次性转换整段大 shader。先选模板，再迁移一个函数，最后接入采样和输出。

## 迁移顺序

1. 判断目标：UI/Sprite、Spine、序列帧图。
2. 删除宿主层代码，只保留核心函数。
3. 明确输入：主贴图、噪声图、颜色、时间、进度、尺寸。
4. 先让基础采样输出跑通。
5. 接入一个效果参数。
6. 加性能预算和降级说明。

## 红线

- 不把 Unity 的 screen pass 当作 Cocos 直接可用后处理。
- 不把 ShaderToy 的全屏坐标逻辑硬塞进 Sprite/Spine 材质。
- 不默认使用循环噪声/fbm 多 octave；小游戏端先用噪声贴图。
- 不默认支持 3D 光照/PBR/阴影/法线贴图路线。

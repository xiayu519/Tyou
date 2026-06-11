# Cocos Effect 工作流

## 适用范围

本文件用于 Tyou/Cocos Creator 3.8.7 的 2D/UI/Sprite/Spine `.effect`、`.material`、材质实例和资源引用检查。

## 查项目现状

优先搜索：

```powershell
rg --files Client/assets | rg "\.(effect|material|mtl)$"
rg -n "Material|EffectAsset|setProperty|customMaterial|sharedMaterial|sp\.Skeleton|Sprite" Client/assets -S
```

优先使用当前项目已有样本；当前项目没有可复用 shader 样本时，可读 `cocos-effect-samples.md` 的结构参考，再从 `assets/templates/` 复制思路并按 Cocos 3.8.7 重新验证。不要把参考结构当成当前项目事实。

## 文件落点建议

- UI/Sprite 通用 effect：`Client/assets/asset-raw/shader/` 或项目已存在的 shader 目录。
- 材质文件：跟随使用者所在 bundle，避免跨 bundle 引用不清。
- 运行时参数脚本：业务层 `Client/assets/scripts/logic/`，不要为单个效果修改 `ty-framework`。
- 资源索引：新增需要运行时逻辑名加载的材质/纹理后，走 `assetool` 生成 `asset-index.json`。

## 编辑规则

- `.effect` 和 `.material` 是源资产，允许在 OpenSpec 监督下编辑。
- `.meta` 只在新增/移动/重命名资源时同步处理；不要手改 `Client/library` 导入缓存。
- 绑定到 Prefab/Scene 时同时按 `prefab-workflow.md` 或 `scene-workflow.md` 检查引用。
- 运行时换材质时明确材质实例归属，避免多个节点共享同一个可变材质导致串色。
- 普通 `cc.Sprite` 自定义材质优先确认是否应使用 Cocos 内置 `cc_spriteTexture` 绑定和 `CCSampleWithAlphaSeparated` 采样；只有明确绑定独立纹理时才新增自定义主纹理属性。

## 验证清单

- Cocos 能导入 `.effect/.material`，编辑器无粉材质/编译报错。
- 目标 UI/Sprite/Spine 节点实际使用了新材质。
- 所有纹理参数都有默认值或运行时绑定路径。
- 透明混合、深度、裁剪和 premultiplied alpha 与目标组件匹配。
- 小游戏真机或预览路径验证过；无法验证时在最终说明风险。

## 常见坑

- UI/Sprite/Spine 的顶点色和 alpha 不能随手丢，通常要乘回输出颜色。
- Spine 贴图常依赖 atlas 和 premultiplied alpha，闪白/染色要先确认混合方式。
- 同一个材质资源被多个对象共享时，运行时改 uniform 会影响所有使用者。
- 时间、尺寸、额外贴图等动态输入不是 Cocos UI/Sprite 材质的自动变量，必须由材质属性或脚本驱动。

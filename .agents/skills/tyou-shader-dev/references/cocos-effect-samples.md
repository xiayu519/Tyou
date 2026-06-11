# Cocos Effect 样本

本文件记录已检查过的 Cocos Creator 3.8.x shader/material 参考结构。落地到 Tyou 前仍要先查当前 `Client/assets` 的真实目录、uuid、bundle 和材质绑定。

## actor occlusion outline structure

### 资源链路

- `.effect.meta`：`importer` 为 `effect`，`uuid` 为 `6cd8b5f1-6184-4643-b0d0-e111969f8d92`，`files` 为 `[".json"]`。
- `.mtl.meta`：`importer` 为 `material`，`uuid` 为 `9f6a0ab4-9c0a-4665-86fd-4e7f65e7f9a1`，`files` 为 `[".json"]`。
- `.mtl`：`__type__` 为 `cc.Material`，`_effectAsset.__uuid__` 指向 effect uuid，`_effectAsset.__expectedType__` 为 `cc.EffectAsset`。
- `Actor.prefab`：`cc.Sprite._customMaterial.__uuid__` 指向 material uuid，`__expectedType__` 为 `cc.Material`。

### Effect 结构

- 顶层使用 `CCEffect %{ techniques: - passes: ... }%`。
- Sprite pass 复用 `vert: sprite-vs:vert` 和 `frag: sprite-fs:frag`。
- 透明 2D 设置：`depthTest: false`、`depthWrite: false`、`cullMode: none`、`blendSrc: src_alpha`、`blendDst: one_minus_src_alpha`。
- 属性示例：`outlineColor` 为 color，`outlineParams` 为 `vec4`，其中 `xy` 是描边采样步长，`z` 是本体 alpha，`w` 是开关。
- 顶点入口包含 `builtin/uniforms/cc-global`、按 `USE_LOCAL` 引入 `builtin/uniforms/cc-local`、`common/common-define`，并保留 `a_texCoord` 和 `a_color`。
- 片元入口包含 `builtin/internal/embedded-alpha`、`builtin/internal/alpha-test`、`builtin/internal/sprite-texture`。
- Sprite 纹理采样使用 `CCSampleWithAlphaSeparated(cc_spriteTexture, uv0)`，不是手写 `mainTexture` 属性。
- 输出前执行 `ALPHA_TEST(o)`，并保留顶点色和 alpha。

### 描边算法

- 本体采样 1 次。
- 开启描边时额外采样上下左右和 4 个对角方向，共 8 次邻域 alpha 采样。
- 每像素总采样预算约 9 次主 Sprite 纹理采样；适合角色遮挡/重点对象，不适合大量小 UI 列表默认开启。
- 关闭开关时只返回本体，采样预算回到 1 次。

### 复用判断

- UI/Sprite 自定义材质优先参考该样本的 Sprite include、`cc_spriteTexture` 和 `CCSampleWithAlphaSeparated` 路径。
- 如果目标是规则 flipbook 大图且不是 Cocos SpriteFrame 自带贴图，可使用自定义 texture 属性；如果目标是普通 `cc.Sprite` 当前帧贴图，优先走 Cocos Sprite 纹理绑定。
- 新增 `.effect/.mtl/.meta` 后，绑定到 Prefab/Scene 时必须按 `prefab-workflow.md` 或 `scene-workflow.md` 检查 uuid、`__expectedType__` 和资源索引。

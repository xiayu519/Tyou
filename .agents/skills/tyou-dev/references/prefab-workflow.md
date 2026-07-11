# Prefab 创建工作流

本文件只记录 Prefab 工作流；Scene 独立见 `scene-workflow.md`。

修改 Cocos `.prefab`、`.prefab.meta` 前必须确认格式和引用关系。开发者已在 `2026-06-09` 明确授权 AI 对项目源 Prefab 执行增删改查：允许在 OpenSpec 监督下直接结构化编辑 `Client/assets/**/*.prefab` 和必要的配套 `.prefab.meta`。

直接编辑不是跳过工具链。优先级仍然是 PSD 一键生成、AI + 精简 MCP、Cocos 编辑器保存、最后才是结构化 JSON 编辑；无论哪种方式，改完都必须做 JSON/引用/资源索引相关校验。

禁止把授权扩展到 `Client/library`、`Client/temp`、`Client/build` 等 Cocos 生成、导入缓存或构建产物；这些目录不是 Prefab 源资产。

本项目创建 UI Prefab 有三种方式，按优先级选择。

## 业务 Prefab 的拆分与复用

业务对象池的 Prefab 按稳定的节点结构、组件组合、行为和生命周期拆分，不按图片或序列帧差异拆分。

满足以下条件时，优先复用一个 Prefab，通过运行时数据替换视觉资源：

- 节点层级、组件组合、碰撞体、挂点、材质和交互行为一致。
- 差异仅是 `SpriteFrame`、SpriteAtlas 帧、序列帧内容、文本、颜色或数值等展示数据。
- 复用时可以在明确的 recycle/reset 点完整恢复状态，不需要堆叠大量分支或常驻隐藏节点。

出现以下任一情况时，可以拆分 Prefab：

- 节点层级或组件组合存在实质差异。
- 碰撞体、挂点、材质、渲染方式、交互行为或动画控制不同。
- 不同对象的资源 owner 或生命周期不同。
- 强行复用会产生大量条件分支、无效节点或难以验证的重置逻辑。

不要因为“每张图看起来不同”就创建多个 Prefab。图片和序列帧的动态加载、索引和释放规则见 `resource-api.md`，池化节点的归还边界见 `pool-api.md`。

### Spine Prefab 默认策略

- 每个独立 Spine 展示单元或角色类型原则上使用独立 Prefab，并在 Prefab 中静态绑定对应 `sp.SkeletonData`。
- 同一份 Spine 的不同动画或皮肤不重复创建 Prefab，优先在同一 `sp.Skeleton` 上切换动画或皮肤。
- 除非开发者明确要求通用 Spine 容器，否则不要为了复用节点而动态替换 `SkeletonData`。
- 明确要求动态替换时，先确认不同 Spine 的节点尺寸、缩放、材质、挂点、事件和生命周期契约兼容；替换或回收时必须清空旧动画状态、监听和 `skeletonData`，并按 owner 释放旧资源。

## 源 Prefab JSON 结构速记

本项目提交的 `.prefab` 源文件是 UTF-8 文本 JSON，不是不可读的纯二进制文件。抽样确认文件开头为 JSON 数组，首对象通常是：

```json
{
  "__type__": "cc.Prefab",
  "_name": "TipUI",
  "data": { "__id__": 1 }
}
```

结构要点：

- 顶层是对象数组，数组下标就是 `__id__` 引用目标。
- `0` 通常是 `cc.Prefab` 资产对象，`data.__id__` 指向根节点。
- 根节点通常是 `cc.Node`，`_name` 应与 UI 类名/Prefab 名一致。
- 节点通过 `_parent`、`_children`、`_components` 中的 `{"__id__": n}` 维护关系。
- 组件对象通过 `node.__id__` 反指所属节点，例如 `cc.UITransform`、`cc.Sprite`、`cc.Label`、`cc.Button`、`cc.Widget`。
- 每个节点通常有 `cc.PrefabInfo`，每个组件通常有 `cc.CompPrefabInfo`，其中 `fileId` 用于 Cocos Prefab 内部稳定引用。
- SpriteFrame 等外部资源用 `__uuid__` 引用 `.meta` uuid，例：`{"__uuid__": "...@f9941", "__expectedType__": "cc.SpriteFrame"}`。
- `.prefab.meta` 通常包含 `importer: "prefab"`、`uuid`、`files: [".json"]`、`userData.syncNodeName`。

结构化编辑要求：

1. 用 JSON 解析器读写，不用盲目字符串替换维护结构。
2. 新增对象时同步维护数组下标引用、父子关系、组件列表和 PrefabInfo/CompPrefabInfo。
3. 删除对象时检查是否仍被任何 `__id__`、`__uuid__`、`fileId`、实例 override 或资源索引引用。
4. 新建、删除、改名 Prefab 时同步检查 `.prefab.meta` 和 `asset-index.json` 生成链路。
5. 涉及 UI 绑定节点时仍遵守 `m_` 前缀、前缀组件检查和 `uitscreate` 生成链路。

推荐在编辑前后使用只读解析 helper：

```powershell
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py inspect --file Client/assets/asset-raw/ui/TipUI.prefab --assets-root Client/assets
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py validate --file Client/assets/asset-raw/ui/TipUI.prefab --assets-root Client/assets
```

## 方式一：PSD 一键生成（推荐）

适合正式 UI。

流程：

1. PSD 放到 `Client/assets/asset-art/psd/`。
2. 用 `Psd2CCC-Digest.jsx` 导出切图和结构 JSON。
3. 在 Cocos 里用 `psd2ccc` 生成节点树。
4. 调整节点命名，使用 `m_btn/m_text/m_img/...` 前缀。
5. 执行前缀组件检查。
6. 用 `uitscreate` 生成 UI 脚本。

优点：节点、切图、九宫格、脚本注册链路最完整。

## 方式二：AI + MCP 创建

适合原型、简单弹窗、没有 PSD 的临时 UI。

只保留 Prefab 相关 MCP 思路，不加载庞大的通用 MCP 工具说明。具体见 `prefab-mcp.md`。

AI 操作原则：

1. 先明确 UI 名称、尺寸、层级、需要绑定的节点。
2. 创建根节点和子节点时直接按 `m_` 前缀命名。
3. 只创建 Prefab/UI 所需节点和组件，不做无关场景、资源、调试工具操作。
4. 创建完成后仍然要执行前缀组件检查和 UI 代码生成工具。
5. 保存 Prefab 后刷新资源索引。

如果 MCP 工具不可用，停止并说明需要开发者在 Cocos 中启用或改用 PSD/手动方式。

## 方式三：手动拼

只在开发者明确选择时使用。手动拼完也必须：

1. 遵守前缀命名。
2. 执行前缀组件检查。
3. 通过 UI 代码生成工具生成脚本。
4. 生成资源索引。

## 方式四：AI 结构化 JSON 编辑

适合小范围增删节点、改组件属性、修正引用、批量检查或在开发者明确授权后创建简单源 Prefab。使用前必须先判断是否比 Cocos 编辑器/MCP 更稳。

可做：

- 查询 Prefab 节点树、组件、外部资源 uuid 和 `.meta`。
- 小范围修改节点名、位置、尺寸、颜色、Label 文本、SpriteFrame 引用、Button/Widget 等组件属性。
- 按现有样本创建简单 UI Prefab 和对应 `.prefab.meta`。
- 在删除或改名时同步检查 Scene、资源索引和脚本绑定引用。

必须避免：

- 在不了解 `__id__` 关系时重新排序整个数组。
- 直接改嵌套 Prefab override、复杂自定义脚本序列化或大规模节点树，除非已先抽样确认结构。
- 修改 Cocos 生成缓存或构建产物来“修复” Prefab。

## 报错时优先排查

- UI 脚本是否手写导致 `UIName/UIImportAll` 漏更新。
- 节点命名是否无法被生成器识别。
- Prefab 中是否有重名节点。
- `.prefab` JSON 是否无法解析，或存在悬空 `__id__` 引用。
- `.prefab.meta` 的 `uuid/importer/files/userData.syncNodeName` 是否与源文件一致。
- 资源索引是否未更新。
- 图片资源是否同名或没有进入 bundle。

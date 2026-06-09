# Scene 工作流

本文件只记录 Scene 工作流；Prefab 独立见 `prefab-workflow.md`。

修改 Cocos `.scene`、`.scene.meta` 前必须确认格式和引用关系。开发者已在 `2026-06-09` 明确授权 AI 对项目源 Scene 执行增删改查：允许在 OpenSpec 监督下直接结构化编辑 `Client/assets/**/*.scene` 和必要的配套 `.scene.meta`。

直接编辑不是跳过 Cocos 语义。涉及启动场景、Canvas、场景注册、Prefab 实例、资源索引或运行时节点契约时，必须先确认引用关系，再小步修改并验证。

禁止把授权扩展到 `Client/library`、`Client/temp`、`Client/build` 等 Cocos 生成、导入缓存或构建产物；这些目录不是 Scene 源资产。

## 源 Scene JSON 结构速记

本项目提交的 `.scene` 源文件是 UTF-8 文本 JSON，不是不可读的纯二进制文件。抽样确认文件开头为 JSON 数组，首对象通常是：

```json
{
  "__type__": "cc.SceneAsset",
  "_name": "main",
  "scene": { "__id__": 1 }
}
```

结构要点：

- 顶层是对象数组，数组下标就是 `__id__` 引用目标。
- `0` 通常是 `cc.SceneAsset`，`scene.__id__` 指向 `cc.Scene`。
- `1` 通常是 `cc.Scene`，`_children` 指向场景根节点，`_id` 通常等于 `.scene.meta` 的 `uuid`。
- 场景节点和组件仍使用 `cc.Node`、`cc.UITransform`、`cc.Canvas`、`cc.Camera`、`cc.Widget` 等对象，并通过 `__id__` 互相引用。
- Scene 必含或常含 `cc.SceneGlobals`、`cc.AmbientInfo`、`cc.ShadowsInfo`、`cc.SkyboxInfo`、`cc.FogInfo`、`cc.OctreeInfo`、`cc.LightProbeInfo`、`cc.PostSettingsInfo` 等全局设置对象。
- Scene 中实例化 Prefab 时会出现 `cc.PrefabInfo`、`cc.PrefabInstance`、`cc.MountedComponentsInfo`、`cc.TargetInfo`、`CCPropertyOverrideInfo`、`cc.TargetOverrideInfo` 等对象。
- Prefab 实例通常通过 `cc.PrefabInfo.asset.__uuid__` 指向 Prefab 的 `.prefab.meta` uuid，并通过 `targetOverrides`、`nestedPrefabInstanceRoots` 记录 override 和嵌套关系。
- `.scene.meta` 通常包含 `importer: "scene"`、`uuid`、`files: [".json"]`、`subMetas` 和 `userData`。

## 结构化编辑要求

1. 用 JSON 解析器读写，不用盲目字符串替换维护结构。
2. 新增对象时同步维护数组下标引用、父子关系、组件列表和 Scene 全局对象引用。
3. 删除对象时检查是否仍被任何 `__id__`、`__uuid__`、`fileId`、Prefab instance override 或资源索引引用。
4. 新建、删除、改名 Scene 时同步检查 `.scene.meta` 和 `asset-index.json` 生成链路。
5. 涉及 Prefab 实例时先查对应 `.prefab.meta` uuid，修改 override 前确认 `targetOverrides` 和 `nestedPrefabInstanceRoots`。
6. 涉及启动场景节点时先确认运行时契约；不要无意删除或改名 `UICanvas`、`GameRoot`、`PoolRoot` 等当前启动场景依赖节点。

推荐在编辑前后使用只读解析 helper：

```powershell
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py inspect --file Client/assets/scenes/main.scene --assets-root Client/assets
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py validate --file Client/assets/scenes/main.scene --assets-root Client/assets
```

## 可操作范围

可做：

- 查询 Scene 节点树、组件、全局设置、Prefab 实例和 `.meta`。
- 小范围修改节点名、激活状态、Transform/UITransform、Canvas/Camera/Widget 等组件属性。
- 增删普通节点和必要组件。
- 创建简单源 Scene 和对应 `.scene.meta`。
- 删除或改名 Scene 前检查场景注册、资源索引、Prefab 实例和运行时引用。

必须避免：

- 在不了解 `__id__` 关系时重新排序整个数组。
- 直接大规模重写包含 Prefab instance override 的复杂场景。
- 修改 `Client/library`、`Client/temp`、`Client/build` 中的导入缓存或构建结果。
- 为适配某个 Scene 修改 `ty-framework`，除非开发者另行确认框架修改。

## 验证清单

- `.scene` 能被 JSON 解析。
- `.scene.meta` 的 `importer` 是 `scene`，`files` 包含 `.json`。
- `cc.SceneAsset.scene.__id__` 指向 `cc.Scene`。
- `cc.Scene._id` 与 `.scene.meta.uuid` 保持一致，或能解释 Cocos 当前行为差异。
- 所有 `__id__` 引用都有目标对象。
- 外部 `__uuid__` 引用能在对应 `.meta` 中找到。
- 新增、删除或改名后已刷新资源索引。

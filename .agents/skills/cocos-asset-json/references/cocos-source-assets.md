# Cocos Source Assets

## Prefab

- 源 `.prefab` 是 JSON 对象数组，`0` 通常是 `cc.Prefab`，`data.__id__` 指向根 `cc.Node`。
- 数组下标就是 `__id__` 目标。新增、删除、重排对象都会影响引用。
- 节点通过 `_parent`、`_children`、`_components` 引用其他对象。
- 组件通过 `node.__id__` 反指所属节点。
- 节点常有 `cc.PrefabInfo`，组件常有 `cc.CompPrefabInfo`。
- `.prefab.meta` importer 为 `prefab`，files 通常包含 `.json`，`userData.syncNodeName` 常等于根节点名。

## Scene

- 源 `.scene` 是 JSON 对象数组，`0` 通常是 `cc.SceneAsset`，`scene.__id__` 指向 `cc.Scene`。
- `cc.Scene._children` 指向场景根节点，`cc.Scene._id` 通常等于 `.scene.meta.uuid`。
- Scene 常含 `cc.SceneGlobals`、`cc.AmbientInfo`、`cc.ShadowsInfo`、`cc.SkyboxInfo`、`cc.FogInfo`、`cc.OctreeInfo` 等全局对象。
- Scene 中实例化 Prefab 会出现 `cc.PrefabInfo`、`cc.PrefabInstance`、`CCPropertyOverrideInfo`、`cc.TargetInfo`、`cc.TargetOverrideInfo`。
- Prefab instance 的 `cc.PrefabInfo.asset.__uuid__` 指向 Prefab meta uuid；override 的 `propertyPath` 可能是 `{_name}`、`{_lpos}`、`{_contentSize}` 等。

## Custom Components

- 自定义脚本组件的 `__type__` 可能是 Cocos 短类型 ID，不一定是类名。
- 反推类名时先看字段名、挂载节点名，再 `rg` 源码中的字段和 `@ccclass`。
- 不要只凭短类型 ID 手写新组件对象；优先用已有样本复制结构或通过 Cocos 编辑器/MCP 保存。

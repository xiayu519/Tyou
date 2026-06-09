---
type: reference
description: 本项目 Cocos Scene 源文件是可解析 JSON 对象数组而非不可读二进制
status: active
last_verified: 2026-06-09
source: codex-observed
---

# Cocos Scene 源 JSON 结构参考

抽样 `Client/assets/scenes/main.scene`、`psd2ui.scene`、`Client/assets/asset-raw/scene/login.scene` 和 `game.scene`，当前源 `.scene` 可直接用 JSON 解析。

速记：顶层是数组，`0` 通常为 `cc.SceneAsset`，`scene.__id__` 指向 `cc.Scene`；`cc.Scene._children` 指向场景根节点；Scene 包含 `cc.SceneGlobals` 和各类全局 info；Prefab 实例会出现 `cc.PrefabInfo`、`cc.PrefabInstance`、`targetOverrides`、`nestedPrefabInstanceRoots` 等结构；`.scene.meta` 的 importer 为 `scene`，files 为 `.json`。

权威参考见 `.agents/skills/tyou-dev/references/scene-workflow.md`，使用前按当前源码和样本复核。

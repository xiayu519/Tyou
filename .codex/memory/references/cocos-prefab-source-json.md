---
type: reference
description: 本项目 Cocos Prefab 源文件是可解析 JSON 对象数组而非不可读二进制
status: active
last_verified: 2026-06-09
source: codex-observed
---

# Cocos Prefab 源 JSON 结构参考

抽样 `Client/assets/asset-raw/ui/TipUI.prefab`、`TestUI.prefab`、`MessageBoxUI.prefab` 和 `Client/assets/asset-art/ui/LoadingUI.prefab`，当前源 `.prefab` 可直接用 JSON 解析。

速记：顶层是数组，`0` 通常为 `cc.Prefab`，`data.__id__` 指向根 `cc.Node`；节点和组件通过 `__id__` 引用，组件通过 `node.__id__` 反指节点；节点有 `cc.PrefabInfo`，组件有 `cc.CompPrefabInfo`；外部资源通过 `__uuid__` 指向 `.meta`。`.prefab.meta` 的 importer 为 `prefab`，files 为 `.json`。

权威规则见 `.codex/rules/tyou-dev/prefab-workflow.md`，使用前按当前源码和样本复核。

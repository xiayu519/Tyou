---
name: cocos-asset-json
description: Tyou/Cocos Creator 3.8.7 源资产解析 skill。用于检查、汇总和校验 Cocos `.prefab`、`.scene`、`.meta`、`asset-index.json`、SpriteAtlas `.plist/.plist.meta` 的结构、uuid、`__id__` 引用、Prefab instance/override、自定义脚本组件字段和资源索引。触发词：Cocos 资产解析、prefab json、scene json、meta uuid、asset-index、SpriteAtlas、plist、uuid 引用、__id__ 校验、PrefabInstance、targetOverrides。明确不用于 Luban `.bin` 解析；配表问题走 `luban-dev` 和源 Excel/Defines。
---

# Cocos Asset JSON

这个 skill 只做 Cocos Creator 源资产结构解析和只读校验。它不替代 `prefab-workflow.md`、`scene-workflow.md`、`resource-api.md` 的编辑规则，也不写项目资源。

## 快速入口

优先运行脚本，避免临时手写解析器：

```powershell
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py inspect --file Client/assets/asset-raw/ui/TipUI.prefab
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py validate --file Client/assets/scenes/main.scene --assets-root Client/assets
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py uuid-index --assets-root Client/assets
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py asset-index --file Client/assets/asset-raw/asset-catalog/asset-index.json
python .agents/skills/cocos-asset-json/scripts/cocos_asset_json.py atlas --plist Client/assets/asset-raw/ui-raw/atlas/foo/foo.plist --meta Client/assets/asset-raw/ui-raw/atlas/foo/foo.plist.meta
```

脚本只读，输出 JSON。需要编辑资产时，先读对应 Tyou 参考并走 OpenSpec：Prefab 用 `.agents/skills/tyou-dev/references/prefab-workflow.md`，Scene 用 `.agents/skills/tyou-dev/references/scene-workflow.md`，资源索引用 `.agents/skills/tyou-dev/references/resource-api.md`。

## 何时读 reference

- Prefab/Scene 对象数组、`__id__`、Prefab instance/override、自定义组件短类型 ID：读 `references/cocos-source-assets.md`。
- SpriteAtlas `.plist` 和 `.plist.meta` 的 frame/subMeta/uuid 关系：读 `references/sprite-atlas.md`。

## 边界

- 不解析 Luban `.bin`。配表问题使用 `luban-dev`，直接看 `Design/config/*.xlsx`、Defines、导表脚本和生成 TS 访问面。
- 不修改 `Client/library`、`Client/temp`、`Client/build` 等 Cocos 缓存或构建产物。
- 不承诺把 Cocos 自定义脚本短类型 ID 精确映射到类名。脚本会输出字段、挂载节点和候选线索；具体类名要结合源码 `@ccclass`、字段名和 Cocos 当前行为确认。

## 常用流程

1. `inspect` 看对象数、节点数、组件类型、自定义组件字段、Prefab instance/override 摘要。
2. `validate` 查 JSON 解析、`__id__` 悬空引用、meta importer/files、外部 uuid 是否能在 `assets-root` 下找到。
3. `uuid-index` 建立 `.meta` uuid 到路径的索引，排查 `__uuid__` 引用。
4. `asset-index` 看 bundle/type/path/name 分布和重复逻辑名。
5. `atlas` 查询 SpriteAtlas frame 名、rect、subMeta uuid 和 texture uuid。

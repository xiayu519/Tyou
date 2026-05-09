# 排障速查

## UI 打不开

检查：

1. `UIName.ts` 是否有对应枚举。
2. `UIImportAll.ts` 是否 import 了 UI 类。
3. UI 类是否有 `@UIDecorator({ name: UIName.Xxx })`。
4. 资源索引中是否有同名 Prefab。
5. Prefab 是否在 bundle 中，并已生成 `asset-index.json`。

## UI 节点绑定为空

检查：

1. 节点名是否符合 `ui-component-config.json` 前缀筛选规则。
2. 是否执行过 `uitscreate` 的前缀组件检查。
3. 是否通过 UI 代码生成工具生成/更新脚本。
4. 节点名是否与 `this.get("...")` 完全一致。
5. 整个 Prefab 内是否有重名节点。
6. 是否执行过 `scriptGenerator()`：正常由 `baseCreate()` 调用。
7. 节点是否在窗口根节点下。

## 按钮点击无效

检查：

1. 节点是否有 Button 组件。
2. 是否执行过前缀组件检查。
3. 是否在 `registerEvent()` 中调用 `onRegisterEvent`。
4. 节点 active / interactable 状态。

## 资源加载失败

检查：

1. 是否执行过 `assetool` 自动生成资源索引。
2. 是否存在同名资源导致逻辑名冲突或被追加后缀。
3. `asset-index.json` 是否包含逻辑名。
4. bundle 是否加载。
5. 资源类型是否在 `resourceTypeMap` 中。
6. SpriteFrame 是否需要 `/spriteFrame`，不要手动重复拼。
7. 图片是否因缺少 `l_` 前缀未被索引收录。

## 资源崩溃或内存不释放

优先检查：

1. `addRef/decRef` 是否配对。
2. UI 动态资源是否走 `addAutoReleaseAsset()`。
3. 是否重复 `decRef` 导致仍在使用的资源进入释放路径。
4. 是否少 `decRef` 导致 `_pendingReleaseQueue` 无法释放或 `refCount` 长期大于 0。
5. 是否误调 `forceReleaseAllPending()` / 禁用延迟释放。

## 配表加载失败

检查：

1. `config` bundle 是否存在。
2. `asset-raw/config/game/*.bin` 是否生成。
3. `schema.ts` 是否同步生成。
4. `TableModule` 中 file_name 是否与 bin 名一致。

## Cocos 编辑器扩展改动不生效

检查：

1. 是否运行对应扩展目录下 `npm run build`。
2. `dist/` 是否已更新。
3. Cocos 是否需要重载扩展或重启编辑器。
4. `package.json` contributions 是否指向正确 dist 文件。

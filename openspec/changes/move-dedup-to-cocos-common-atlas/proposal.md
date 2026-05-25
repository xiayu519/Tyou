## Why

PSD 导出阶段缺少完整项目上下文，去重公式容易在“相似但不同”和“肉眼相同但编码不同”之间反复摇摆；而结构 JSON 只是生成 UI 的中间产物，不进入最终资源包。公共图集治理应放到 Cocos 项目侧，在最终 SpriteFrame、Prefab/Scene 引用和 `asset-art/atlas/common` 目录都可见的环境中完成。

## What Changes

- 将 Photoshop `Psd2CCC-Digest.jsx` 的 PNG 去重默认关闭，PSD 导出只负责忠实切图和生成结构 JSON。
- 在 Cocos 层级面板右键菜单中新增“检查公共图集”入口，和 `uitscreate` 的“生成UI脚本”“检查前缀组件”处于同一功能层级。
- 公共图集检查按解码后的可见像素和 SpriteFrame 导入参数做强确定匹配，只处理完全等价资源。
- 当 `asset-art/atlas/common` 已存在等价资源时，替换当前选中节点树里的 Sprite 组件引用；能反查到 prefab 资源时，同步替换磁盘 `.prefab` 里的 SpriteFrame UUID。
- 当 common 不存在等价资源时，复制一张代表图到 common，等待 Cocos 生成 meta 后继承 SpriteFrame 导入参数，再替换引用。
- 重复资源删除前扫描项目引用；仍被其它资产引用时跳过删除并报告。

## Capabilities

### New Capabilities
- `cocos-common-atlas-dedup`: Cocos 编辑器侧公共图集检查、引用替换和重复图清理。

### Modified Capabilities
- `psd-ui-generation`: PSD 导出不再承担 PNG 去重职责，生成端保留忠实导出。

## Impact

- 影响 `Client/tools/psd/Psd2CCC-Digest.jsx` 的导出去重行为。
- 影响 `Client/extensions/psd2ccc/` 和 `Client/extensions/uitscreate/`，新增公共图集检查逻辑，并把入口挂到层级面板 UI 工具菜单。
- 可能新增/修改 `Client/assets/asset-art/atlas/common` 下的 PNG 和 meta。
- 会修改被检查节点树里的 SpriteFrame 引用；能反查到 prefab 资源时会同步修改 `.prefab` 中的 SpriteFrame UUID。
- 不修改 `Client/assets/ty-framework/`，不改变运行时资源加载 API。

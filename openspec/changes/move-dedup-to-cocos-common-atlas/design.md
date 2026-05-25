## Context

当前 PSD2CCC 在 Photoshop ExtendScript 中尝试去重 PNG。该环境无法方便地稳定读取最终像素，也无法看到 Cocos 项目里的 Prefab/Scene、SpriteFrame meta、公共图集目录和历史资源引用。近期多个案例说明 PSD 阶段去重维护成本高，且业务真正需要的是最终 Cocos 资源的公共化。

项目已有 `Client/extensions/psd2ccc` 负责从 structure JSON 生成 Cocos 节点，并已有 `Client/assets/asset-art/atlas/common` 作为公共图集目录。Cocos 扩展运行在 Node 环境，可直接读写文件、解析 PNG、读取 `.meta`，也能通过 `asset-db` 刷新/重导入/删除资源。

## Goals / Non-Goals

**Goals:**
- PSD 导出默认不做 PNG 去重，避免导出阶段误判。
- 在 Cocos 层级面板提供“检查公共图集”工具，和 `uitscreate` 的“生成UI脚本”“检查前缀组件”同层触发，对选中节点树做强确定公共化。
- 用解码 PNG 的可见像素指纹加 SpriteFrame 导入参数判断等价资源。
- 自动复用或创建 common 资源，并替换选中节点树中的 SpriteFrame 引用；能反查到 prefab 资源时同步替换磁盘 `.prefab` 引用。
- 删除重复图前执行全项目引用扫描，无法确认安全时跳过删除。

**Non-Goals:**
- 不做相似图、容差、颜色接近、缩放接近等模糊去重。
- 不自动处理 PSD 图层语义、组合图和拆分图重叠问题。
- 不修改 `ty-framework` 或运行时资源加载 API。
- 不强制将全项目所有历史重复资源一次性迁移；第一版以层级面板右键选中的节点树为入口。

## Decisions

- PSD 去重默认关闭，而不是继续调公式。
  - 理由：JSON 是中间产物，不进包；最终公共化应基于 Cocos 资产和引用。
  - 替代方案：继续优化 ExtendScript 指纹。缺点是环境受限、上下文不足，仍无法处理跨 PSD 和历史资源。

- Cocos 侧使用可见像素指纹 + SpriteFrame 参数作为等价条件。
  - 理由：alpha 为 0 的 RGB 脏数据不应影响视觉等价；半透明、非透明像素和九宫格边界必须保持严格一致。
  - 替代方案：只比 PNG 文件 hash。缺点是透明像素脏数据和 PNG 编码元数据会造成漏去重。

- common 资源不存在时复制 PNG，不复制 `.meta`。
  - 理由：让 Cocos 生成新的 UUID，避免复制 meta 导致 UUID 冲突；随后再把 SpriteFrame 导入参数同步过去。

- 删除重复资源必须先替换当前节点树和可解析 prefab 的引用，再扫描全项目引用。
  - 理由：避免误删仍被其他 Prefab/Scene/资源引用的 PNG，并避免出现“图片已去重但组件仍指向旧图”的状态。

## Risks / Trade-offs

- PNG 解码器实现不完整 → 第一版支持常见 8-bit PNG 类型，遇到不支持类型跳过并报告。
- 层级节点可能无法反查到 prefab 磁盘文件 → 工具至少替换当前打开节点树里的 Sprite 组件引用；只有反查成功时才同步 `.prefab` 文件。
- AssetDB API 在不同 Cocos 版本细节有差异 → 删除/刷新失败时不做破坏性 fallback，仅报告并保留文件。
- 自动公共化可能改变后续单界面独立改图成本 → 等价判断只处理完全相同资源，业务上不希望公共化的情况后续可加忽略名单。

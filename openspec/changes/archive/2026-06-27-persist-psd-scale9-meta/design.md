## Context

Digest 输出的 structure JSON 是九宫格参数来源，Cocos `.meta` 是 AssetDB importer 的持久化来源。旧实现用 `fs.writeFileSync()` 修改 `.meta`，同时 scene-walker 还会修改内存中的 SpriteFrame inset；这可能造成当前节点临时正确，但刷新后按旧 importer meta 回退。

## Goals / Non-Goals

**Goals:**

- structure border 通过 AssetDB 正式保存。
- reimport 后回读结果必须与 structure 一致。
- 失败时不给用户生成依赖陈旧 meta 的 UI。

**Non-Goals:**

- 不让公共图集检查读取 structure JSON。
- 不放宽公共图集对 border、trim 等 SpriteFrame 语义的比较。

## Decisions

- 先用 PNG db path 查询 image asset UUID，再查询和修改该 asset 的 meta。
- 调用 `save-asset-meta` 后执行 `reimport-asset`，最后再次 `query-asset-meta` 校验。
- 将 meta 修改和比较提取为纯函数，测试 AssetDB 消息顺序及旧 border 到新 border 的转换。

## Risks / Trade-offs

- [Risk] 图片仍在首次导入时 query 可能失败 → 中止并提示等待资源导入后重试。
- [Risk] reimport 增加生成耗时 → 仅对 structure 中带 sliceBorder 的图片执行。

# SpriteAtlas Plist And Meta

## Plist

SpriteAtlas `.plist` 通常是 XML plist，包含：

- `frames`: frame 名到 frame 数据。
- `metadata`: 图集尺寸、格式等信息，具体字段随导出工具变化。

常见 frame 字段：

- `frame`: 形如 `{{x,y},{w,h}}`。
- `rotated`: 是否旋转。
- `offset`、`sourceSize`、`sourceColorRect`。

## Meta

`.plist.meta` importer 通常是 `sprite-atlas`，`files` 包含 `.json`。

关键关系：

- 主 `uuid` 是 atlas uuid。
- `userData.textureUuid` 指向图集 png texture uuid。
- `subMetas` 里每个 sprite-frame 都有 `uuid`，通常形如 `atlasUuid@id`。
- `subMetas.*.name` 对应 frame 名，可用于把 SpriteFrame 名解析成 uuid。

修改 SpriteAtlas 应优先重新导出图集并让 Cocos 生成 meta；手工改 plist/meta 只适合小范围诊断或开发者明确要求。

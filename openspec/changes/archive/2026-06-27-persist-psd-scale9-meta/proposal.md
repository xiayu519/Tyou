## Why

PSD structure JSON 已正确记录九宫格 border，但 `psd2ccc` 直接写 `.meta` 文件时可能未更新 AssetDB 的 importer 状态，后续刷新会重新加载旧 border。公共图集检查读取实际 `.meta`，因此像素相同且 PSD 参数相同的资源也可能因陈旧 border 被错误判定为不可复用。

## What Changes

- 通过 AssetDB 的 `query-asset-meta` / `save-asset-meta` 保存 SpriteFrame border，不再直接写 `.meta` 文件。
- 保存后执行 reimport，并回读 meta 校验四个 border。
- 资源尚未导入或持久化校验失败时中止 UI 生成并提示重试，避免半成功状态。
- 增加 AssetDB 保存顺序和 border 回读测试。

## Capabilities

### New Capabilities

- `psd-scale9-import`: 定义 structure JSON 的九宫格 border 持久化到 Cocos AssetDB 和 SpriteFrame meta 的行为。

### Modified Capabilities

无。

## Impact

- `Client/extensions/psd2ccc/source/assets-menu.ts`
- `Client/extensions/psd2ccc/tests/verify-slice-border-persistence.mjs`
- `.agents/skills/tyou-dev/references/psd2ui-workflow.md`
- 不修改 PSD 命名、图片像素、公共图集指纹规则和运行时 SpriteFrame API。

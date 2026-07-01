## Why

需要在当前项目中放入一组真实 JSON Spine 资源，用于验证 asset-index 与资源加载链路能否把 `.json` Spine 识别为 `sp.SkeletonData`，同时不影响普通业务 JSON。

## What Changes

- 从参考项目复制一组完整 JSON Spine 测试资源到 `Client/assets/asset-raw/spine/zjm_json_spine/`。
- 保留 `.json/.atlas/.png` 及对应 `.meta`，方便 Cocos Creator 识别为 Spine 资源。
- 不修改框架代码、资源索引生成器、运行时加载 API 或业务逻辑。

## Capabilities

### New Capabilities
- `json-spine-sample-resource`: 提供一组用于本地识别测试的 JSON Spine 样本资源。

### Modified Capabilities

## Impact

- 新增测试资源文件到 `Client/assets/asset-raw/spine/`。
- 后续需要在 Cocos Creator 中确认导入状态，并重新生成 asset-index 后验证类型。

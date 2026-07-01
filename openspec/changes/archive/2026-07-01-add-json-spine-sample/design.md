## Context

当前项目需要验证 JSON Spine 在资源索引与加载链路中的类型识别。参考项目 `cocos  割草类 游戏源码3.8.3` 中存在 Cocos 已导入的 JSON Spine 三件套，适合作为测试样本。

## Goals / Non-Goals

**Goals:**
- 复制一组完整 JSON Spine 样本到当前项目的 `Client/assets/asset-raw/spine/`。
- 保持样本资源结构完整，包含 `.json/.atlas/.png` 与 `.meta` 文件。

**Non-Goals:**
- 不修改 `ty-framework`。
- 不修改 asset-index 生成器。
- 不手动编辑 `asset-index.json`。

## Decisions

- 选择 `zjm` 样本：文件体积较小、三件套完整，且 `.json.meta` importer 为 `spine-data`。
- 目标目录使用 `zjm_json_spine`：避免与当前项目或后续测试资源发生逻辑名冲突。
- 使用复制而不是移动：保留参考项目原始文件，避免破坏外部源码。

## Risks / Trade-offs

- Cocos Creator 可能需要刷新资源库后才会重新导入 `.meta` 与依赖关系。
- 复制外部 `.meta` 理论上有 UUID 冲突风险；本样本 UUID 未在当前项目中命中，若编辑器报冲突，可删除目标 `.meta` 后让 Cocos 重新导入。

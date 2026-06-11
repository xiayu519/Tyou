## Why

资源模块重构后需要进一步审视 `releaseAll()` 与 in-flight 加载的边界，避免释放期间完成的加载重新进入托管缓存。多语言工作流已经由 Luban 表和 `tyou.i18n` 支撑，但缺少一个专门 skill 将“加多语言文案”稳定路由到源 Excel、导表和运行时调用。

## What Changes

- 加固 `ManagedAssetLoader.releaseAll()`：释放托管缓存时同步取消匹配的 in-flight 请求，防止已释放范围内的加载完成后重新缓存和 `addRef`。
- 保持 `AssetIndexManager`、`tyou.res.*` 门面、延迟释放和 bundle 语义不变。
- 新增项目内 `localization-dev` skill，触发多语言/文案/i18n/本地化任务时，引导先使用 `luban-dev` 查看和修改 `Design/config/#TableLocalizationText.xlsx`，再使用 `Design/tools/genBin.bat` 导表，最后通过 `tyou.i18n` 或 `LocalizeLabel` 调用。
- 不直接修改 Luban 生成代码、`.bin`、多语言运行时模块或现有表数据。

## Capabilities

### New Capabilities

- `localization-workflow-skill`: 规范 AI 处理 Tyou 多语言文案的 skill 路由、源表修改、导表和运行时调用流程。

### Modified Capabilities

- `runtime-resource-safety`: 加强托管资源释放期间对 in-flight 请求的释放安全要求。

## Impact

- 代码影响：`Client/assets/ty-framework/module/loader/ManagedAssetLoader.ts`。
- 工作流影响：新增 `.agents/skills/localization-dev/`。
- 文档/spec 影响：同步资源安全 spec，并在必要时同步 Tyou workflow skill 清单。

## Why

资源重构后 `LoaderManager.ts` 已经没有调用点，继续保留空壳会制造“旧入口还可用”的错觉。`setSpriteAsync` 在远程图片转 `SpriteFrame` 或异步请求过期时，也需要更明确的生命周期配对，避免加载完成但没有赋值、也没有进入 UI 自动释放集合的临时资源长期保留。资源释放语义需要写成框架契约，降低后续误用 `addRef/decRef` 的风险。

## What Changes

- 删除无引用的 `LoaderManager.ts` 与 `LoaderManager.ts.meta`。
- 优化 `SpriteAssignService`：远程图片生成的 `SpriteFrame` 进入资源托管；请求过期、目标失效或赋值失败时释放本次加载得到的 `SpriteFrame`。
- 同步 `ResourceModule` 构造注入，使远程设图走专用 `SpriteFrame` 创建路径。
- 补充资源生命周期文档和 runtime resource safety spec，明确加载、赋值、自动释放、手动释放和 `releaseAll` 的语义。

## Impact

- 代码影响：`Client/assets/ty-framework/module/loader/ResourceModule.ts`、`ManagedAssetLoader.ts`、`SpriteAssignService.ts`，删除旧 `LoaderManager` 文件。
- 文档/spec 影响：`.agents/skills/tyou-dev/references/resource-api.md`、`openspec/specs/runtime-resource-safety/spec.md`。
- 不改变 `AssetIndexManager.instance.initFromBundle("asset-catalog", "asset-index")` 和索引逻辑名加载。

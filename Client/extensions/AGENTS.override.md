# Client/extensions/AGENTS.override.md

**当前目录是 Cocos Creator 3.8.7 编辑器扩展源码。**

修改前使用 `creator-extension-dev`，并检查目标扩展自己的 `package.json`、contributions、构建脚本和测试：

1. 区分“修改扩展实现”和“运行扩展生成产物”；后者通常不需要修改扩展源码。
2. 识别 `main`、panel、message、menu、scene、assets、hierarchy 等受影响入口，以及是否需要重新构建或重启 Creator。
3. `uitscreate` 可能影响 `UIName.ts` / `UIImportAll.ts`；`assetool` 可能影响 `asset-index.json`；`psd2ccc` 可能影响 UI Prefab/图集生成链路。
4. 扫描、索引、监听类分析能力必须显式启停；关闭后不得保留定时器、监听器或持续扫描。
5. 不修改 `library/`、`temp/`、`build/` 等 Creator 生成缓存，不依赖未公开的 Creator DOM 结构。

完成后运行目标扩展实际提供的 `npm run build` 或 `npm test`，并说明是否还需 Creator 内人工验证。

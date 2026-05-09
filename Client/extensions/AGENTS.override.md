# Client/extensions/AGENTS.override.md

**当前目录是 Cocos Creator 编辑器扩展源码（assetool / psd2ccc / uitscreate / cocos-mcp-server）。**

修改这里之前必须确认：

1. 你要改的是扩展自身的实现（构建/打包行为），还是只是想运行扩展生成的产物？后者不需要改这里。
2. 该扩展是否有独立的 `package.json` / 构建脚本，修改源码后是否需要重新编译/重启编辑器才能生效。
3. 修改是否会影响 UI 自动生成链路（`uitscreate` 影响 `UIName.ts`、`UIImportAll.ts`）或资源索引链路（`assetool` 影响 `asset-index.json`）。

任何对 `cocos-mcp-server` 的修改都视为框架级改动，必须按 ty-framework 同等流程先与开发者确认。

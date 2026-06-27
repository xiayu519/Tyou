## Why

`wolaiziyijie` 模板里的 PSD 扩展已经提供顶部 `Tools -> 检查所有公共图集` 和 `Tools -> 检查冗余图片` 两个入口，`Tyou` 目前只有节点右键的局部公共图集检查。把两个入口同步到 `Tyou` 可以让框架工程直接做全量资源治理，同时保持公共图集判等和引用替换仍由同一个 checker 维护。

## What Changes

- 在 `Client/extensions/psd2ccc` 注册两个顶部 `Tools` 菜单项：
  - `检查所有公共图集`
  - `检查冗余图片`
- 为两个入口增加可勾选确认面板，用户确认后才执行整理或删除。
- 扩展 `common-atlas-checker` 的计划构建、执行和丢弃 API，让节点检查、全量整理、冗余清理共享同一套内容指纹、SpriteFrame 语义和引用安全逻辑。
- 不改 `Client/assets/ty-framework/`，不改运行时 UI/资源 API，不改 PSD 导出 Photoshop 脚本。

## Capabilities

### New Capabilities
- `psd-atlas-tools`: 约束 PSD Cocos 扩展的顶部全量公共图集整理和冗余图片清理入口。

### Modified Capabilities
- 无。

## Impact

- 影响 `Client/extensions/psd2ccc/` 的 `package.json`、`source/main.ts`、`source/common-atlas-checker.ts`、`source/scene-walker.ts`、新增面板源码，以及编译后的 `dist/`。
- 需要运行 `npm run build` 验证 TypeScript 编译和面板产物。
- 不影响正常游戏运行时代码；新能力只在 Cocos Creator 编辑器扩展中触发。

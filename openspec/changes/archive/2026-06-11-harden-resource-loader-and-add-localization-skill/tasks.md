## 1. 资源安全复查与加固

- [x] 1.1 对照旧 `LoaderManager.Loader` 行为复查 `ManagedAssetLoader` 缓存、in-flight、releaseAll 和引用计数边界。
- [x] 1.2 修改 `ManagedAssetLoader.releaseAll()`，取消匹配范围内的 in-flight 请求并阻止完成后重新缓存。
- [x] 1.3 验证索引加载、缓存命中、SceneAsset guard、延迟释放和 bundle 过滤逻辑仍存在。

## 2. 多语言 Skill

- [x] 2.1 使用 `skill-creator` 初始化项目内 `localization-dev` skill。
- [x] 2.2 编写简洁 `SKILL.md`，触发多语言任务时路由到 `luban-dev`、`#TableLocalizationText.xlsx`、`genBin.bat` 和 `tyou.i18n`/`LocalizeLabel`。
- [x] 2.3 校验 skill frontmatter 与目录命名。

## 3. 规范与验证

- [x] 3.1 同步 `runtime-resource-safety` 主 spec。
- [x] 3.2 同步 Codex workflow skill 清单或相关参考。
- [x] 3.3 运行 TypeScript/静态断言、OpenSpec validate 和可观测性 sensor。
- [x] 3.4 记录资源模式最终评价：功能一致性、内存泄漏风险和架构完成度。

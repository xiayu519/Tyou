## Why

当前 Cocos Creator 项目缺少可视化的资源直接引用与被引用查询工具，开发者只能依赖手工搜索或逐个检查资源，难以及时判断 Prefab、Scene、图片、Atlas 和脚本之间的关系。需要提供一个基于 Creator 3.8.7 公开 AssetDB 能力的轻量编辑器扩展，在不注入内置 Assets 面板、不同步扫描全部源文件的前提下安全展示依赖关系。

## What Changes

- 新增独立的 `asset-dependency-viewer` Creator 编辑器扩展。
- 新增可停靠在 Assets 面板旁边的资源总览，按项目路径展示直接引用数和直接被引用数。
- 新增 Creator `simple panel` 详情窗口，显示引用与被引用资源的完整项目路径。
- 支持点击路径后在 Creator Assets 面板中选中并聚焦对应资源。
- 使用 AssetDB 公开依赖查询和资源变更广播构建、刷新内存索引，并提供防抖、单任务刷新和失败保留旧快照机制。
- 默认关闭资源扫描；只有开发者明确开启后才建立索引、响应资源变化并在项目 `temp` 下保存优化缓存，明确关闭后释放服务并删除缓存。
- 将图片、Texture、SpriteFrame、Atlas 帧等子资源归并到可理解的源资源路径后再去重计数。
- 脚本和资源统一查询 `all` 类型的直接依赖；动态逻辑名、配置驱动和字符串拼接加载不计入硬引用数字。
- 总览提供 `资源引用/冗余资源` 大类切换，每个大类再提供 `资源/脚本` 子类切换；冗余列表展示归并后没有任何直接使用者的项目资源或脚本。
- 对 `globalThis.xxx` 注册且由其他脚本直接使用 `xxx` 的全局脚本补充 AST 引用边，并把全局提供者排除出冗余脚本候选。
- 启用状态独立持久化，不再依赖完整缓存是否写入成功；Assets 文件夹右键可按真实项目目录限定查看范围。
- 不修改 `Client/assets/ty-framework/`、Prefab、Scene、meta、运行时资源索引或现有 Creator 内置面板。

## Capabilities

### New Capabilities

- `asset-dependency-viewer`: 查询、归并、展示并自动刷新 Cocos 项目资源与脚本的直接引用和被引用关系。

### Modified Capabilities

无。

## Impact

- 新增目录：`Client/extensions/asset-dependency-viewer/`。
- 新增 Creator 扩展菜单、消息、dockable panel 和 simple panel。
- 依赖 Creator 3.8.7 公开的 `asset-db`、`Editor.Panel`、`Editor.Selection` 和扩展贡献 API。
- 不改变游戏运行时、资源引用计数、UI 生命周期、Luban 配置或资源索引生成行为。

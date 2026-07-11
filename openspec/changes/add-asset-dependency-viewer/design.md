## Context

Creator 3.8.7 已提供 `query-assets`、`query-asset-dependencies`、`query-asset-users` 以及资源增删改广播，但没有公开的 Assets 行装饰接口。当前项目已有 `psd2ccc` 扩展使用 `Editor.Panel`、`Editor.Selection` 和 Assets 跳转能力，可以复用相同的扩展组织与交互方式。项目资源通过 UUID、子资源 UUID 和脚本导入关系组成原始依赖图，同时还存在 `tyou.res.*` 逻辑名动态加载；后者不属于 Creator 可证明的硬引用。

## Goals / Non-Goals

**Goals:**

- 使用 Creator 公开 AssetDB API 建立项目资源和脚本的直接依赖快照。
- 在独立 dockable panel 中展示项目资源路径、直接引用数和直接被引用数。
- 在 Creator simple panel 中展示双向完整路径列表并支持跳转 Assets。
- 监听 AssetDB 变化并以防抖、单 in-flight 刷新策略更新真实快照。
- 归并图片、SpriteFrame、Texture 和 Atlas 帧等子资源，避免隐藏 UUID 导致计数失真。
- 查询失败时安全降级，不阻塞 Creator 主界面，不产生重试风暴。

**Non-Goals:**

- 不修改或注入 Creator 内置 Assets 面板 DOM。
- 不修改 `Client/assets/ty-framework/` 或任何运行时资源加载行为。
- 不把配置驱动、字符串拼接或运行时逻辑名加载宣称为可证明的硬引用。
- 不做引用替换、丢失资源修复、重复资源检测和传递依赖全量统计。

## Decisions

### 使用 AssetDB 快照而不是扫描源文件

主进程服务先使用 Creator 3.8.7 官方示例形态的无参数 `query-assets` 获取基础 `AssetInfo`，再筛选 `db://assets`。不在资源枚举请求中附带 `depends/dependeds/fatherInfo` 等扩展数据键，避免该批量请求在 3.8.7 中长时间不返回。如果基础结果缺少正向依赖字段，则以受限并发调用 `query-asset-dependencies(..., 'all')` 补齐；项目内反向关系由完整正向图精确反推，避免逐资源再发一次 users 查询。相比同步读取 Prefab、Scene、meta 和 TypeScript，此方案遵循 Creator 导入结果并避免阻塞 IO。

### 使用独立面板替代内置行注入

总览使用 `dockable` panel，可通过 `Editor.Panel.openBeside('assets', ...)` 在 Assets 旁打开；详情使用可复用的 `simple` panel。Creator 没有公开的 Assets 行绘制接口，DOM 注入会破坏版本稳定性和虚拟列表行为，因此明确禁止。

### 保留原始 UUID 图并生成路径级显示图

索引先记录 UUID 正向边，再利用 `subAssets`、`fatherInfo` 和相同源文件信息将子资源映射到 `db://assets/...` 的顶层源资源。显示图按源路径去重、移除自引用和目录节点，红色数字表示不同源资源的直接依赖数，绿色数字表示不同源资源的直接使用者数。

### 事件只调度刷新，不在广播回调内做重活

`asset-db:asset-add/change/delete/ready` 只设置 dirty 标记并启动防抖计时器。刷新状态机同时只允许一个请求；刷新期间再次变化时只追加一次后续刷新。失败时保留上一份快照并向面板广播 stale 状态。

### 显式启停并以缓存文件表示持续开启状态

扩展首次安装时默认关闭，`load()` 不请求 AssetDB，资源广播方法在关闭状态直接返回。开发者点击“开启功能”后才创建索引服务、执行首次扫描，并把路径级优化快照异步写入 `Editor.Project.tmpDir/asset-dependency-viewer/dependency-cache.json`。Creator 重启时若该缓存存在且版本、项目 UUID 有效，则恢复开启状态并先显示缓存，不立即全量扫描；后续资源广播再增量调度真实刷新。点击“关闭功能”时释放服务、计时器和订阅，删除缓存并广播关闭状态。关闭或重新打开面板本身不改变功能启停状态。

### 动态逻辑名与硬引用分离

第一版只展示 Creator AssetDB 可证明的直接依赖。`tyou.res.*`、Luban 或其他配置驱动的逻辑名不进入红绿数字，避免误报。后续若需要，可新增单独的“动态引用线索”能力，但不得与硬引用合并。

### 建图阶段分类并以无使用者定义冗余

每个路径级显示节点在建图阶段根据 `type/importer/path` 标记为 `resource` 或 `script`，UI 不重复推断。总览使用两级 toggle：一级为 `资源引用/冗余资源`，二级为 `资源/脚本`。冗余的规范定义是归并去重后的 `userCount === 0`，不要求该节点自身的 `dependencyCount` 也为零；因此未被任何项目节点使用、但主动依赖其他节点的资源仍属于冗余候选。引用视图的计数按钮打开双向详情；冗余视图只提供直接定位，点击节点后选中 Assets 中的实际资源，不打开详情窗口。

### 用 AST 补充显式全局脚本关系

Creator AssetDB 无法从 `Main.ts` 对全局 `tyou` 的使用反推出 `Tyou.ts`，因为两者没有模块 import 或序列化 UUID 边。功能开启后的扫描阶段异步读取脚本文件，并用 TypeScript AST 识别 `globalThis.xxx = ...` 提供者及其他脚本对标识符 `xxx` 的直接使用，向原始图补充消费者到提供者的边。全局提供者标记为 `global` 并排除出冗余脚本列表。字符串反射、`eval`、配置字段和动态属性名仍不推断。

### 启用状态与数据缓存分离

项目级 `Editor.Profile` 单独保存 enabled 布尔值，成功快照继续保存在项目 `temp`。即使某次扫描部分失败、没有写出完整缓存，重启后仍恢复开启状态；若没有可用缓存，则在 AssetDB ready 后执行首次扫描。关闭功能时先写入 disabled，再删除缓存。

### 以 Assets 文件夹作为查看范围入口

不注入 Assets 行 DOM，而是在公开的 Assets 右键菜单中为目录提供“检查此文件夹引用”。主进程把目录 URL 作为 scope 发送给总览，总览的分类计数、冗余筛选和搜索都只作用于该目录子树。面板显示当前范围面包屑，并支持使用 Assets 当前选择或清除范围。这样目录导航仍由 Creator 原生 Assets 完成。

## Risks / Trade-offs

- [AssetDB 批量结果在不同 Creator 补丁版本中可能缺少 `depends/dependeds`] → 使用公开的逐资源查询作为兼容回退，并限制并发与让出事件循环。
- [Atlas 和图片子资源映射不完整导致计数分散] → 优先使用 `fatherInfo/subAssets/file/url` 归并，详情保留原 UUID 查询结果便于排查。
- [大量资源导致面板 DOM 过多] → 总览使用固定行高窗口化渲染，详情列表同样按可见区渲染或分批追加。
- [AssetDB 忙或请求失败] → 设置超时、捕获异常、保留旧快照、允许手动刷新，不自动高频重试。
- [缓存损坏或来自其他项目] → 缓存包含 schema 版本与项目 UUID，解析或校验失败时忽略并保持默认关闭。
- [Assets 闪烁消息不是稳定公开契约] → 跳转以 `Editor.Selection.select` 和 `Editor.Panel.focus` 为主，`assets/twinkle` 只作为可失败增强。

## Migration Plan

1. 新增扩展并完成 TypeScript 构建。
2. Creator 重载扩展或重启后从 Tools 菜单打开总览。
3. 若扩展异常，可在扩展管理器禁用或删除该独立目录；不会影响运行时资源、Prefab、Scene 或构建产物。

## Open Questions

- 第一版默认只统计 `db://assets` 顶层项目资源，内置和 package 资源仅在依赖不存在项目路径时忽略。
- 动态逻辑名分析延后，待硬引用版本验证稳定后再单独立项。

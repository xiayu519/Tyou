## ADDED Requirements

### Requirement: 建立项目直接依赖快照
扩展 MUST 使用 Cocos Creator 3.8.7 公开 AssetDB API 查询 `db://assets` 范围内资源和脚本的直接依赖与直接使用者，并且不得通过同步扫描全部源文件替代 AssetDB 图。

#### Scenario: 初次打开总览
- **WHEN** AssetDB 已准备就绪且开发者打开资源引用总览
- **THEN** 扩展生成包含项目资源、脚本、直接依赖和直接使用者的内存快照

#### Scenario: AssetDB 查询失败
- **WHEN** AssetDB 请求超时或抛出异常
- **THEN** 扩展保留上一份可用快照并显示失效状态，以非错误级日志记录可恢复失败，且不连续重试阻塞编辑器

### Requirement: 归并子资源并去重计数
扩展 MUST 将同一源文件下的 Texture、SpriteFrame、Atlas 帧等子资源归并到可见源资源路径，并按不同源资源去重直接引用和直接被引用计数。

#### Scenario: Prefab 引用 PNG 的 SpriteFrame
- **WHEN** Prefab 的原始依赖指向 PNG 的 SpriteFrame 子资源 UUID
- **THEN** PNG 源资源的被引用列表包含该 Prefab 且只计一次

#### Scenario: 归并产生自引用
- **WHEN** 父资源和子资源之间的原始依赖在路径归并后指向同一源资源
- **THEN** 扩展从显示图中移除该自引用

### Requirement: 展示资源双向计数
扩展 SHALL 在独立 Creator dockable panel 中展示项目资源完整项目路径、红色直接引用数和绿色直接被引用数，并支持搜索和手动刷新。

#### Scenario: 查看资源总览
- **WHEN** 依赖快照可用
- **THEN** 每个非目录项目资源行显示其路径以及归并去重后的双向计数

#### Scenario: 大量资源滚动
- **WHEN** 总览包含大量资源且开发者滚动列表
- **THEN** 面板只渲染当前可见范围附近的行，不一次创建全部行节点

### Requirement: 查看详情并跳转资源
扩展 SHALL 使用 Creator simple panel 显示所选资源的直接引用和直接被引用完整路径，并允许开发者点击路径跳转到 Creator Assets 面板中的对应资源。

#### Scenario: 点击引用数字
- **WHEN** 开发者点击资源行的红色或绿色数字
- **THEN** 扩展打开或更新同一个详情窗口并显示双向路径列表

#### Scenario: 点击详情路径
- **WHEN** 开发者点击详情中的项目资源路径
- **THEN** Creator Assets 面板获得焦点并选中对应 UUID；闪烁能力失败不得影响选中结果

### Requirement: 资源变化后安全刷新
扩展 MUST 监听 AssetDB 准备、增加、修改和删除广播，并通过防抖且最多单个进行中任务的调度器更新快照。

#### Scenario: 连续保存 Prefab
- **WHEN** 短时间内收到多个资源修改广播
- **THEN** 扩展将事件合并为一次防抖刷新而不是逐事件重建

#### Scenario: 刷新期间再次变化
- **WHEN** 快照刷新尚未完成又收到资源变化广播
- **THEN** 当前刷新完成后最多追加一次刷新以取得最新状态

### Requirement: 明确脚本与动态引用边界
扩展 MUST 把 AssetDB `all` 类型返回的脚本关系纳入硬引用，并 MUST NOT 将运行时逻辑名、配置字段或字符串拼接推断混入红绿硬引用数字。

#### Scenario: Prefab 挂载脚本
- **WHEN** Creator AssetDB 报告 Prefab 直接依赖某个脚本
- **THEN** 总览和详情按直接硬引用展示该关系

#### Scenario: 动态逻辑名加载
- **WHEN** TypeScript 仅通过变量或配置调用 `tyou.res.loadAssetAsync` 加载资源
- **THEN** 第一版硬引用数字不宣称包含该动态关系

### Requirement: 显式控制索引生命周期
扩展 MUST 默认保持关闭，只有开发者明确开启后才能查询 AssetDB、响应资源变化并维护缓存；明确关闭后 MUST 释放索引服务并停止所有资源查询。

#### Scenario: 首次安装或无缓存启动
- **WHEN** 扩展加载且项目没有有效依赖缓存
- **THEN** 扩展保持关闭，不调用 `query-ready`、`query-assets` 或依赖查询

#### Scenario: 开启功能
- **WHEN** 开发者点击“开启功能”
- **THEN** 扩展创建索引服务、执行首次扫描并把成功快照异步保存到项目 `temp` 缓存

#### Scenario: 开启状态下资源变化
- **WHEN** 功能已开启且 Creator 广播资源增加、修改或删除
- **THEN** 扩展按防抖规则刷新索引并更新缓存

#### Scenario: 关闭功能
- **WHEN** 开发者点击“关闭功能”
- **THEN** 扩展释放计时器、内存索引与订阅并删除缓存，后续资源广播不创建服务或发起查询

#### Scenario: 重新启动 Creator
- **WHEN** 项目存在版本和项目 UUID 均有效的依赖缓存
- **THEN** 扩展恢复开启状态并先显示缓存数据，不因扩展加载立即执行全量扫描

#### Scenario: 只关闭面板
- **WHEN** 开发者关闭总览或详情面板但未点击“关闭功能”
- **THEN** 索引功能保持原有开启状态，行为与参考工具的窗口关闭和功能关闭相互独立

### Requirement: 分离引用与冗余分类视图
扩展 SHALL 在总览中提供 `资源引用/冗余资源` 一级 toggle，并在每个一级视图下提供 `资源/脚本` 二级 toggle，任何时刻列表只显示当前组合对应的节点。

#### Scenario: 查看普通资源引用
- **WHEN** 开发者选择 `资源引用 -> 资源`
- **THEN** 列表仅展示非脚本项目资源及其直接引用数和直接被引用数

#### Scenario: 查看脚本引用
- **WHEN** 开发者选择 `资源引用 -> 脚本`
- **THEN** 列表仅展示脚本节点及其直接引用数和直接被引用数，不混入普通资源

#### Scenario: 查看冗余资源
- **WHEN** 开发者选择 `冗余资源 -> 资源`
- **THEN** 列表仅展示归并后 `userCount === 0` 的非脚本项目资源

#### Scenario: 查看冗余脚本
- **WHEN** 开发者选择 `冗余资源 -> 脚本`
- **THEN** 列表仅展示归并后 `userCount === 0` 的脚本节点

#### Scenario: 定位冗余节点
- **WHEN** 开发者点击冗余资源或冗余脚本列表中的节点
- **THEN** 扩展直接在 Creator Assets 面板中选中并定位对应实际资源，不打开引用详情弹窗

#### Scenario: 搜索分类结果
- **WHEN** 开发者在任意 toggle 组合下输入搜索文本
- **THEN** 搜索只过滤当前组合的数据，不把其他大类或子类节点重新混入列表

### Requirement: 补充显式全局脚本引用
扩展 MUST 在功能开启时识别脚本中的 `globalThis.xxx` 静态注册和其他脚本对 `xxx` 标识符的直接使用，并把可证明的消费者到提供者关系补入脚本依赖图。

#### Scenario: Main 使用全局 tyou
- **WHEN** `Tyou.ts` 静态执行 `globalThis.tyou = ...` 且 `Main.ts` 直接使用标识符 `tyou`
- **THEN** 脚本引用视图把 `Main.ts` 计为 `Tyou.ts` 的直接使用者

#### Scenario: 全局提供者没有可证明消费者
- **WHEN** 脚本静态注册 `globalThis.xxx` 但 AST 未发现直接消费者
- **THEN** 脚本标记为 Global 且不进入冗余脚本列表，不伪造未知消费者数量

#### Scenario: 动态全局访问
- **WHEN** 代码通过运行时字符串、反射或动态属性名访问全局对象
- **THEN** 扩展不宣称能可靠识别该关系

### Requirement: 独立持久化开启状态
扩展 MUST 使用项目级状态独立记录功能是否开启，数据缓存成功与否不得决定下一次启动的开启状态。

#### Scenario: 部分扫描失败后重启
- **WHEN** 功能已开启但某次依赖查询失败导致快照不完整且未写入数据缓存
- **THEN** 重启 Creator 后功能仍处于开启状态，并在 AssetDB ready 后重新扫描

#### Scenario: 关闭后重启
- **WHEN** 开发者明确关闭功能后重新启动 Creator
- **THEN** 功能保持关闭且不查询 AssetDB

### Requirement: 按 Assets 目录限定查看范围
扩展 SHALL 允许开发者从 Creator Assets 文件夹右键或当前选择设置查看范围，当前分类、冗余筛选、统计和搜索都只能处理该目录及其子目录节点。

#### Scenario: 文件夹右键检查
- **WHEN** 开发者在 Assets 中右键某个文件夹并选择“检查此文件夹引用”
- **THEN** 总览打开并只显示该文件夹子树中的资源或脚本

#### Scenario: 使用当前 Assets 选择
- **WHEN** 开发者点击“使用 Assets 当前选择”且当前选中资源位于某个目录
- **THEN** 文件夹选择使用自身作为范围，文件选择使用其父目录作为范围

#### Scenario: 清除范围
- **WHEN** 开发者清除当前目录范围
- **THEN** 总览恢复显示整个 `db://assets` 项目范围

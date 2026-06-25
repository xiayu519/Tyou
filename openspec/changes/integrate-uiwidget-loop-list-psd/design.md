## Context

Tyou 当前 UI 运行时以 `UIWindow`/`UIBase` 为核心，窗口脚本由 `uitscreate` 生成，运行时通过 `ViewUtil.collectBindNodes()` 按 `m_` 前缀收集节点。`m_list` 已在 `ui-component-config.json` 和 `ViewUtil` 中指向 `ListView`，但编辑器前缀检查仍只补 `cc.ScrollView`，不会生成 `ListView` 可直接运行所需的 `content/Layout/tmpNode/ListItem` 结构，也不会把 `m_item` 作为独立 item/widget 边界处理。

`Client/assets/ty-framework/module/ui/loop-list/ListView.ts` 已具备虚拟列表、循环列表、分页、选择、分帧渲染和 `NodePool` 复用能力，核心滚动算法可以继续使用。它当前在池中取出 item 后直接改 `_listId` 并触发 `renderEvent/update-item`，回收到池时只执行 `NodePool.put(item)`，销毁时直接 `destroy()`。这意味着窗口级 `UIBase.addAutoReleaseAsset()` 只能在关闭窗口时释放动态资源，无法覆盖“同一个 item 节点复用成不同 index”时的资源切换。

## Goals / Non-Goals

**Goals:**

- 引入通用 `UIWidget`，作为 `UIWindow` 或另一个 `UIWidget` 下的子 UI 生命周期单元，可服务列表 item、子面板、页签、子窗口等场景。
- 将 `m_list` 明确补齐为 Tyou `ListView` 标准结构，而不只是普通 `ScrollView`。
- 将每个 `m_list` 下的 `m_item` 固定为该列表的唯一模板；缺失时报错，非标准实例结构自动转换成标准实例结构。
- 让 `m_list + m_item` 生成后即可使用：父 UI 绑定 `m_list`，item/widget 脚本生成到 `Client/assets/scripts/logic/ui/widget/`，目录不存在时自动创建。
- 父 UI 脚本跳过 `m_item`/widget 子树，item/widget 脚本独立绑定自己的内部节点。
- 列表复用 item 时，在换 index、放回池、销毁列表时释放 item/widget 当前动态资源，并阻止旧异步贴图覆盖新 index。
- 保持现有 `renderEvent`、`update-item`、`m_btn`、`m_img`、`m_scroll`、`UIWindow` 业务用法兼容。

**Non-Goals:**

- 不重写 `ListView` 的滚动、循环、分页、选择和布局算法。
- 不让 Photoshop/PSD 导出脚本理解复杂列表语义；列表结构修复放在 Cocos 编辑器后处理和脚本生成链路。
- 不替业务自动推断列表数据源、item 数量或 item 的具体刷新内容。
- 不强制迁移已有手写 `renderEvent` 列表；新生成流程使用 `UIWidget`，旧流程保持可运行。

## Decisions

### 1. `UIWidget` 做成通用 UI 子对象，而不是专用 ListItem 类

`UIWidget` 放在 `Client/assets/ty-framework/module/ui/`，继承 `UIBase`，保持和 `UIWindow` 一样的绑定、事件、动态资源 helper 风格。它由父 UI 或 `ListView` 用普通 TypeScript 类实例创建，不作为 Cocos `Component` 强制挂到节点上，避免和当前 `UIWindow` 的 plain class 体系割裂。

备选方案是给每个 item 生成 Cocos `Component` 脚本并挂到 `m_item` 节点。这个方案看起来直观，但会引入两套 UI 生命周期和两套资源释放入口，和现有 `UIBase` 资源、事件、`@UIDecorator` 注册体系不一致。

### 2. Widget 边界由生成器和运行时共同识别

父 UI 生成时继续收集普通 `m_` 节点，但遇到列表 item 边界时只记录边界根节点，不递归收集其子树。`m_item` 是 `m_list` 的 item widget 边界；普通子面板 widget 通过独立“生成Widget脚本”和运行时动态加载 prefab 托管，不依赖静态 widget 前缀。

`ViewUtil.collectBindNodes()` 需要支持“扫描到边界根后停止递归”的能力，防止父 UI 和 item/widget 同时绑定同名内部节点造成覆盖或误报。

### 3. `m_list` 标准结构由前缀检查自动修复

标准结构固定为：

```text
m_listX
  content
    m_itemX
```

`m_listX` 必须拥有 `cc.UITransform`、`cc.ScrollView`、`cc.Mask` 和 `pkg:ListView`；`content` 必须拥有 `cc.UITransform` 和 `cc.Layout`，使用顶中锚点并对齐列表视口顶部，同时被赋给 `ScrollView.content`；`m_itemX` 必须是 `content` 下的实例节点，拥有 `cc.UITransform` 和 `pkg:ListItem`，并被赋给 `ListView.tmpNode`，`ListView.templateType` 使用 node 模板模式。

如果 `m_item` 缺失，前缀检查弹出明确错误并停止把该列表标记为已修复。如果存在一个 `m_item` 但位置、组件或引用不符合标准，前缀检查移动/创建 `content` 并保留 `m_item` 子树后重新绑定引用，使开发者不用再手工拖引用。多个 `m_item` 服务同一个 `m_list` 时按结构错误处理。

### 4. 生成脚本时父 UI 注册列表 item widget 类型

`uitscreate` 生成父 UI 脚本时：

- `m_listX` 生成 `ListView` 字段。
- 对 `m_listX/content/m_itemX` 生成一个 item widget 类，路径为 `Client/assets/scripts/logic/ui/widget/<ItemClass>.ts`。
- item 类名使用 `Item` + `m_item` 后缀的稳定规则，例如 `m_itemContent` 生成 `ItemContent`；同一次生成内发现重复类名时停止并提示重命名节点。
- 父 UI 脚本导入 item 类，并在 `bindMemberProperty()` 或 `onCreate()` 中把该类注册给对应 `ListView`。
- 父 UI 不生成 `m_item` 内部节点属性，避免父 UI 和 item 脚本共享同一批字段。

已有 UI 脚本存在时，保持当前“不覆盖业务文件”的习惯，只生成可粘贴/可合并的绑定片段；新 item 脚本不存在时创建，存在时不静默覆盖。

### 5. `ListView` 保留 legacy 事件，同时增加 item widget 生命周期

`ListView` 增加可选 item widget 类型/工厂配置。创建新 item 节点时创建 widget 实例并绑定节点；从池中取出旧 item 且 `_listId` 将变化时，先触发旧 widget 的 recycle 清理，再刷新为新 index；item 离开显示区放入池前也触发 recycle；列表销毁或非虚拟列表删除 item 时触发 release。

`renderEvent` 和 `node.emit('update-item')` 保持存在，用于兼容老业务。新生成的 `UIWidget` item 使用 widget `onRefresh(index, data)` 承载刷新逻辑，业务可以逐步从 `renderEvent` 迁移。

### 6. 资源安全以 owner epoch 解决“旧请求晚到”

仅靠 `SpriteAssignService` 当前的 `WeakMap<Sprite, requestId>` 不够，因为 item recycle 后如果新 index 暂时没有给同一个 Sprite 发起新请求，旧请求晚到仍可能通过 target 有效性检查。`UIBase`/`UIWidget` 需要提供 owner 级 epoch：每次 recycle/release 增加 epoch，并释放当前动态资源；`setSpriteAsync` 等 helper 发起请求时捕获 epoch，异步完成后同时校验 Sprite 最新请求和 owner epoch。

如果 owner 已 recycle/release 或 target 已无效，晚到资源必须通过 `tyou.res.decRef` 进入资源释放流程，不得绑定到 Sprite，也不得重新登记进已回收的 widget 动态资源集合。

## Risks / Trade-offs

- [Risk] `ty-framework`、`ListView`、编辑器扩展都会被修改，影响面较大 → Mitigation: 按 OpenSpec tasks 分阶段实施，每阶段保留旧 API，完成后用 UI 测试 Prefab 和静态检查验证。
- [Risk] Cocos 编辑器脚本添加自定义 `pkg:ListView`/`pkg:ListItem` 的组件名解析可能和引擎序列化细节有关 → Mitigation: 先在前缀检查中验证组件查询/添加方式，失败时给出错误而不是生成半成品结构。
- [Risk] 旧 `renderEvent` 业务仍可能手动加载资源但不走 widget helper → Mitigation: 新生成 item 模板默认使用 `UIWidget` helper，并在文档中标记 `renderEvent` 动态资源需要开发者自行释放或迁移。
- [Risk] 自动移动 `m_item` 到 `content` 可能改变 PSD 原始层级坐标 → Mitigation: 转换时保留世界坐标/尺寸/锚点，必要时转换本地坐标，并只处理 `m_list` 子树内的唯一 `m_item`。
- [Risk] item 脚本命名在多个列表下可能冲突 → Mitigation: 使用 `Item` + `m_item` 后缀的稳定规则，并在同一次生成内检测重复类名；发现重复时停止生成并提示开发者重命名。

## Migration Plan

1. 先补 `UIWidget` 和 `UIBase` owner 级资源/recycle 能力，确保窗口原有释放语义不变。
2. 再给 `ListView` 增加可选 widget 生命周期，保持 `renderEvent/update-item` 兼容。
3. 再改 `ViewUtil` 和 `uitscreate`：支持列表 item 边界跳过、`m_list` 标准结构检查、`widget` 目录和 item/widget 脚本生成。
4. 最后同步 Tyou topic references、OpenSpec spec，并用用户将创建的 UI 测试验证 `m_list/m_item` 转换、脚本生成、滚动复用和资源释放。

回滚策略是移除新生成流程对 widget 注册的调用，保留 `renderEvent` 旧链路；运行时代码需要保持新增 API 可选，不让旧 Prefab 因缺少 item widget 而崩溃。

## Open Questions

- 用户已明确允许 `m_list` 和循环列表绑定，也允许引入通用 `UIWidget`。实现阶段不再需要额外确认这些方向。
- 普通子面板 widget 采用动态 prefab 托管，不开放静态 widget 前缀作为生成规则。

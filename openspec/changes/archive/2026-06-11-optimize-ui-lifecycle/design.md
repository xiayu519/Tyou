## Context

当前 UI 运行时由 `UIModule` 同时负责窗口解析、实例缓存、异步加载、窗口栈、层级排序、可见性、模糊背景、Tip 和快捷弹窗。`UIWindow` 负责单窗口加载/创建/刷新/销毁，`UIBase` 负责节点收集、按钮事件和动态资源释放。整体 API 易用，但内部状态边界还不够稳：

- 同名窗口并发 `showUIAsync()` 没有 in-flight 合并。
- `loadGameObjectAsync()` 返回 null 时 `baseLoad()` 不明确失败，可能留下未准备窗口。
- `baseDestroy()` 调用 async `onRelease()` 不等待，未来释放逻辑一旦异步化会出竞态。
- UI 绑定节点重名会静默覆盖，运行时只看到错误绑定。
- 运行时节点扫描前缀和 `ui-component-config.json` 不一致。
- 模糊背景刷新多处 fire-and-forget，缺少刷新版本保护。
- `TipManager` 动画异常时可能不归还临时 Vec3 或池节点。

约束：

- 保持 `tyou.ui.showUIAsync()`、`closeWindow()`、`hideWindow()`、`UIWindow.close/hide`、`@UIDecorator`、`UIName.ts` 和 `UIImportAll.ts` 用法不变。
- 不修改 Prefab、Scene、meta、Luban 或资源索引。
- 不引入 `UIRegistry`/`UIDecorator` 到 `UIModule` 的反向依赖，不破坏副作用 import 自注册模式。

## Goals / Non-Goals

**Goals:**

- 同名 UI 加载中重复打开时合并 Promise，并以最后一次参数刷新。
- 加载失败、关闭加载中窗口、隐藏自动关闭、模块销毁都能收敛实例表、窗口栈、定时器、事件和资源。
- 默认 `this.get("name")` 易用性不变，同时对重复绑定节点给出可诊断路径，并提供显式 `getRequired/getAll/getByPath`。
- 对齐运行时前缀扫描和编辑器生成器配置，避免生成后运行时扫不到。
- 模糊背景刷新按当前顶层 eligible popup 决定，避免旧刷新覆盖新状态。
- Tip 播放异常时仍归还 Pool 节点和临时对象。
- 文档化 UI 生命周期和资源释放契约。

**Non-Goals:**

- 不重写 UI 生成器，不改变 `UIName.ts` / `UIImportAll.ts` 文件格式。
- 不改业务 UI 脚本基础模板，不要求业务迁移到窗口句柄或 lease object。
- 不修改 Cocos Prefab/Scene/meta。
- 不改 `ResourceModule` 索引加载逻辑。

## Decisions

1. **保留 `UIModule` facade，内部轻量拆职责**

   本次不做大规模文件拆分，优先用小的内部状态和 helper 方法收紧生命周期。必要时增加内部类型，例如窗口记录、加载 token、绑定节点信息；外部仍只接触 `tyou.ui`。

2. **使用 loading promise + close token 处理并发**

   `UIModule` 维护加载中窗口记录。同名窗口加载中再次打开时返回同一个 Promise，并更新 pending args；加载完成后只用最新参数执行 `baseRefresh()`。如果关闭发生在加载期间，记录取消标记，加载完成的节点立即销毁并释放。

3. **窗口销毁走单一收敛路径**

   `UIWindow.baseDestroy()` 负责取消隐藏关闭定时器、释放 UIBase 资源、销毁节点和标记状态。`UIModule` 负责从栈和实例表移除。所有关闭入口最终走这一条路径，避免隐藏关闭、背景关闭、closeAll 分叉。

4. **节点绑定默认易用，重复名显式诊断**

   `scriptGenerator()` 继续支持 `this.get("m_btnX")`。扫描时第一命中保留，不允许后命中静默覆盖；重复项进入诊断表。新增：

   - `getRequired(name)`：找不到时报错，适合生成代码逐步迁移。
   - `getAll(name)`：返回同名绑定节点列表。
   - `getByPath(path)`：用相对路径处理确实需要重名的少数场景。

5. **绑定前缀用统一配置常量**

   不在运行时读取编辑器 JSON，避免小游戏环境 IO 和打包差异；在框架里维护与 `ui-component-config.json` 对齐的前缀表，并同步文档。后续如扩展前缀，运行时表和编辑器配置必须一起改。

6. **模糊背景刷新使用版本号**

   每次请求刷新递增 version。`showBehindWindow()` 完成后只有 version 仍匹配才提交 `_blurBgTopKey`，防止旧刷新覆盖新栈状态。

7. **TipManager 使用 try/finally**

   Tip 节点成功租借后，任何动画或节点查找异常都必须归还 Vec3 和节点。模块销毁后不再继续消费队列。

## Risks / Trade-offs

- [Risk] 同名窗口加载中参数合并改变极端情况下的刷新时机。→ Mitigation：只合并同名窗口，保留“一个窗口只有一个实例”的既有模型，并使用最后一次参数刷新。
- [Risk] 重名节点 warning 可能暴露历史 Prefab 命名问题。→ Mitigation：`get()` 仍返回第一个命中，不让历史 UI 直接崩；`getRequired()` 才作为更严格入口。
- [Risk] `baseDestroy` 若改成异步会影响现有调用。→ Mitigation：保留同步 public 关闭入口，内部只等待同步释放路径；不引入必须 await 的业务 API。
- [Risk] 模糊背景版本保护会让代码更复杂。→ Mitigation：只封装在 `UIModule.refreshBlurBg()`，不外泄。

## Migration Plan

1. 先实现内部生命周期收敛和诊断，保留业务 API。
2. 同步 UI topic references 和 OpenSpec 主 specs。
3. 运行 OpenSpec、静态搜索、`git diff --check`、可观测性 sensor 和可承受的 TypeScript 检查。
4. 若发现历史 UI 有重复绑定 warning，保留 warning 作为诊断，不在本次直接改 Prefab。

## Open Questions

无阻塞问题。开发者已确认按本方案开始优化 UI 模块。

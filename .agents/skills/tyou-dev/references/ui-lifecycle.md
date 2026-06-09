# UI 生命周期

## 组成

- `UIBase`：节点收集、事件注册、自动释放资源。
- `UIWindow`：窗口加载、创建、刷新、关闭、隐藏。
- `UIModule`：窗口栈、层级、实例缓存、模糊背景、Tip。
- `UIDecorator`：类装饰器，自动注册到 `UIRegistry`。
- `UIName.ts`：UI 名称枚举。
- `UIImportAll.ts`：副作用 import 所有 UI 类，触发装饰器注册。

## 标准 UI 类

```ts
@UIDecorator({
    name: UIName.TestUI,
    layer: UILayer.UI,
    fullScreen: true,
    bgClose: false,
    blurBackground: true,
    hideTimeToClose: 3,
})
export class TestUI extends UIWindow {
    private _btnEnter: Node;

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick);
    }

    private onBtnEnterClick(btn: Node, param: any) {
    }
}
```

## 生命周期顺序

首次加载：

`baseLoad -> handleCompleted -> baseCreate -> scriptGenerator -> bindMemberProperty -> registerEvent -> onCreate -> baseRefresh -> onRefresh`

再次显示同一窗口：

`showUIAsync -> 复用实例 -> onWindowPrepare -> baseRefresh -> onRefresh`

关闭：

`closeWindow -> baseDestroy -> onRelease -> onClosed -> unLoadRes -> node.destroy`

## 打开与关闭

```ts
await tyou.ui.showUIAsync(UIName.TestUI, data);
tyou.ui.closeWindow(UIName.TestUI);
tyou.ui.hideWindow(UIName.TestUI);
```

窗口内部：

```ts
this.close();
this.hide();
```

## 关键规则

- 新 UI 必须添加 `@UIDecorator`。
- UI 预制体对应的 UI 脚本原则上不允许手写创建，必须优先走 `uitscreate` 代码生成工具，让工具同步生成/更新 `UIName.ts` 和 `UIImportAll.ts`。
- 按钮事件在 `registerEvent()` 中必须用 `onRegisterEvent` 注册，不要直接 `node.on("click", ...)`。
- UI 内加载图片优先用 `getSprite()`、`getSpriteFromAtlas()`、`setSpriteAsync()`；列表复用或头像图标异步切换时优先用 `setSpriteAsync()`，成功后交给关闭流程统一释放。
- `UIBase.onRelease()` 会清理按钮监听、动态资源和 `tyou.event.targetOff(this)`；新增 UI 逻辑要让清理路径能覆盖到。
- UI 内事件监听优先绑定到当前 UI 实例，依赖 `targetOff(this)` 清理；若使用其他 target 或手动监听，必须明确注销点。
- 多语言 Label 可挂 `LocalizeLabel` 组件，运行时通过 `tyou.i18n.switchLanguage()` 触发刷新；手写 UI 也可以直接调用 `tyou.i18n.get(key, ...args)`。
- 当 `this.get("xxx")` 找不到节点，先检查命名是否符合自动生成前缀、是否走过前缀组件检查、预制体内是否有重名节点、脚本是否由生成器同步。
- 非全屏弹窗默认会显示共享模糊背景；需要“仍是弹窗但不模糊背景”时，在 `@UIDecorator` 中配置 `fullScreen: false, blurBackground: false`。该窗口不会使用共享模糊背景承接点击关闭；如仍需要点外部关闭，应在 Prefab 内提供自己的遮罩或按钮节点。

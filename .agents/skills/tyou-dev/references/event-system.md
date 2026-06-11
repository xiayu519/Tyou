# 事件系统

## 核心

`Client/assets/ty-framework/module/event/EventModule.ts`

特点：

- 自实现事件系统，不依赖 Cocos `EventTarget`。
- 支持优先级。
- 支持 `once`。
- 支持 `waitFor`。
- 支持 `bindEvents/unbindEvents` 批量绑定。
- emit 期间延迟移除监听，避免遍历被修改。
- 同一事件嵌套 emit 使用深度计数，只有最外层分发结束才 flush 延迟移除。
- `waitFor` 在事件模块销毁或 `clear()` 时会释放等待并返回 `null`。

## API

```ts
tyou.event.on("EventName", this.onEvent, this);
tyou.event.on("EventName", this.onEvent, this, EventPriority.HIGH);
tyou.event.once("EventName", this.onOnce, this);
tyou.event.emit("EventName", arg0, arg1);
tyou.event.emitArray("EventName", [arg0, arg1]);
tyou.event.off("EventName", this.onEvent, this);
tyou.event.targetOff(this);

const args = await tyou.event.waitFor("EventName", 5000);

const id = tyou.event.bindEvents(this, {
    "EventA": this.onA,
    "EventB": this.onB,
});
tyou.event.unbindEvents(id);
```

## UI 中的按钮和事件

按钮点击不走 `tyou.event`，用 `UIBase.onRegisterEvent`：

```ts
override registerEvent() {
    this.onRegisterEvent(this._btnClose, this.onBtnCloseClick);
}
```

`UIBase.onRelease()` 会自动移除按钮监听和 `tyou.event.targetOff(this)`。

UI 内业务事件监听也要让关闭流程能清理。优先使用当前 UI 实例作为 target：

```ts
tyou.event.on("EventName", this.onEventName, this);
```

不要使用匿名函数或其他 target 注册全局事件，除非同时写清楚注销点。

## 规则

- 模块间解耦用 `tyou.event`。
- 固定参数事件用 `emit`；已有数组或动态转发参数用 `emitArray`。
- UI 节点按钮用 `onRegisterEvent`。
- UI 事件监听要能被 `targetOff(this)` 清理。
- 非 UI 长生命周期对象要在销毁时 `off` 或 `targetOff`。
- 事件名建议集中定义，避免散落字符串。

# 模块 API 速查

所有模块通过全局 `tyou` 访问。

## 模块表

| 模块 | 用途 | 入口 |
| --- | --- | --- |
| 资源 | 资源加载、bundle、引用计数 | `tyou.res` |
| UI | 窗口栈、层级、模糊背景、Tip | `tyou.ui` |
| 事件 | 优先级事件、once、waitFor、批量绑定 | `tyou.event` |
| 计时器 | 绝对时间 + 最小堆定时任务 | `tyou.timer` |
| 音频 | BGM/音效 | `tyou.audio` |
| 场景 | 场景注册和切换 | `tyou.scene` |
| 对象池 | Node/Class 池、等待队列诊断 | `tyou.pool` |
| FSM | 状态机 | `tyou.fsm` |
| ECS | ECS 根系统 | `tyou.ecs` |
| HTTP | HTTP 请求、query 参数编码 | `tyou.http` |
| 存储 | 本地持久化 | `tyou.storage` |
| 配表 | Luban 二进制表 | `tyou.table` |
| 多语言 | Luban 文本表、切语言、格式化文本 | `tyou.i18n` |
| Update | Update 回调管理 | `tyou.update` |
| 世界 | 服务器时间等全局状态 | `tyou.game` |

## 生命周期

模块通常实现：

```ts
onCreate(): void | Promise<void>
onUpdate(dt: number): void
onDestroy(): void
```

新增模块时保持与 `Module` 基类风格一致，并在 `Tyou.ts` 的 `onCreate/onUpdate/onDestroy` 中接入。依赖 Luban 表的模块不要把解析逻辑塞进 `TableModule`；启动阶段由 `Tyou` 编排 `tyou.loadTablesAsync()`，成功后再刷新依赖表的模块。

启动场景约定：

- `GameRoot` 用于挂载 `GameWorld`。
- `UICanvas` 是 UI 根节点。
- `UICanvas/UICamera` 必须带 `Camera` 组件。

## 常见模式

```ts
await tyou.res.loadAssetAsync("AssetName");
await tyou.ui.showUIAsync(UIName.TestUI);
tyou.event.emit("EventName", arg0, arg1);
const args = await tyou.event.waitFor("EventName", 5000);
await tyou.scene.loadSceneAsync(SceneEnum.Login);
tyou.audio.playBGM("BGM_Main");
tyou.i18n.get("common_ok");
```

对象池的 Node 池租借/归还、`poolName || assetPath` key 语义和 Prefab 释放契约见 `pool-api.md`。

AudioSource 池、AudioClip 引用、BGM 切换和销毁顺序见 `audio-lifecycle.md`。

HTTP 请求、小游戏平台 request/WebSocket 适配、错误事件、abort 和网络节点生命周期见 `network-http.md`。
Scene / Table / Localization 启动顺序与依赖方向见 `startup-chain.md`。

## 框架模块变更

不要默认新增或修改 `ty-framework/module`。如果任务看起来需要新框架模块，先停下来问开发者是否确认扩展框架，并说明是否需要改 `Tyou.ts` 生命周期。

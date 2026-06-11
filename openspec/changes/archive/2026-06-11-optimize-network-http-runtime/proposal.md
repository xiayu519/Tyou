## Why

当前 `tyou.http` 直接依赖 `XMLHttpRequest`，`module/network` 直接依赖浏览器 `WebSocket` 与原生 `setTimeout`，在 Cocos Creator 小游戏、多端 WebView、原生和浏览器之间的行为边界不够清晰。网络模块属于框架基础设施，应该把平台差异封装在内部，同时保持业务调用方式简单稳定。

## What Changes

- 优化 HTTP 运行时：保留 `get`、`getWithParams`、`post`、`abort` 等现有入口，内部增加平台请求适配，优先兼容微信/抖音/QQ/支付宝/百度等小游戏 `request` 能力，缺失时回退 `XMLHttpRequest`。
- 收紧 HTTP 请求契约：统一 URL 拼接、query 编码、重复请求缓存、超时、取消、状态码和 JSON/arraybuffer 处理。
- 优化 WebSocket 运行时：保留 `WebSock`/`ISocket` 接口，内部兼容小游戏 `connectSocket` 返回的 socket task 和浏览器 `WebSocket`。
- 优化 `NetNode` 生命周期：网络心跳、收包超时和重连计时进入可清理路径，关闭时清理 pending request、listener、tips 和 socket 回调，避免关闭后回调继续驱动旧状态。
- 文档化 HTTP / WebSocket 在小游戏、浏览器、原生环境下的运行边界、取消语义和错误事件契约。

## Capabilities

### New Capabilities

- `runtime-network-http`: 规范 Tyou HTTP 请求、平台适配、取消、错误事件、WebSocket 连接和 NetNode 生命周期。

### Modified Capabilities

- `framework-runtime`: 补充网络运行时必须在框架模块生命周期内清理定时器、请求缓存和 socket 状态的契约。

## Impact

- 代码影响：`Client/assets/ty-framework/module/http/HttpModule.ts`、`Client/assets/ty-framework/module/network/WebSock.ts`、`NetNode.ts`、`NetInterface.ts`，必要时新增小型内部适配文件。
- 文档影响：新增或同步 `.agents/skills/tyou-dev/references/` 下网络/HTTP 参考，并同步 OpenSpec 主 specs。
- 不修改业务协议格式、服务端约定、Luban、资源索引、Prefab、Scene、meta。
- 不改变业务侧基础用法；已有 `tyou.http.*` 和 `NetManager`/`NetNode` 用法继续可用。

## Context

当前网络层分为两块：

- `tyou.http`：提供 GET/POST/arraybuffer/abort，但直接使用 `XMLHttpRequest`，且 `responseType` 设置时机、失败清理、重复请求缓存和 JSON 解析都比较脆。
- `module/network`：提供 `WebSock`、`NetNode`、`NetManager` 和协议 helper，但 `WebSock` 直接 `new WebSocket()`，只对 `WECHAT` 做二进制分支；`NetNode` 使用原生 `setTimeout/clearTimeout`，关闭后旧回调仍有机会驱动状态。

目标运行环境是 Cocos Creator 3.8.7 客户端，重点要兼容小游戏运行时。小游戏平台通常提供 `wx.request` / `tt.request` / `qq.request` / `my.request` / `swan.request` 和 `connectSocket` / socket task，而不是完整浏览器网络对象。

## Goals / Non-Goals

**Goals:**

- 保持 `tyou.http.get/getWithParams/post/getByArraybuffer/getWithParamsByArraybuffer/abort/onInit` 入口可用。
- HTTP 内部优先使用小游戏平台 request，缺失时回退到 `XMLHttpRequest`。
- HTTP 请求在成功、失败、超时、取消、异常 JSON 解析时都能清理重复请求缓存。
- HTTP GET 使用 query 参数；POST 默认保持 JSON body 行为，避免改变服务端契约。
- WebSocket 内部兼容浏览器 `WebSocket` 和小游戏 `connectSocket` socket task。
- `NetNode` 网络计时器进入可清理路径，关闭后不继续自动重连或重发旧请求。
- 保持 `NetManager`、`NetNode`、`WebSock` 的业务用法不变。

**Non-Goals:**

- 不设计新的服务端协议，不改变 `IProtocolHelper` 的包格式。
- 不把 HTTP 改成强制 Promise API，不要求业务迁移。
- 不新增外部 npm 依赖。
- 不修改 Prefab、Scene、meta、Luban 或资源索引。
- 不解决服务端业务错误码含义，只统一客户端传递的错误事件。

## Decisions

1. **HTTP 使用薄平台适配层**

   在 `HttpModule` 内部做运行时能力探测：优先查找 `wx`、`tt`、`qq`、`my`、`swan`、`qg`、`ks`、`jd`、`hbs` 等全局对象的 `request`，并兼容支付宝 `my.request` 的 header/dataType 差异；找不到平台能力时使用 `XMLHttpRequest`。

   这样避免直接 import 平台 SDK 或依赖 `cc/env` 单个平台常量，小游戏包和浏览器包都能运行。

2. **HTTP 请求记录以 key 管理**

   用 method + finalUrl + body signature + responseType 作为请求 key。重复请求仍沿用旧行为：发现同 key in-flight 时 warning 并忽略新请求。请求完成、失败、超时、取消都会走 `finishRequest()` 清理。

3. **HTTP 响应解析保持兼容但更稳**

   `arraybuffer` 直接回调原始响应；普通响应若是字符串则尝试 JSON.parse，若已是对象直接使用。保持既有 `code === 0 -> complete(data.data)`、`code != 0 -> error(data)` 语义；没有 `code` 字段则完整返回。

4. **WebSock 使用 socket handle 抽象**

   `WebSock` 内部不暴露新类，只保存浏览器 WebSocket 或平台 socket task。平台分支用 `connectSocket`，事件绑定用 `onOpen/onMessage/onError/onClose`；浏览器分支仍用 `onopen/onmessage/onerror/onclose`。

5. **NetNode 计时器先收敛，不重写状态机**

   本次不重写重连队列和协议状态机，只把 timer id 管理、关闭后的重连标记、socket 回调清理、请求/监听释放做扎实。后续如果要做 request timeout、ack id、多通道 QoS，可另开变更。

## Risks / Trade-offs

- [Risk] 小游戏平台 request 参数有细节差异。→ Mitigation：适配层只使用各平台共同能力：`url/method/data/header/timeout/responseType/success/fail/complete`，并对取消能力做存在性判断。
- [Risk] POST query 与 body 行为改变会影响服务端。→ Mitigation：POST 仍使用原始 `url` 和 JSON body，GET 才拼 query。
- [Risk] WebSocket 平台 task 和浏览器事件对象字段不同。→ Mitigation：事件直接透传给上层；消息只统一取 `event.data`。
- [Risk] 全量 TypeScript 可能继续被项目既有 Cocos/扩展声明阻断。→ Mitigation：运行 OpenSpec、静态搜索、`git diff --check`，并过滤 `ty-framework/module/http|network` 路径确认本次错误。

## Migration Plan

1. 创建 HTTP 平台适配和请求记录管理，保持旧入口。
2. 优化 WebSock 平台适配和 close/callback 清理。
3. 优化 NetNode timer 与关闭语义。
4. 同步 topic reference 与 OpenSpec 主 specs。
5. 验证 OpenSpec、静态搜索、TypeScript 可承受检查、sensor 和 diff check；满足条件后归档。

## Open Questions

无阻塞问题。开发者已授权在确认小游戏可兼容的前提下优化 Network / HTTP 模块。

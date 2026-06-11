# Network / HTTP

## 入口

- HTTP：`tyou.http`
- WebSocket：`WebSock` + `NetNode` + `NetManager`

HTTP 仍使用回调式旧入口：

```ts
tyou.http.get("api/name", onComplete, onError);
tyou.http.getWithParams("api/name", {id: 1}, onComplete, onError);
tyou.http.post("api/name", {id: 1}, onComplete, onError);
tyou.http.abort("api/name");
```

## 小游戏兼容

HTTP 运行时会优先探测全局小游戏平台对象的 `request`，例如 `wx`、`tt`、`qq`、`my`、`swan`、`qg`、`ks`、`jd`、`hbs`。找不到平台 request 时回退 `XMLHttpRequest`。

WebSocket 运行时会优先探测同类平台对象的 `connectSocket`，找不到时回退浏览器 `WebSocket`。业务仍通过 `WebSock` 实现 `ISocket`，再交给 `NetNode`。

## HTTP 语义

- `GET` 使用 query 参数。
- `POST` 默认发送 JSON body。
- 普通响应会尝试解析 JSON；`arraybuffer` 响应直接返回原始数据。
- 响应对象包含 `code` 字段时沿用旧约定：`code === 0` 回调 `data.data`，其他 `code` 进入错误回调。
- 重复请求判断使用 method、最终 URL、body 和 responseType；相同请求 in-flight 时不会重复发送。
- 成功、失败、超时、取消、解析失败都必须清理 in-flight 缓存。

## 错误事件

`errorCallback` 收到对象，常用字段：

- `event`：`HttpEvent.NO_NETWORK`、`UNKNOWN_ERROR`、`TIMEOUT`、`ABORT`、`HTTP_ERROR`、`PARSE_ERROR`
- `url`：基础 URL
- `finalUrl`：GET 拼 query 后的 URL
- `params`：调用时传入参数
- `statusCode`：平台或 XHR 返回的状态码
- `raw`：平台原始错误、HTTP 原始响应或解析异常

## 生命周期

- `tyou.http.onDestroy()` 会取消并清理所有 in-flight 请求；框架销毁时由 `Tyou.onDestroy()` 调用。
- `NetNode.close()` 会清理心跳、收包超时、重连 timer、pending request、listener 和网络提示。
- `NetManager.close()` 是完整关闭语义；如果只想断底层 socket 并保留当前节点状态，直接使用具体 `NetNode.closeSocket()`。
- `NetManager.removeNetNode()` 会先关闭节点再移除，避免 orphan timer。

## 修改约束

- 不要在网络模块里直接散落 `setTimeout/clearTimeout`；网络计时器必须由 `NetNode` 生命周期清理。
- 不要为单个平台写硬编码分支，优先走运行时能力探测。
- 不要在本模块修改业务协议结构；协议格式属于 `IProtocolHelper` 和服务端协作范围。

## 1. HTTP runtime

- [x] 1.1 重构 `HttpModule` 请求记录和 URL/query/body 构造，保持旧回调 API 不变。
- [x] 1.2 增加小游戏平台 request 适配和 XMLHttpRequest 回退，统一成功、失败、超时、取消、解析错误的清理路径。
- [x] 1.3 优化 `abort(name)` 与 `onDestroy()`，确保匹配请求可跨平台取消并释放缓存。

## 2. WebSocket and NetNode runtime

- [x] 2.1 优化 `WebSock`，兼容小游戏 `connectSocket` socket task 与浏览器 `WebSocket`，关闭时清理回调引用。
- [x] 2.2 优化 `NetNode` 计时器、关闭和 stale socket 事件保护，避免关闭后重连或重发旧请求。
- [x] 2.3 复核 `NetInterface`/`NetManager` 是否需要最小类型调整，并保持业务用法兼容。

## 3. Contracts and references

- [x] 3.1 同步 `.agents/skills/tyou-dev/references/` 网络/HTTP 参考，文档化小游戏兼容、错误事件、取消和生命周期契约。
- [x] 3.2 同步 OpenSpec 主 specs：新增 `runtime-network-http`，并补充 `framework-runtime` 网络生命周期契约。

## 4. Validation and archive

- [x] 4.1 运行 OpenSpec、静态搜索、TypeScript 可承受检查、可观测性 sensor 和 `git diff --check`。
- [x] 4.2 满足归档条件后归档 change，并归档后复验 OpenSpec。

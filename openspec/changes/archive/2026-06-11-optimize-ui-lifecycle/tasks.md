## 1. UI lifecycle and loading

- [x] 1.1 增强 `UIWindow` 加载/创建/销毁状态，确保 load null、关闭加载中窗口、销毁后加载完成都能收敛。
- [x] 1.2 增强 `UIModule.showUIAsync` 同名窗口 in-flight 合并、最后参数刷新、加载失败清理和关闭取消逻辑。
- [x] 1.3 统一 `closeWindow`、`hideWindow`、`closeAll` 的栈、实例表、隐藏定时器和可见性刷新路径。

## 2. UI bind diagnostics and event cleanup

- [x] 2.1 优化 UI 节点扫描，避免重名绑定节点静默覆盖，并记录可读节点路径。
- [x] 2.2 增加 `getRequired`、`getAll`、`getByPath` 等易用诊断 API，并保持 `get(name)` 兼容。
- [x] 2.3 对齐运行时绑定前缀和 `ui-component-config.json`，并让按钮防抖计时器进入 UI 释放路径。

## 3. Backdrop and Tip lifecycle

- [x] 3.1 增强模糊背景刷新版本保护，避免旧刷新覆盖新栈状态。
- [x] 3.2 优化 `TipManager`，确保播放成功、失败或销毁时都归还节点和临时对象。

## 4. Contracts and validation

- [x] 4.1 同步 UI topic references 与主 OpenSpec specs，文档化生命周期、重名诊断和资源释放契约。
- [x] 4.2 运行 OpenSpec、静态搜索、TypeScript 可承受检查、可观测性 sensor 和 `git diff --check`；满足条件后归档 change。

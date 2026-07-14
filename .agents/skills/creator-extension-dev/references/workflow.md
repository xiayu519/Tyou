# Tyou Creator 扩展开发流程

## 目标扩展

| 扩展 | 主要职责 | 默认验证 |
| --- | --- | --- |
| `assetool` | 生成资源索引 | `npm run build` |
| `psd2ccc` | PSD JSON、UI 节点树和图集分析 | `npm run build` |
| `uitscreate` | Prefab 菜单与 UI TypeScript 生成 | `npm run build` |
| `asset-dependency-viewer` | 资源/脚本引用分析与面板 | `npm test` |

在目标扩展目录执行命令。先读当前 `package.json`，脚本发生变化时以文件实际内容为准。

## 入口检查

1. `main`：扩展加载、卸载、消息注册与全局状态。
2. `panels`：面板生命周期、消息传递、持久化状态和公开 UI API。
3. `messages` / `menu`：命令名称、参数、错误反馈和调用方。
4. `scene`：场景进程脚本及其与主进程的通信。
5. `assets` / `hierarchy`：右键菜单上下文、选择集和资源数据库访问。
6. build/test：TypeScript 输出路径、测试夹具、生成文件是否进入版本控制。

## 安全检查

- Creator API 和贡献点以 3.8.7 类型与当前 package schema 为准。
- 不依赖内部 DOM 选择器模拟编辑器 UI；优先使用公开 message、panel、menu 与 scene API。
- 资源扫描要有范围、失败恢复和取消/关闭路径；禁止加载扩展即自动全量扫描。
- 注册的监听器、timer、watcher 和消息桥接必须在 disable/unload 时释放。
- 不改 `library/`、`temp/`、`build/` 等缓存；需要验证生成结果时从源输入重新生成。
- 生成格式变化时同时检查消费者和兼容性，不把生成产物当唯一真相。

## 验证

1. 运行目标 package 的 build/test。
2. 检查 `git diff --check`。
3. 若涉及 Creator 交互，列出可重复的人工步骤：启用扩展、触发入口、观察结果、关闭扩展、确认无持续监听或扫描。

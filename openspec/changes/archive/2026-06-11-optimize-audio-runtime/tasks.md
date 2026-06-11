## 1. Audio runtime

- [x] 1.1 重构 `AudioModule` 缓存记录、in-flight 加载合并和播放引用计数。
- [x] 1.2 统一 AudioSource 获取、抢占、停止、自然结束和回池 reset 路径。
- [x] 1.3 增强 BGM 切换版本保护，并让 `playOneShotSafe(path, volume)` 的 volume 生效。
- [x] 1.4 修复 `forceReleaseAudio`、`stopAll`、`stopByType`、`stopAudio` 等重复释放边界。

## 2. Framework lifecycle

- [x] 2.1 调整 `Tyou.onDestroy()` 销毁顺序，让依赖 `res/timer` 的模块先释放，底层服务后销毁。

## 3. Contracts and references

- [x] 3.1 新增 Audio topic reference，文档化 AudioSource 池、AudioClip 引用、BGM 切换和销毁顺序契约。
- [x] 3.2 同步 OpenSpec 主 specs：新增 `runtime-audio-lifecycle`，补充 `framework-runtime` 与 `runtime-resource-safety`。

## 4. Validation and archive

- [x] 4.1 运行 OpenSpec、静态搜索、TypeScript 可承受检查、可观测性 sensor 和 `git diff --check`。
- [x] 4.2 满足归档条件后归档 change，并归档后复验 OpenSpec。

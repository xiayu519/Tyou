## Why

Audio 模块已经具备 BGM、音效、优先级和 AudioSource 池，但异步加载、重复播放、引用计数、池回收和框架销毁顺序还不够严谨。音频属于高频运行时模块，必须在小游戏 AudioSource 数量受限的前提下保持易用、可控、无泄漏。

## What Changes

- 保持 `tyou.audio.playBGM()`、`playEffect()`、`playOneShotSafe()`、`stopAll()`、`stopByType()`、`setVolume()` 等外部入口可用。
- 优化 `AudioClip` 加载和缓存：同路径 in-flight 加载合并，加载失败可重试，播放失败不泄漏缓存引用。
- 收紧 AudioSource 池语义：复用前统一 reset，停止/抢占/播放结束/销毁都通过同一回收路径，避免重复 decRef。
- 优化 BGM 语义：切换 BGM 时旧 BGM 必须停止并释放，异步旧加载完成后不能覆盖新 BGM。
- 补充音量和播放配置：保留默认行为，同时让一次性音效的 volume 参数真正生效。
- 修正框架销毁顺序：依赖 `res/timer` 的模块先释放，再销毁底层 `res/timer`，避免 Audio/UI/Pool 销毁时资源释放链路失效。
- 文档化 Audio 生命周期、小游戏 Source 上限、资源释放和销毁顺序契约。

## Capabilities

### New Capabilities

- `runtime-audio-lifecycle`: 规范 Tyou Audio 运行时的播放、池复用、缓存、引用计数、优先级、BGM 切换和释放契约。

### Modified Capabilities

- `framework-runtime`: 补充框架销毁顺序必须让依赖资源/计时器的上层模块先释放的契约。
- `runtime-resource-safety`: 明确 AudioClip 缓存和播放引用必须按 add/ref release 成对释放。

## Impact

- 代码影响：`Client/assets/ty-framework/module/audio/AudioModule.ts`、`Client/assets/ty-framework/Tyou.ts`。
- 文档影响：新增或同步 `.agents/skills/tyou-dev/references/audio-lifecycle.md`，同步 OpenSpec 主 specs。
- 不修改资源索引、Luban、Prefab、Scene、meta，不改变业务音频路径命名。
- 不引入外部依赖，不要求业务迁移到复杂句柄/lease API。

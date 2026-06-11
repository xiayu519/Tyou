## Context

当前 `AudioModule` 负责创建 `AudioSource` 池、加载 `AudioClip`、播放 BGM/音效、优先级抢占、停止和释放缓存。已有 API 简单，但内部存在几个长期风险：

- `playAudio()` 异步加载完成后没有请求版本保护，旧 BGM 加载完成后可能覆盖新 BGM。
- 同一路径并发播放会重复发起加载，缺少 in-flight 合并。
- `AudioCache.refCount` 同时承担缓存和播放引用，若停止/抢占/播放结束多路径重复回收，容易 decRef 不一致。
- `forceReleaseAudio()` 在已停止并从缓存删除后仍可能对旧 cache 再次 decRef。
- `_activeAudios.forEach()` 中直接回收会修改同一个 Map，边界不够稳。
- `Tyou.onDestroy()` 当前先销毁 `res/timer`，再销毁 `audio/ui/pool` 等上层模块，不利于资源和计时器释放链路。

约束：

- 保持业务入口简单，不要求业务持有音频句柄。
- 不新增外部依赖，不改资源索引或音频资源命名。
- 遵守小游戏 AudioSource 数量受限的现实，池上限仍保守。

## Goals / Non-Goals

**Goals:**

- 保留现有 Audio 公共 API。
- 同路径 `AudioClip` 加载中复用 Promise，失败后可重试。
- 播放成功才增加播放引用，回收路径只释放一次。
- BGM 切换有版本保护，旧异步请求完成后不会覆盖新 BGM。
- `playOneShotSafe(path, volume)` 的 volume 参数生效。
- 所有停止、抢占、播放结束、销毁都走同一回收路径。
- 修正框架销毁顺序，让依赖 `res/timer` 的模块先释放。

**Non-Goals:**

- 不新增复杂音频句柄系统。
- 不实现音频淡入淡出、混音总线、ducking 或分组 mute。
- 不改变服务端/资源表/资源索引。
- 不根据平台拆分原生音频后端。

## Decisions

1. **AudioClip cache 分离加载 Promise 和播放引用**

   缓存记录保留 `clip/refCount/lastUsedTime/loading`。同路径加载中返回同一个 Promise；加载失败删除 loading 状态。播放成功后 `_addAudioRef()`，回收时 `_releaseAudioRef()`，播放失败不增加引用。

2. **AudioSource 活跃记录增加 played 标记**

   活跃记录保存 `config` 和 `clipKey`，回收时以 AudioSource 是否仍在 active map 为准，保证多入口重复回收只执行一次。

3. **BGM 使用请求版本**

   每次 `playBGM()` 递增 `_bgmRequestVersion`，旧异步加载完成后如果版本不匹配，则放弃播放并不占用 AudioSource。

4. **池复用前 reset AudioSource**

   回池时停止播放、清空 `clip/loop/volume`，复用时重新设置，避免旧音量、循环状态或 clip 泄漏到新播放。

5. **框架销毁顺序按依赖倒序**

   `Tyou.onDestroy()` 先销毁 UI/Audio/Pool/Scene/Table 等上层模块，再销毁 `http/storage/i18n/event/fsm/update/timer/res`。这样上层模块在释放时还能调用 `tyou.res.decRef()` 和 `tyou.timer.removeTimer()`。

## Risks / Trade-offs

- [Risk] 修改销毁顺序可能暴露其他模块销毁时的隐式依赖。→ Mitigation：按“使用方先释放，底层最后释放”原则排序，并跑 TypeScript 过滤和 OpenSpec 验证。
- [Risk] 同路径加载合并会改变极端情况下的加载次数。→ Mitigation：只合并同一路径同一资源的 in-flight，不改变播放次数。
- [Risk] 不提供句柄意味着单个音效仍只能通过 path/type 或 AudioSource 停止。→ Mitigation：保持现有易用性，本次不引入复杂 API。

## Migration Plan

1. 重构 `AudioModule` 内部 cache/active/pool 记录，保持外部 API。
2. 修正 `Tyou.onDestroy()` 销毁顺序。
3. 同步 Audio topic reference 和 OpenSpec 主 specs。
4. 运行 OpenSpec、静态搜索、TypeScript 可承受检查、sensor 和 `git diff --check`。
5. 满足条件后归档。

## Open Questions

无阻塞问题。开发者已授权优化 Audio 模块。

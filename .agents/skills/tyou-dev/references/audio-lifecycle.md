# Audio 生命周期

## 入口

所有业务音频通过 `tyou.audio`：

```ts
tyou.audio.playBGM("BGM_Main");
tyou.audio.playEffect("btn_click");
tyou.audio.playOneShotSafe("hit", 0.6);
tyou.audio.stopAll();
tyou.audio.setBGMVolume(0.8);
tyou.audio.setEffectVolume(0.7);
```

## AudioSource 池

- Audio 模块维护内部 `AudioSource` 池，默认预创建 3 个，最大 10 个。
- 小游戏平台通常限制同时播放音频数量，新增音效必须走池，不要业务手写大量 `AudioSource`。
- 池满时只允许高优先级音频抢占低优先级音频；同优先级不会互相抢占。
- AudioSource 回池时会停止播放、清空 `clip`、重置 `loop` 和 `volume`。

## AudioClip 引用

- `tyou.res.loadAssetAsync(path)` 会给资源模块缓存增加引用；Audio 模块在不再缓存该 `AudioClip` 时调用 `tyou.res.decRef(clip)`。
- Audio 模块的 `refCount` 是内部播放引用计数，不要求业务手动 addRef/decRef。
- 同一路径 AudioClip 加载中会复用同一个 in-flight Promise；加载失败会清理记录，后续可重试。
- 播放失败、池满且优先级不足、BGM 旧请求过期，都不能增加播放引用。

## BGM

- `playBGM(path)` 会停止旧 BGM，并递增 BGM 请求版本。
- 如果 `playBGM(a)` 后立刻 `playBGM(b)`，旧请求 `a` 即使后加载完成，也不能成为当前 BGM。
- `stopAll()`、`stopByType(AudioType.BGM)` 和停止循环 BGM 的接口会取消 pending BGM 请求。

## 总音量

- `setBGMVolume(volume)` 和 `setEffectVolume(volume)` 保存当前 Audio 模块生命周期内的总音量，并同时更新已在播放的同类型音频。
- 后续新播放的音频同样应用已设置的总音量；AudioSource 回池时虽然会把自身音量重置为 `1`，再次播放时仍会重新计算有效音量。
- 最终有效音量为“单次播放音量 × 对应类型总音量”。例如 `playOneShotSafe("hit", 0.6)` 且 Effect 总音量为 `0.5` 时，实际音量为 `0.3`。
- Audio 模块不负责把总音量写入本地存档；需要跨启动保存时，由业务通过 `tyou.storage` 读取设置后再调用音量接口。

## 销毁顺序

Audio 销毁依赖 `tyou.res.decRef()`，因此框架销毁时必须先销毁 `tyou.audio`，再销毁 `tyou.res`。同理，依赖 `tyou.timer.removeTimer()` 的模块必须先于 `tyou.timer` 销毁。

## 修改约束

- 不要在业务层直接持有或释放 AudioClip；通过 `tyou.audio` 播放，关闭和销毁由模块统一收敛。
- 不要新增分散的原生 timer 做播放回收；非循环音频结束由 `AudioModule.onUpdate()` 检测并回池。
- 不要为单次音效创建永久节点或永久 AudioSource；如果需要新增播放能力，优先扩展 AudioModule 的配置参数。

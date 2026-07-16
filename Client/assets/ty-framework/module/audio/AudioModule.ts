import {AudioClip, AudioSource, find, Node} from "cc";
import {Module} from "../Module";

export enum AudioType {
    BGM = "bgm",
    EFFECT = "effect"
}

// 声音等级枚举（数值越小优先级越高）
export enum AudioPriority {
    BGM = 0,
    VOICE = 1,
    UI = 2,
    EFFECT = 3,
    LOWEST = 4
}

// 音频配置接口
export interface AudioConfig {
    path: string;
    loop?: boolean;
    type?: AudioType;
    id?: string;
    priority?: number;
    volume?: number;
}

interface AudioCache {
    clip: AudioClip | null;
    loading: Promise<AudioClip | null> | null;
    refCount: number;
    lastUsedTime: number;
}

interface ActiveAudioRecord {
    config: AudioConfig;
    cacheKey: string;
}

export class AudioModule extends Module {
    // 小游戏平台通常限制可同时播放的 AudioSource 数量，保持保守上限。
    private readonly MAX_AUDIO_SOURCES: number = 10;

    private _initPoolSize: number = 3;
    private _audioNode: Node | null = null;
    private _audioPool: AudioSource[] = [];
    private _activeAudios: Map<AudioSource, ActiveAudioRecord> = new Map();
    private _currentBGM: AudioSource | null = null;
    private _audioCache: Map<string, AudioCache> = new Map();
    private _bgmRequestVersion: number = 0;
    private _bgmVolume: number = 1.0;
    private _effectVolume: number = 1.0;
    private _isDestroyed: boolean = false;

    /**
     * 初始化模块
     */
    public onCreate(): void {
        this._isDestroyed = false;
        const node = new Node("AudioModule");
        const parentNode = find("GameRoot");
        if (parentNode) {
            node.setParent(parentNode);
        }
        this._audioNode = node;
        this._initAudioPool();
    }

    /**
     * 销毁模块
     */
    public onDestroy(): void {
        this._isDestroyed = true;
        this.stopAll();
        this._activeAudios.clear();

        for (const audioSource of this._audioPool) {
            this._resetAudioSource(audioSource);
            if (audioSource.node && audioSource.node.isValid) {
                audioSource.node.destroy();
            }
        }
        this._audioPool.length = 0;
        this._currentBGM = null;
        this._bgmRequestVersion++;

        this._clearAllCache();

        if (this._audioNode && this._audioNode.isValid) {
            this._audioNode.destroy();
        }
        this._audioNode = null;
    }

    /**
     * 更新方法
     */
    public onUpdate(dt: number): void {
        if (this._isDestroyed || this._activeAudios.size === 0) {
            return;
        }

        const finished: AudioSource[] = [];
        this._activeAudios.forEach((record, audioSource) => {
            if (!record.config.loop && !audioSource.playing && audioSource.state !== AudioSource.AudioState.PAUSED) {
                finished.push(audioSource);
            }
        });

        for (const audioSource of finished) {
            this._returnToPool(audioSource);
        }
    }

    /**
     * 初始化音频池
     */
    private _initAudioPool(): void {
        const count = Math.min(this._initPoolSize, this.MAX_AUDIO_SOURCES);
        for (let i = 0; i < count; i++) {
            this._createAudioSource();
        }
    }

    /**
     * 创建音频源
     */
    private _createAudioSource(): AudioSource | null {
        if (!this._audioNode || !this._audioNode.isValid) {
            return null;
        }

        const node = new Node(`AudioSource_${this._audioPool.length}`);
        this._audioNode.addChild(node);

        const audioSource = node.addComponent(AudioSource);
        this._resetAudioSource(audioSource);
        this._audioPool.push(audioSource);
        return audioSource;
    }

    /**
     * 获取可用的音频源（支持优先级抢占）
     * @param priority 请求的音频优先级
     */
    private _getAvailableAudioSource(priority: number): AudioSource | null {
        for (const audioSource of this._audioPool) {
            if (!this._activeAudios.has(audioSource)) {
                return audioSource;
            }
        }

        if (this._audioPool.length < this.MAX_AUDIO_SOURCES) {
            return this._createAudioSource();
        }

        let bestCandidate: AudioSource | null = null;
        let lowestPriorityFound = -1;

        this._activeAudios.forEach((record, source) => {
            const currentPriority = record.config.priority ?? AudioPriority.EFFECT;
            if (currentPriority > lowestPriorityFound) {
                lowestPriorityFound = currentPriority;
                bestCandidate = source;
            }
        });

        if (bestCandidate && lowestPriorityFound > priority) {
            this._returnToPool(bestCandidate);
            return bestCandidate;
        }

        return null;
    }

    /**
     * 播放背景音乐
     * BGM 默认为最高优先级
     */
    public playBGM(path: string, loop: boolean = true): void {
        const version = ++this._bgmRequestVersion;
        this._stopCurrentBGM();
        this.playAudio({
            path,
            loop,
            type: AudioType.BGM,
            priority: AudioPriority.BGM
        }, version);
    }

    /**
     * 播放音效
     * @param path 音频路径
     * @param loop 是否循环
     * @param priority 优先级，默认为 EFFECT (3)。对于不重要的声音（如大量小怪脚步），建议传入 AudioPriority.LOWEST (4)
     */
    public playEffect(path: string, loop: boolean = false, priority: number = AudioPriority.EFFECT): void {
        this.playAudio({
            path,
            loop,
            type: AudioType.EFFECT,
            priority
        });
    }

    /**
     * 兼容旧接口：播放一次性音效
     */
    public playOneShotSafe(path: string, volume: number = 1.0): void {
        this.playAudio({
            path,
            loop: false,
            type: AudioType.EFFECT,
            priority: AudioPriority.LOWEST,
            volume
        });
    }

    /**
     * 播放音频核心逻辑
     */
    private async playAudio(config: AudioConfig, bgmVersion?: number): Promise<void> {
        if (this._isDestroyed || !config.path) {
            return;
        }

        const normalizedConfig = this.normalizeConfig(config);
        const {path, type = AudioType.EFFECT, priority = AudioPriority.EFFECT} = normalizedConfig;

        try {
            const audioClip = await this._loadAudioClip(path);
            if (!audioClip || this._isDestroyed) {
                return;
            }

            if (type === AudioType.BGM && bgmVersion !== this._bgmRequestVersion) {
                return;
            }

            const audioSource = this._getAvailableAudioSource(priority);
            if (!audioSource) {
                return;
            }

            if (type === AudioType.BGM && bgmVersion !== this._bgmRequestVersion) {
                this._resetAudioSource(audioSource);
                return;
            }

            const audioId = normalizedConfig.id || `${Date.now()}_${Math.random()}`;
            const activeConfig = {...normalizedConfig, id: audioId, priority};

            this._resetAudioSource(audioSource);
            audioSource.clip = audioClip;
            audioSource.loop = !!activeConfig.loop;
            audioSource.volume = this.getEffectiveVolume(activeConfig);

            this._activeAudios.set(audioSource, {
                config: activeConfig,
                cacheKey: path
            });
            this._addAudioRef(path);

            audioSource.play();

            if (type === AudioType.BGM) {
                this._currentBGM = audioSource;
            }
        } catch (err) {
            console.error(`播放音频失败: path=${path}`, err);
        }
    }

    /**
     * 加载音频剪辑
     */
    private async _loadAudioClip(path: string): Promise<AudioClip | null> {
        const cache = this.getOrCreateCache(path);
        cache.lastUsedTime = Date.now();

        if (cache.clip && cache.clip.isValid) {
            return cache.clip;
        }

        if (cache.loading) {
            return cache.loading;
        }

        cache.loading = this.loadClipInternal(path, cache);
        return cache.loading;
    }

    private async loadClipInternal(path: string, cache: AudioCache): Promise<AudioClip | null> {
        try {
            const clip = await tyou.res.loadAssetAsync(path) as unknown as AudioClip | null;
            if (!clip || !clip.isValid || this._isDestroyed) {
                if (clip && clip.isValid) {
                    tyou.res.decRef(clip);
                }
                this._audioCache.delete(path);
                return null;
            }

            if (this._audioCache.get(path) !== cache) {
                tyou.res.decRef(clip);
                return null;
            }

            cache.clip = clip;
            cache.lastUsedTime = Date.now();
            return clip;
        } catch (err) {
            this._audioCache.delete(path);
            console.error(`加载音频资源失败: ${path}`, err);
            return null;
        } finally {
            if (this._audioCache.get(path) === cache) {
                cache.loading = null;
            }
        }
    }

    /**
     * 添加音频播放引用计数
     */
    private _addAudioRef(path: string): void {
        const cache = this._audioCache.get(path);
        if (!cache) {
            return;
        }
        cache.refCount++;
        cache.lastUsedTime = Date.now();
    }

    /**
     * 释放音频播放引用
     */
    private _releaseAudioRef(path: string): void {
        const cache = this._audioCache.get(path);
        if (!cache) {
            return;
        }

        cache.refCount = Math.max(0, cache.refCount - 1);
        cache.lastUsedTime = Date.now();

        if (cache.refCount === 0 && cache.clip) {
            const clip = cache.clip;
            this._audioCache.delete(path);
            tyou.res.decRef(clip);
        }
    }

    /**
     * 停止所有音频
     */
    public stopAll(): void {
        this._bgmRequestVersion++;
        const sources = Array.from(this._activeAudios.keys());
        for (const audioSource of sources) {
            this._returnToPool(audioSource);
        }
        this._currentBGM = null;
    }

    /**
     * 按类型停止音频
     */
    public stopByType(type: AudioType): void {
        const sources = this.collectSources((record) => record.config.type === type);
        for (const audioSource of sources) {
            this._returnToPool(audioSource);
        }
        if (type === AudioType.BGM) {
            this._currentBGM = null;
            this._bgmRequestVersion++;
        }
    }

    /**
     * 停止指定音频源
     */
    public stopAudio(audioSource: AudioSource): void {
        if (!audioSource) {
            return;
        }
        this._returnToPool(audioSource);
    }

    /**
     * 设置音量
     */
    public setVolume(type: AudioType, volume: number): void {
        const normalizedVolume = this.normalizeVolume(volume);
        if (type === AudioType.BGM) {
            this._bgmVolume = normalizedVolume;
        } else {
            this._effectVolume = normalizedVolume;
        }

        this._activeAudios.forEach((record, audioSource) => {
            if (record.config.type === type) {
                audioSource.volume = this.getEffectiveVolume(record.config);
            }
        });
    }

    /**
     * 设置BGM音量
     */
    public setBGMVolume(volume: number): void {
        this.setVolume(AudioType.BGM, volume);
    }

    /**
     * 设置音效音量
     */
    public setEffectVolume(volume: number): void {
        this.setVolume(AudioType.EFFECT, volume);
    }

    /**
     * 暂停所有音频
     */
    public pauseAll(): void {
        this._activeAudios.forEach((record, audioSource) => {
            audioSource.pause();
        });
    }

    /**
     * 恢复所有音频
     */
    public resumeAll(): void {
        this._activeAudios.forEach((record, audioSource) => {
            if (!audioSource.playing) {
                audioSource.play();
            }
        });
    }

    /**
     * 返回音频源到池中
     */
    private _returnToPool(audioSource: AudioSource): void {
        const record = this._activeAudios.get(audioSource);
        if (!record) {
            this._resetAudioSource(audioSource);
            return;
        }

        this._activeAudios.delete(audioSource);

        if (audioSource === this._currentBGM) {
            this._currentBGM = null;
        }

        this._resetAudioSource(audioSource);
        this._releaseAudioRef(record.cacheKey);
    }

    /**
     * 预加载音频
     */
    public preloadAudios(paths: string[]): void {
        for (const path of paths) {
            tyou.res.preload(path);
        }
    }

    /**
     * 清理所有缓存
     */
    private _clearAllCache(): void {
        this._audioCache.forEach((cache) => {
            if (cache.clip) {
                tyou.res.decRef(cache.clip);
            }
        });
        this._audioCache.clear();
    }

    /**
     * 获取活动音频数量
     */
    public getActiveAudioCount(): number {
        return this._activeAudios.size;
    }

    /**
     * 获取池大小
     */
    public getPoolSize(): number {
        return this._audioPool.length;
    }

    /**
     * 获取缓存大小
     */
    public getCacheSize(): number {
        return this._audioCache.size;
    }

    /**
     * 根据路径停止并返回音频源
     */
    public stopAndReturnByPath(path: string, type?: AudioType): void {
        const sources = this.collectSources((record) => record.config.path === path && (!type || record.config.type === type));
        if (this.hasBGMSource(sources)) {
            this._bgmRequestVersion++;
        }
        for (const audioSource of sources) {
            this._returnToPool(audioSource);
        }
    }

    /**
     * 停止并返回所有循环音频
     */
    public stopAndReturnAllLoop(): void {
        const sources = this.collectSources((record) => !!record.config.loop);
        if (this.hasBGMSource(sources)) {
            this._bgmRequestVersion++;
        }
        for (const audioSource of sources) {
            this._returnToPool(audioSource);
        }
    }

    /**
     * 按类型停止并返回循环音频
     */
    public stopAndReturnLoopByType(type: AudioType): void {
        const sources = this.collectSources((record) => !!record.config.loop && record.config.type === type);
        if (type === AudioType.BGM) {
            this._bgmRequestVersion++;
        }
        for (const audioSource of sources) {
            this._returnToPool(audioSource);
        }
    }

    /**
     * 根据路径获取音频源
     */
    public getAudioSourcesByPath(path: string): AudioSource[] {
        return this.collectSources((record) => record.config.path === path);
    }

    /**
     * 强制释放音频资源
     */
    public forceReleaseAudio(path: string): void {
        this.stopAndReturnByPath(path);

        const cache = this._audioCache.get(path);
        if (!cache) {
            return;
        }

        this._audioCache.delete(path);
        if (cache.clip) {
            tyou.res.decRef(cache.clip);
        }
    }

    private _stopCurrentBGM(): void {
        if (this._currentBGM) {
            this._returnToPool(this._currentBGM);
            this._currentBGM = null;
        }
    }

    private getOrCreateCache(path: string): AudioCache {
        let cache = this._audioCache.get(path);
        if (!cache) {
            cache = {
                clip: null,
                loading: null,
                refCount: 0,
                lastUsedTime: Date.now()
            };
            this._audioCache.set(path, cache);
        }
        return cache;
    }

    private collectSources(predicate: (record: ActiveAudioRecord, source: AudioSource) => boolean): AudioSource[] {
        const sources: AudioSource[] = [];
        this._activeAudios.forEach((record, audioSource) => {
            if (predicate(record, audioSource)) {
                sources.push(audioSource);
            }
        });
        return sources;
    }

    private hasBGMSource(sources: AudioSource[]): boolean {
        return sources.some((source) => this._activeAudios.get(source)?.config.type === AudioType.BGM);
    }

    private normalizeConfig(config: AudioConfig): AudioConfig {
        return {
            ...config,
            loop: !!config.loop,
            type: config.type || AudioType.EFFECT,
            priority: config.priority ?? AudioPriority.EFFECT,
            volume: this.normalizeVolume(config.volume)
        };
    }

    private normalizeVolume(volume: number = 1.0): number {
        if (Number.isNaN(volume)) {
            return 1.0;
        }
        return Math.max(0, Math.min(1, volume));
    }

    private getMasterVolume(type: AudioType = AudioType.EFFECT): number {
        return type === AudioType.BGM ? this._bgmVolume : this._effectVolume;
    }

    private getEffectiveVolume(config: AudioConfig): number {
        const baseVolume = this.normalizeVolume(config.volume);
        const masterVolume = this.getMasterVolume(config.type);
        return this.normalizeVolume(baseVolume * masterVolume);
    }

    private _resetAudioSource(audioSource: AudioSource): void {
        if (!audioSource || !audioSource.isValid) {
            return;
        }

        if (audioSource.playing) {
            audioSource.stop();
        }
        audioSource.clip = null;
        audioSource.loop = false;
        audioSource.volume = 1.0;
    }
}

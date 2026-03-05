import {
    AnimationClip,
    Asset,
    AssetManager,
    AudioClip,
    Font,
    instantiate,
    JsonAsset,
    Node,
    Prefab,
    SceneAsset,
    sp,
    SpriteAtlas,
    SpriteFrame,
    TextAsset
} from "cc";
import {Module} from "../Module";
import {AssetIndexManager} from "./AssetIndexManager";
import {LoaderManager} from "./LoaderManager";
import {ResourceHolder} from "./ResourceHolder";
import {SpineHolder} from "./SpineHolder";

/** 待检查释放资源信息 */
interface PendingReleaseInfo {
    asset: Asset;
    markTime: number; // 加入队列的时间
}

export class ResourceModule extends Module {
    private _typeMap: Map<string, typeof Asset> = new Map();
    loader: LoaderManager = new LoaderManager();
    private _loader;

    // 延迟释放相关配置
    /** 检查释放的时间间隔（秒），在onCreate中通过setReleaseConfig设置 */
    private _releaseCheckInterval: number = 3;
    /** 资源加入队列后的延迟释放时间（秒），给Cocos足够时间清理内部引用 */
    private _releaseDelay: number = 2;
    /** 累计时间 */
    private _elapsedTime: number = 0;
    /** 待释放资源队列 */
    private _pendingReleaseQueue: Map<Asset, PendingReleaseInfo> = new Map();
    /** 是否启用延迟释放 */
    private _enableDelayRelease: boolean = true;

    async onCreate() {
        this._typeMap.set("Prefab", Prefab);
        this._typeMap.set("SpriteFrame", SpriteFrame);
        this._typeMap.set("SpriteAtlas", SpriteAtlas);
        this._typeMap.set("cc.SpriteAtlas", SpriteAtlas);
        this._typeMap.set("AudioClip", AudioClip);
        this._typeMap.set("JsonAsset", JsonAsset);
        this._typeMap.set("Font", Font);
        this._typeMap.set("TextAsset", TextAsset);
        this._typeMap.set("AnimationClip", AnimationClip);
        this._typeMap.set("Scene", SceneAsset);
        this._typeMap.set("sp.SkeletonData", sp.SkeletonData);
        this._loader = new LoaderManager.Loader();

        // 初始化延迟释放配置
        // 检查间隔3秒：平衡性能和内存释放及时性
        // 延迟2秒：给Cocos足够时间清理内部引用（通常1-2帧内完成）
        this.setReleaseConfig(3, 2);

        const _t = Date.now();
        console.log("加载配置事件");
        await AssetIndexManager.instance.initFromBundle("asset-catalog", "asset-index");
        console.log("加载配置事件耗时", Date.now() - _t);
    }

    getBundlesFromAssetIndex() {
        return AssetIndexManager.instance.bundles;
    }



    getPreloadListFromAssetIndex() {
        return AssetIndexManager.instance.getAssetsByMark("preload");
    }

    onDestroy(): void {
        // 清理所有待释放资源
        this._forceReleaseAllPending();
        this._pendingReleaseQueue.clear();
    }

    /**
     * 更新方法 - 检查并释放refCount为0的资源
     * @param dt 帧时间
     */
    public onUpdate(dt: number): void {
        if (!this._enableDelayRelease) return;

        this._elapsedTime += dt;
        if (this._elapsedTime < this._releaseCheckInterval) return;

        this._elapsedTime = 0;
        this._processReleaseQueue();
    }

    /**
     * 设置延迟释放配置
     * @param checkInterval 检查间隔（秒）
     * @param releaseDelay 延迟释放时间（秒）
     */
    public setReleaseConfig(checkInterval: number, releaseDelay: number): void {
        this._releaseCheckInterval = Math.max(0.1, checkInterval);
        this._releaseDelay = Math.max(0, releaseDelay);
    }

    /**
     * 启用/禁用延迟释放
     */
    public setDelayReleaseEnabled(enabled: boolean): void {
        this._enableDelayRelease = enabled;
        if (!enabled) {
            // 禁用时立即释放所有待释放资源
            this._forceReleaseAllPending();
        }
    }

    /**
     * 获取待释放资源数量
     */
    public getPendingReleaseCount(): number {
        return this._pendingReleaseQueue.size;
    }

    /**
     * 强制立即释放所有待释放资源
     */
    public forceReleaseAllPending(): void {
        this._forceReleaseAllPending();
    }

    /** 内部方法：强制释放所有待释放资源 */
    private _forceReleaseAllPending(): void {
        for (const [asset, info] of this._pendingReleaseQueue) {
            if (asset && asset.isValid && asset.refCount === 0) {
                this._loader.releaseCache(asset);
                this.log("ForceRelease", asset.name);
            }
        }
        this._pendingReleaseQueue.clear();
    }

    /** 处理释放队列 */
    private _processReleaseQueue(): void {
        const currentTime = Date.now();
        const toRemove: Asset[] = [];

        for (const [asset, info] of this._pendingReleaseQueue) {
            // 检查资源是否有效
            if (!asset || !asset.isValid) {
                toRemove.push(asset);
                continue;
            }

            // refCount > 0，资源还在使用中，继续等待
            // 可能是：1. 资源被重新addRef  2. Cocos内部引用还没清除
            if (asset.refCount > 0) {
                continue; // 继续保留在队列中，下次再检查
            }

            // refCount === 0，检查是否超过延迟时间
            const elapsed = (currentTime - info.markTime) / 1000;
            if (elapsed >= this._releaseDelay) {
                // 真正释放资源
                this._loader.releaseCache(asset);
                this.log("DelayRelease", asset.name, "after", elapsed.toFixed(2), "s");
                toRemove.push(asset);
            }
        }

        // 从队列中移除已处理的资源
        for (const asset of toRemove) {
            this._pendingReleaseQueue.delete(asset);
        }
    }


    getBundle(bundle?: string): AssetManager.Bundle {
        return this.loader.getBundle(bundle);
    }

    loadAssetAsync<T extends typeof Asset>(path: string, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void, onComplete?: (item: (InstanceType<T> | null)) => void): Promise<InstanceType<T> | null>;

    loadAssetAsync<T extends typeof Asset>(args: {
        params: {
            path: string;
            bundle?: string;
            version?: string;
            type?: T;
            onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
            onComplete?: (item: (InstanceType<T> | null)) => void
        }
    }): Promise<InstanceType<T> | null>;

    loadAssetAsync<T extends typeof Asset>(params: {
        path: string;
        bundle?: string;
        version?: string;
        type?: T;
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
        onComplete?: (item: (InstanceType<T> | null)) => void
    }): Promise<InstanceType<T> | null>;

    async loadAssetAsync<T extends typeof Asset>(args: any): Promise<InstanceType<T> | null> {
        const info = this.getInfo(args);
        const promise = this._loader.loadAsync(info);
        try {
            const asset = await promise;
            return asset as InstanceType<T> || null;
        } catch (error) {
            console.error("资源加载失败", info.path, error);
            return null;
        }
    }

    loadBundle({bundle, version, onComplete}: {
        bundle?: string,
        version?: string,
        onComplete?: (bundle: AssetManager.Bundle | null) => any
    }) {
        this.loader.loadBundle({bundle, version, onComplete});
    }

    loadBundleAsync(params: { bundle?: string; version?: string }): Promise<AssetManager.Bundle | null> {
        return this.loader.loadBundleAsync(params);
    }

    loadRemoteAsync(params: { url: string; ext?: string }): Promise<Asset | null> {
        return this._loader.loadRemoteAsync(params);
    }

    preload(path: string, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void, onComplete?: (item: (AssetManager.RequestItem[] | null)) => void): void;
    preload(params: {
        params: {
            path: string;
            bundle?: string;
            version?: string;
            type?: any;
            onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
            onComplete?: (item: (AssetManager.RequestItem[] | null)) => void
        }
    }): void;

    preload(args: any): void {
        const info = this.getInfo(args);
        this._loader.preload(info);
    }

    preloadDir(
        params: {
            path: string;
            bundle?: string;
            version?: string;
            type?: any;
            onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
            onComplete?: (item: (AssetManager.RequestItem[] | null)) => void
        }
    ): void {
        this._loader.preloadDir(params);
    }

    release({path, bundle, type}: { path: string; bundle?: string; type?: any }): void {
        this.loader.release({path, bundle, type});
    }

    releaseAll(bundle?: string): void {
        this._loader.releaseAll(bundle);
    }

    releaseUnused(bundle?: string): void {
        this.loader.releaseUnused(bundle);
    }

    reloadBundleAsync(params: { bundle?: string; version?: string }): Promise<AssetManager.Bundle | null> {
        return this.loader.reloadBundleAsync(params);
    }

    removeBundle(bundle?: string): void {
        this.loader.removeBundle(bundle);
    }

    loadDirAsync<T extends typeof Asset>(params: {
        path: string;
        bundle?: string;
        version?: string;
        type?: T;
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
        onComplete?: (item: (InstanceType<T> | null)) => void
    }): Promise<InstanceType<T>[] | null> {
        return this._loader.loadDirAsync(params);
    }

    //只能用prefab类型
    async loadGameObjectAsync(path: string, parent?: Node, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void) {
        const promise = this.loadAssetAsync(path, version, onProgress);
        try {
            const asset = await promise;
            const prefab = instantiate(asset as unknown as Prefab);
            const holder = prefab.addComponent(ResourceHolder);
            holder.init(asset);
            if (parent) {
                prefab.parent = parent;
            }
            return prefab;
        } catch (error) {
            console.error("LoadGameObjectAsync", path, error);
            return null;
        }
    }

    async loadSprite(path: string, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void) {
        const promise = this.loadAssetAsync(path, version, onProgress);
        try {
            const sprite = await promise as unknown as SpriteFrame;
            return sprite;
        } catch (error) {
            console.error("loadSprite", path, error);
            return null;
        }
    }

    async loadAtlas(path: string, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void) {
        const promise = this.loadAssetAsync(path, version, onProgress);
        try {
            const atlas = await promise as unknown as SpriteAtlas;
            return atlas;
        } catch (error) {
            console.error("loadAtlas", path, error);
            return null;
        }
    }

    async loadPlistAtlas(path: string, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void) {
        return this.loadAtlas(path, version, onProgress);
    }

    async loadSpriteFromAtlas(atlasName: string, spriteFrameName: string, version?: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void) {
        const atlas = await this.loadAtlas(atlasName, version, onProgress);
        if (!atlas) {
            return null;
        }
        const spriteFrame = atlas.getSpriteFrame(spriteFrameName);
        if (!spriteFrame) {
            console.warn("loadSpriteFromAtlas: spriteFrame not found", atlasName, spriteFrameName);
            return null;
        }
        return spriteFrame;
    }

    private getInfo<T extends typeof Asset>(...args: any[]): {
        path: string;
        bundle?: string;
        version?: string;
        type?: T;
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
        onComplete?: (item: InstanceType<T> | null) => void;
    } {
        if (typeof args[0] === 'string') {
            const name = args[0];
            const info = AssetIndexManager.instance.getAssetInfo(name);
            let path = info.path;
            const bundle = info.bundle;
            const type = this._typeMap.get(info.type);
            if (type === SpriteFrame) {
                path += "/spriteFrame";
            }
            const version = args[1];
            const onProgress = args[2];
            const onComplete = args[3];
            return {
                path: path,
                bundle: bundle,
                version: version,
                type: type as T,
                onProgress: onProgress,
                onComplete: onComplete,
            }

        } else {
            const raw = args[0];
            if (raw && typeof raw === "object" && raw.params) {
                return raw.params;
            }
            return raw;
        }
    }

    async loadSpineAsync(target: sp.Skeleton, path: string, isAutoRelease = true) {
        const sd = await this.loadAssetAsync(path) as unknown as sp.SkeletonData;
        target.skeletonData = sd;
        if (isAutoRelease) {
            const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
            holder.init(target, sd, false, false, false)
        }
    }

    async loadSpineEffectAsync(target: sp.Skeleton, path: string, isAutoRelease = true, isLoop = false) {
        const sd = await this.loadAssetAsync(path) as unknown as sp.SkeletonData;
        target.skeletonData = sd;
        if (isAutoRelease) {
            const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
            holder.init(target, sd, true, true, isLoop)
        }
    }

    //方便统计
    public addRef(asset: Asset): void {
        asset.addRef();
        this.log("AddRef", asset.name, asset.refCount);

        // 如果资源在待检查队列中，移除它（资源被重新使用）
        if (this._pendingReleaseQueue.has(asset)) {
            this._pendingReleaseQueue.delete(asset);
            this.log("RemoveFromPendingRelease", asset.name);
        }
    }

    /**
     * 减少资源引用计数
     * 
     * 设计说明：
     * 由于Cocos的资源引用机制，当UI关闭时我们调用decRef，但Cocos内部的引用
     * 可能要等到下一帧或更晚才会被清除。因此我们采用"延迟检查"策略：
     * - 只要调用过decRef，资源就会加入待检查队列
     * - 在onUpdate中定期检查队列中的资源
     * - 当资源的refCount变为0时，才真正释放
     * 
     * @param asset 要减少引用的资源
     */
    public decRef(asset: Asset): void {
        if (!asset || !asset.isValid) return;

        if (asset.refCount > 0) {
            asset.decRef();
        }
        this.log("DecRef", asset.name, asset.refCount);

        if (this._enableDelayRelease) {
            // 无论refCount是否为0，都加入待检查队列
            // 因为Cocos内部引用可能还没清除，refCount可能稍后才变为0
            if (!this._pendingReleaseQueue.has(asset)) {
                this._pendingReleaseQueue.set(asset, {
                    asset: asset,
                    markTime: Date.now()
                });
                this.log("AddToPendingCheck", asset.name, "refCount:", asset.refCount);
            }
        } else {
            // 禁用延迟释放时，只有refCount为0才立即释放
            if (asset.refCount === 0) {
                this._loader.releaseCache(asset);
            }
        }
    }
}



import {
    Asset,
    AssetManager,
    instantiate,
    Node,
    Prefab,
    sp,
    Sprite,
    SpriteAtlas,
    SpriteFrame
} from "cc";
import {Module} from "../Module";
import {AssetIndexManager} from "./AssetIndexManager";
import {AssetPathResolver} from "./AssetPathResolver";
import {AssetTypeRegistry} from "./AssetTypeRegistry";
import {BundleService} from "./BundleService";
import {ManagedAssetLoader} from "./ManagedAssetLoader";
import {ReleaseScheduler} from "./ReleaseScheduler";
import {ResourceHolder} from "./ResourceHolder";
import {SpineHolder} from "./SpineHolder";
import {SpriteAssignService} from "./SpriteAssignService";

export interface SetSpriteAsyncParams {
    target: Sprite;
    path?: string;
    url?: string;
    ext?: string;
    version?: string;
    onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
    onComplete?: (success: boolean, spriteFrame?: SpriteFrame | null) => void;
    isValidOwner?: () => boolean;
}

export interface LoadRemoteBundleSpineDataAsyncParams {
    path: string;
    bundle?: string;
    version?: string;
    onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
}

export class ResourceModule extends Module {
    private _typeRegistry: AssetTypeRegistry;
    private _resolver: AssetPathResolver;
    private _bundleService: BundleService;
    private _loader: ManagedAssetLoader;
    private _releaseScheduler: ReleaseScheduler;
    private _spriteAssignService: SpriteAssignService;

    constructor() {
        super();
        this._typeRegistry = new AssetTypeRegistry();
        this._resolver = new AssetPathResolver(this._typeRegistry);
        this._bundleService = new BundleService();
        this._releaseScheduler = new ReleaseScheduler(
            (asset) => this._loader.releaseManagedAsset(asset),
            (...args) => this.log(...args)
        );
        this._loader = new ManagedAssetLoader(this._bundleService, this._releaseScheduler);
        this._spriteAssignService = new SpriteAssignService(
            (params) => this._loader.loadRemoteSpriteFrameAsync(params),
            (path, version, onProgress) => this.loadSprite(path, version, onProgress),
            (asset) => this.decRef(asset)
        );
    }

    async onCreate() {
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
        this._releaseScheduler.destroy();
    }

    public onUpdate(dt: number): void {
        this._releaseScheduler.update(dt);
    }

    public setReleaseConfig(checkInterval: number, releaseDelay: number): void {
        this._releaseScheduler.setReleaseConfig(checkInterval, releaseDelay);
    }

    public setDelayReleaseEnabled(enabled: boolean): void {
        this._releaseScheduler.setDelayReleaseEnabled(enabled);
    }

    public getPendingReleaseCount(): number {
        return this._releaseScheduler.getPendingReleaseCount();
    }

    public forceReleaseAllPending(): void {
        this._releaseScheduler.forceReleaseAllPending();
    }

    getBundle(bundle?: string): AssetManager.Bundle {
        return this._bundleService.getBundle(bundle);
    }

    loadAssetAsync<T extends typeof Asset>(
        path: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void,
        onComplete?: (item: (InstanceType<T> | null)) => void
    ): Promise<InstanceType<T> | null>;

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

    async loadAssetAsync<T extends typeof Asset>(...args: any[]): Promise<InstanceType<T> | null> {
        const info = this._resolver.resolve<T>(args);
        try {
            const asset = await this._loader.loadAssetAsync(info);
            return asset as InstanceType<T> || null;
        } catch (error) {
            console.error("资源加载失败", info.path, error);
            info.onComplete?.(null);
            return null;
        }
    }

    loadBundle({bundle, version, onComplete}: {
        bundle?: string,
        version?: string,
        onComplete?: (bundle: AssetManager.Bundle | null) => any
    }) {
        this._bundleService.loadBundle({bundle, version, onComplete});
    }

    loadBundleAsync(params: { bundle?: string; version?: string }): Promise<AssetManager.Bundle | null> {
        return this._bundleService.loadBundleAsync(params);
    }

    loadRemoteAsync(params: { url: string; ext?: string }): Promise<Asset | null> {
        return this._loader.loadRemoteAsync(params);
    }

    async loadRemoteBundleSpineDataAsync(params: LoadRemoteBundleSpineDataAsyncParams): Promise<sp.SkeletonData | null> {
        if (!params?.path) {
            return null;
        }

        const resolved = this.resolveSpineBundleAsset(params.path, params.bundle);
        if (!resolved.bundle) {
            console.error("[ResourceModule] loadRemoteBundleSpineDataAsync bundle is empty", params.path);
            return null;
        }

        const loadedBundle = await this.loadBundleAsync({
            bundle: resolved.bundle,
            version: params.version,
        });
        if (!loadedBundle) {
            console.error("[ResourceModule] loadRemoteBundleSpineDataAsync load bundle fail", resolved.bundle, params.path);
            return null;
        }

        return await this.loadAssetAsync({
            path: resolved.path,
            bundle: resolved.bundle,
            version: params.version,
            type: sp.SkeletonData,
            onProgress: params.onProgress,
        }) as sp.SkeletonData | null;
    }

    preload(
        path: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void,
        onComplete?: (item: (AssetManager.RequestItem[] | null)) => void
    ): void;

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

    preload(...args: any[]): void {
        const info = this._resolver.resolve(args);
        this._loader.preload(info as any);
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
        this._bundleService.release({path, bundle, type});
    }

    releaseAll(bundle?: string): void {
        this._loader.releaseAll(bundle);
    }

    releaseUnused(bundle?: string): void {
        this._bundleService.releaseUnused(bundle);
    }

    reloadBundleAsync(params: { bundle?: string; version?: string }): Promise<AssetManager.Bundle | null> {
        return this._bundleService.reloadBundleAsync(params);
    }

    removeBundle(bundle?: string): void {
        this._bundleService.removeBundle(bundle);
    }

    loadDirAsync<T extends typeof Asset>(params: {
        path: string;
        bundle?: string;
        version?: string;
        type?: T;
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void;
        onComplete?: (item: (InstanceType<T>[] | null)) => void
    }): Promise<InstanceType<T>[] | null> {
        return this._loader.loadDirAsync(params);
    }

    async loadGameObjectAsync(
        path: string,
        parent?: Node,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void
    ) {
        let asset: Asset | null = null;
        let prefab: Node | null = null;
        let holderInitialized = false;
        try {
            asset = await this.loadAssetAsync(path, version, onProgress);
            if (!asset) return null;

            prefab = instantiate(asset as unknown as Prefab);
            const holder = prefab.addComponent(ResourceHolder);
            holder.init(asset);
            holderInitialized = true;
            if (parent && !parent.isValid) {
                prefab.destroy();
                return null;
            }
            if (parent) {
                prefab.parent = parent;
            }
            return prefab;
        } catch (error) {
            if (prefab && prefab.isValid) {
                prefab.destroy();
            }
            if (asset && !holderInitialized) {
                this.decRef(asset);
            }
            console.error("LoadGameObjectAsync", path, error);
            return null;
        }
    }

    async loadSprite(
        path: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void
    ) {
        try {
            const sprite = await this.loadAssetAsync(path, version, onProgress) as unknown as SpriteFrame;
            return sprite;
        } catch (error) {
            console.error("loadSprite", path, error);
            return null;
        }
    }

    async loadAtlas(
        path: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void
    ) {
        try {
            const atlas = await this.loadAssetAsync(path, version, onProgress) as unknown as SpriteAtlas;
            return atlas;
        } catch (error) {
            console.error("loadAtlas", path, error);
            return null;
        }
    }

    async loadPlistAtlas(
        path: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void
    ) {
        return this.loadAtlas(path, version, onProgress);
    }

    async loadSpriteFromAtlas(
        atlasName: string,
        spriteFrameName: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void
    ) {
        const atlas = await this.loadAtlas(atlasName, version, onProgress);
        if (!atlas) {
            return null;
        }

        const spriteFrame = atlas.getSpriteFrame(spriteFrameName);
        if (!spriteFrame) {
            console.warn("loadSpriteFromAtlas: spriteFrame not found", atlasName, spriteFrameName);
            this.decRef(atlas);
            return null;
        }
        this.addRef(spriteFrame);
        this.decRef(atlas);
        return spriteFrame;
    }

    async setSpriteAsync(params: SetSpriteAsyncParams): Promise<SpriteFrame | null> {
        return this._spriteAssignService.setSpriteAsync(params);
    }

    async loadRemoteBundleSpineAsync(
        target: sp.Skeleton,
        path: string,
        bundle?: string,
        version?: string,
        isAutoRelease = true
    ): Promise<sp.SkeletonData | null> {
        const sd = await this.loadRemoteBundleSpineDataAsync({path, bundle, version});
        return this.assignSpineData(target, sd, path, isAutoRelease, false, false, false, "loadRemoteBundleSpineAsync");
    }

    async loadRemoteBundleSpineEffectAsync(
        target: sp.Skeleton,
        path: string,
        bundle?: string,
        version?: string,
        isAutoRelease = true,
        isLoop = false
    ): Promise<sp.SkeletonData | null> {
        const sd = await this.loadRemoteBundleSpineDataAsync({path, bundle, version});
        return this.assignSpineData(target, sd, path, isAutoRelease, true, true, isLoop, "loadRemoteBundleSpineEffectAsync");
    }

    async loadSpineAsync(target: sp.Skeleton, path: string, isAutoRelease = true) {
        const sd = await this.loadAssetAsync(path) as unknown as sp.SkeletonData | null;
        if (!sd) return;

        if (!target || !target.isValid || !target.node?.isValid) {
            this.decRef(sd);
            return;
        }

        try {
            target.skeletonData = sd;
            if (isAutoRelease) {
                const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
                holder.init(target, sd, false, false, false);
            }
        } catch (error) {
            if (target && target.isValid) {
                target.skeletonData = null;
            }
            this.decRef(sd);
            console.error("loadSpineAsync", path, error);
        }
    }

    async loadSpineEffectAsync(target: sp.Skeleton, path: string, isAutoRelease = true, isLoop = false) {
        const sd = await this.loadAssetAsync(path) as unknown as sp.SkeletonData | null;
        if (!sd) return;

        if (!target || !target.isValid || !target.node?.isValid) {
            this.decRef(sd);
            return;
        }

        try {
            target.skeletonData = sd;
            if (isAutoRelease) {
                const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
                holder.init(target, sd, true, true, isLoop);
            }
        } catch (error) {
            if (target && target.isValid) {
                target.skeletonData = null;
            }
            this.decRef(sd);
            console.error("loadSpineEffectAsync", path, error);
        }
    }

    public addRef(asset: Asset): void {
        this._releaseScheduler.addRef(asset);
    }

    public decRef(asset: Asset): void {
        this._releaseScheduler.decRef(asset);
    }

    private resolveSpineBundleAsset(path: string, bundle?: string): { path: string; bundle?: string } {
        const info = AssetIndexManager.instance.getAssetInfo(path) || AssetIndexManager.instance.getAssetByPath(path);
        if (info && bundle && info.bundle && info.bundle !== bundle) {
            console.warn("[ResourceModule] Spine asset bundle mismatch", path, info.bundle, bundle);
        }

        return {
            path: info?.path || path,
            bundle: bundle || info?.bundle,
        };
    }

    private assignSpineData(
        target: sp.Skeleton,
        sd: sp.SkeletonData | null,
        path: string,
        isAutoRelease: boolean,
        isAutoPlay: boolean,
        isDestroyOnComplete: boolean,
        isLoop: boolean,
        logTag: string
    ): sp.SkeletonData | null {
        if (!sd) return null;

        if (!target || !target.isValid || !target.node?.isValid) {
            this.decRef(sd);
            return null;
        }

        try {
            target.skeletonData = sd;
            if (isAutoRelease) {
                const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
                holder.init(target, sd, isAutoPlay, isDestroyOnComplete, isLoop);
            }
            return sd;
        } catch (error) {
            if (target && target.isValid) {
                target.skeletonData = null;
            }
            this.decRef(sd);
            console.error(logTag, path, error);
            return null;
        }
    }
}

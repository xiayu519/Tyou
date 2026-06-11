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
            (asset) => this._loader.releaseCache(asset),
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
        try {
            const asset = await this.loadAssetAsync(path, version, onProgress);
            if (!asset) return null;

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
            return null;
        }
        return spriteFrame;
    }

    async setSpriteAsync(params: SetSpriteAsyncParams): Promise<SpriteFrame | null> {
        return this._spriteAssignService.setSpriteAsync(params);
    }

    async loadSpineAsync(target: sp.Skeleton, path: string, isAutoRelease = true) {
        const sd = await this.loadAssetAsync(path) as unknown as sp.SkeletonData;
        target.skeletonData = sd;
        if (isAutoRelease) {
            const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
            holder.init(target, sd, false, false, false);
        }
    }

    async loadSpineEffectAsync(target: sp.Skeleton, path: string, isAutoRelease = true, isLoop = false) {
        const sd = await this.loadAssetAsync(path) as unknown as sp.SkeletonData;
        target.skeletonData = sd;
        if (isAutoRelease) {
            const holder = target.getComponent(SpineHolder) || target.addComponent(SpineHolder);
            holder.init(target, sd, true, true, isLoop);
        }
    }

    public addRef(asset: Asset): void {
        this._releaseScheduler.addRef(asset);
    }

    public decRef(asset: Asset): void {
        this._releaseScheduler.decRef(asset);
    }
}

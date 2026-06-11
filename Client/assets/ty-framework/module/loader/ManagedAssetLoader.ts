import {Asset, ImageAsset, SceneAsset, SpriteFrame} from "cc";
import {BundleService} from "./BundleService";
import {ReleaseScheduler} from "./ReleaseScheduler";
import {
    RemoteResourceRequest,
    ResourceDirRequest,
    ResourcePreloadRequest,
    ResourceProgress,
    ResourceRequest
} from "./ResourceTypes";

interface PendingLoad<T> {
    progresses: ResourceProgress[];
    completes: Array<(value: T | null) => void>;
    promise: Promise<T | null>;
}

interface DirCacheEntry {
    bundle: string;
    assets: Asset[];
}

export class ManagedAssetLoader {
    private _assetCache: Map<string, Asset> = new Map();
    private _assetBundles: Map<string, string> = new Map();
    private _dirCache: Map<string, DirCacheEntry> = new Map();
    private _pendingLoads: Map<string, PendingLoad<any>> = new Map();
    private _cancelledKeys: Set<string> = new Set();

    constructor(
        private readonly _bundleService: BundleService,
        private readonly _releaseScheduler: ReleaseScheduler
    ) {
    }

    public loadAssetAsync<T extends typeof Asset>(params: ResourceRequest<T>): Promise<InstanceType<T> | null> {
        const request = this.withDefaultType(params);
        const key = this.getAssetKey(request);
        const cached = this.getValidCachedAsset(key) as InstanceType<T> | null;
        if (cached) {
            return this.resolveCached(cached, request.onComplete);
        }

        return this.enqueue<InstanceType<T>>(key, request.onProgress, request.onComplete, (onProgress) => {
            return new Promise((resolve) => {
                this._bundleService.load({
                    ...request,
                    onProgress,
                    onComplete: (asset) => {
                        if (this.isCancelled(key)) {
                            this.releaseCancelledAsset(asset);
                            resolve(null);
                            return;
                        }
                        if (asset && !(asset instanceof SceneAsset)) {
                            this._releaseScheduler.addRef(asset);
                            this._assetCache.set(key, asset);
                            this._assetBundles.set(key, this.normalizeBundle(request.bundle));
                        }
                        resolve(asset as InstanceType<T> || null);
                    }
                });
            });
        });
    }

    public loadDirAsync<T extends typeof Asset>(params: ResourceDirRequest<T>): Promise<InstanceType<T>[] | null> {
        const request = this.withDefaultType(params);
        const key = this.getDirKey(request);
        const cached = this.getValidCachedDir(key) as InstanceType<T>[] | null;
        if (cached) {
            return this.resolveCached(cached, request.onComplete);
        }

        return this.enqueue<InstanceType<T>[]>(key, request.onProgress, request.onComplete, (onProgress) => {
            return new Promise((resolve) => {
                this._bundleService.loadDir({
                    ...request,
                    onProgress,
                    onComplete: (assets) => {
                        if (this.isCancelled(key)) {
                            assets?.forEach(asset => this.releaseCancelledAsset(asset));
                            resolve(null);
                            return;
                        }
                        const managedAssets: Asset[] = [];
                        assets?.forEach((asset) => {
                            if (asset && !(asset instanceof SceneAsset)) {
                                this._releaseScheduler.addRef(asset);
                                managedAssets.push(asset);
                            }
                        });
                        if (managedAssets.length > 0) {
                            this._dirCache.set(key, {
                                bundle: this.normalizeBundle(request.bundle),
                                assets: managedAssets
                            });
                        }
                        resolve(assets as InstanceType<T>[] || null);
                    }
                });
            });
        });
    }

    public loadRemoteAsync(params: { url: string, ext?: string }): Promise<Asset | null> {
        const key = this.getRemoteKey(params);
        const cached = this.getValidCachedAsset(key);
        if (cached) {
            return this.resolveCached(cached);
        }

        return this.enqueue<Asset>(key, undefined, undefined, () => {
            return new Promise((resolve) => {
                this._bundleService.loadRemote({
                    ...params,
                    onComplete: (asset) => {
                        if (this.isCancelled(key)) {
                            this.releaseCancelledAsset(asset);
                            resolve(null);
                            return;
                        }
                        if (asset && !(asset instanceof SceneAsset)) {
                            this._releaseScheduler.addRef(asset);
                            this._assetCache.set(key, asset);
                            this._assetBundles.set(key, "");
                        }
                        resolve(asset);
                    }
                } as RemoteResourceRequest);
            });
        });
    }

    public loadRemoteSpriteFrameAsync(params: { url: string, ext?: string }): Promise<SpriteFrame | null> {
        return new Promise((resolve) => {
            this._bundleService.loadRemote({
                ...params,
                onComplete: (asset) => {
                    if (!(asset instanceof ImageAsset)) {
                        resolve(null);
                        return;
                    }

                    const spriteFrame = SpriteFrame.createWithImage(asset);
                    if (spriteFrame) {
                        this._releaseScheduler.addRef(spriteFrame);
                    }
                    resolve(spriteFrame || null);
                }
            });
        });
    }

    public preload(params: ResourcePreloadRequest): void {
        this._bundleService.preload(params);
    }

    public preloadDir(params: ResourcePreloadRequest): void {
        this._bundleService.preloadDir(params);
    }

    public releaseCache(asset: Asset): void {
        for (const [key, storedAsset] of this._assetCache) {
            if (storedAsset === asset) {
                this._assetCache.delete(key);
                this._assetBundles.delete(key);
            }
        }

        for (const [key, entry] of this._dirCache) {
            entry.assets = entry.assets.filter(storedAsset => storedAsset !== asset);
            if (entry.assets.length === 0) {
                this._dirCache.delete(key);
            }
        }
    }

    public releaseAll(bundle?: string): void {
        const normalizedBundle = bundle ? this.normalizeBundle(bundle) : undefined;
        const assets = new Set<Asset>();

        for (const [key, asset] of this._assetCache) {
            if (!normalizedBundle || this._assetBundles.get(key) === normalizedBundle) {
                assets.add(asset);
                this._assetCache.delete(key);
                this._assetBundles.delete(key);
            }
        }

        for (const [key, entry] of this._dirCache) {
            if (!normalizedBundle || entry.bundle === normalizedBundle) {
                entry.assets.forEach(asset => assets.add(asset));
                this._dirCache.delete(key);
            }
        }

        this.cancelPendingLoads(normalizedBundle);

        setTimeout(() => {
            assets.forEach(asset => this._releaseScheduler.decRef(asset));
        }, 1000);
    }

    private enqueue<T>(
        key: string,
        onProgress: ResourceProgress | undefined,
        onComplete: ((value: T | null) => void) | undefined,
        start: (onProgress: ResourceProgress) => Promise<T | null>
    ): Promise<T | null> {
        const existing = this._pendingLoads.get(key) as PendingLoad<T> | undefined;
        if (existing) {
            if (onProgress) existing.progresses.push(onProgress);
            if (onComplete) existing.completes.push(onComplete);
            return existing.promise;
        }

        const pending: PendingLoad<T> = {
            progresses: [],
            completes: [],
            promise: Promise.resolve(null)
        };
        if (onProgress) pending.progresses.push(onProgress);
        if (onComplete) pending.completes.push(onComplete);
        this._pendingLoads.set(key, pending);

        const progress = (finish: number, total: number, item: any) => {
            if (!this._pendingLoads.has(key)) return;
            pending.progresses.forEach(cb => cb(finish, total, item));
        };

        pending.promise = start(progress)
            .then((result) => {
                if (this._cancelledKeys.has(key)) {
                    this._cancelledKeys.delete(key);
                    return null;
                }
                if (!this._pendingLoads.has(key)) return result;
                this._pendingLoads.delete(key);
                pending.completes.forEach(cb => cb(result));
                return result;
            })
            .catch((error) => {
                this._pendingLoads.delete(key);
                console.error("资源加载失败", key, error);
                pending.completes.forEach(cb => cb(null));
                return null;
            });

        return pending.promise;
    }

    private getValidCachedAsset(key: string): Asset | null {
        if (!this._assetCache.has(key)) return null;

        const asset = this._assetCache.get(key);
        if (!asset || !asset.isValid) {
            this._assetCache.delete(key);
            this._assetBundles.delete(key);
            return null;
        }
        return asset;
    }

    private getValidCachedDir(key: string): Asset[] | null {
        const entry = this._dirCache.get(key);
        if (!entry) return null;

        const assets = entry.assets.filter(asset => asset && asset.isValid);
        if (assets.length === 0) {
            this._dirCache.delete(key);
            return null;
        }

        if (assets.length !== entry.assets.length) {
            entry.assets = assets;
        }

        return assets;
    }

    private resolveCached<T>(value: T, onComplete?: (value: T | null) => void): Promise<T | null> {
        return new Promise((resolve) => {
            setTimeout(() => {
                onComplete?.(value);
                resolve(value);
            }, 0);
        });
    }

    private getAssetKey(request: ResourceRequest): string {
        return `asset|${this.normalizeBundle(request.bundle)}|${this.getTypeName(request.type)}|${request.path}|${request.version || ""}`;
    }

    private getDirKey(request: ResourceDirRequest): string {
        return `dir|${this.normalizeBundle(request.bundle)}|${this.getTypeName(request.type)}|${request.path}|${request.version || ""}`;
    }

    private getRemoteKey(request: { url: string, ext?: string }): string {
        return `remote|${request.url}|${request.ext || ""}`;
    }

    private getTypeName(type?: typeof Asset): string {
        return type?.name || "Asset";
    }

    private normalizeBundle(bundle?: string): string {
        return bundle || "resources";
    }

    private cancelPendingLoads(bundle?: string): void {
        for (const [key, pending] of this._pendingLoads) {
            if (!this.shouldCancelPendingKey(key, bundle)) continue;

            this._pendingLoads.delete(key);
            this._cancelledKeys.add(key);
            pending.completes.forEach(cb => cb(null));
        }
    }

    private shouldCancelPendingKey(key: string, bundle?: string): boolean {
        if (!bundle) return true;
        return key.indexOf(`asset|${bundle}|`) === 0 || key.indexOf(`dir|${bundle}|`) === 0;
    }

    private isCancelled(key: string): boolean {
        return this._cancelledKeys.has(key) || !this._pendingLoads.has(key);
    }

    private releaseCancelledAsset(asset: Asset | null): void {
        if (!asset || !asset.isValid || asset instanceof SceneAsset) return;

        asset.addRef();
        asset.decRef();
    }

    private withDefaultType<T extends typeof Asset, R extends ResourceRequest<T> | ResourceDirRequest<T>>(request: R): R {
        return {
            ...request,
            type: request.type || Asset as T,
        };
    }
}

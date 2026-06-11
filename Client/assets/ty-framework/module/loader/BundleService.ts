import {Asset, AssetManager, assetManager, JsonAsset, path, SceneAsset} from "cc";
import {MINIGAME} from "cc/env";
import {RemoteResourceRequest, ResourceDirRequest, ResourcePreloadRequest, ResourceRequest} from "./ResourceTypes";

const REGEX = /^https?:\/\/.*/;

export class BundleService {
    public getBundle(bundle?: string): AssetManager.Bundle {
        return assetManager.getBundle(this.normalizeBundle(bundle)) as AssetManager.Bundle;
    }

    public loadBundle({bundle, version, onComplete}: {
        bundle?: string,
        version?: string,
        onComplete?: (bundle: AssetManager.Bundle | null) => any
    }): void {
        bundle = this.normalizeBundle(bundle);

        if (MINIGAME) {
            if (REGEX.test(bundle)) {
                console.log("小游戏环境下只支持加载远程Bundle的资源数据, 不会加载脚本");
                this.reloadBundle({bundle, version, onComplete});
                return;
            }
            if (version && assetManager.downloader.bundleVers[bundle] !== version) {
                console.log("小游戏环境下只支持更新Bundle的远程资源数据, 不会更新脚本");
                assetManager.loadBundle(bundle, (err: Error, b: AssetManager.Bundle) => {
                    if (err || !b) return onComplete?.(null);
                    this.reloadBundle({bundle, version, onComplete});
                });
                return;
            }
            assetManager.loadBundle(bundle, (err: Error, loadedBundle: AssetManager.Bundle) => {
                onComplete?.(err ? null : loadedBundle);
            });
            return;
        }

        if (version) {
            assetManager.loadBundle(bundle, {version}, (err: Error, loadedBundle: AssetManager.Bundle) => {
                onComplete?.(err ? null : loadedBundle);
            });
        } else {
            assetManager.loadBundle(bundle, (err: Error, loadedBundle: AssetManager.Bundle) => {
                onComplete?.(err ? null : loadedBundle);
            });
        }
    }

    public loadBundleAsync(params: { bundle?: string, version?: string }): Promise<AssetManager.Bundle | null> {
        return new Promise((resolve) => {
            this.loadBundle({...params, onComplete: resolve});
        });
    }

    public reloadBundle({bundle, version, onComplete}: {
        bundle?: string,
        version?: string,
        onComplete?: (bundle: AssetManager.Bundle | null) => any
    }): void {
        bundle = this.normalizeBundle(bundle);

        let baseUrl = "";
        let configUrl = "";

        if (REGEX.test(bundle)) {
            baseUrl = bundle;
            const suffix = version ? `${version}.` : "";
            configUrl = `${baseUrl}config.${suffix}json`;
        } else {
            baseUrl = `${assetManager.downloader.remoteServerAddress}remote/${bundle}/`;
            const suffix = version ? `${version}.` : "";
            configUrl = `${baseUrl}config.${suffix}json`;
        }

        assetManager.cacheManager?.removeCache(configUrl);
        assetManager.loadRemote(configUrl, (err: Error, data: JsonAsset) => {
            if (err) {
                console.error(`下载Bundle配置失败: ${configUrl}`);
                onComplete?.(null);
                return;
            }

            this.releaseAll(path.basename(bundle));
            this.removeBundle(path.basename(bundle));

            const assetBundle = new AssetManager.Bundle();
            const config = data.json as any;
            config.base = baseUrl;
            assetBundle.init(config);
            onComplete?.(assetBundle);
        });
    }

    public reloadBundleAsync(params: { bundle?: string, version?: string }): Promise<AssetManager.Bundle | null> {
        return new Promise((resolve) => {
            this.reloadBundle({...params, onComplete: resolve});
        });
    }

    public removeBundle(bundle?: string): void {
        const loadedBundle = assetManager.getBundle(this.normalizeBundle(bundle));
        if (loadedBundle) assetManager.removeBundle(loadedBundle);
    }

    public release({path, bundle, type}: { path: string, bundle?: string, type?: typeof Asset }): void {
        assetManager.getBundle(this.normalizeBundle(bundle))?.release(path, type);
    }

    public releaseAll(bundle?: string): void {
        const loadedBundle = assetManager.getBundle(this.normalizeBundle(bundle));
        if (!loadedBundle) return;

        loadedBundle.getDirWithPath("/", Asset).forEach((asset) => {
            loadedBundle.release(asset.path, asset.ctor);
        });
    }

    public releaseUnused(bundle?: string): void {
        //@ts-ignore
        assetManager.getBundle(this.normalizeBundle(bundle))?.releaseUnusedAssets();
    }

    public preload(params: ResourcePreloadRequest): void {
        if (SceneAsset === params.type as typeof Asset) {
            this.handle("preloadScene", {
                path: params.path,
                bundle: params.bundle,
                version: params.version,
                onProgress: params.onProgress,
                onComplete: params.onComplete
            });
            return;
        }

        this.handle("preload", params);
    }

    public preloadDir(params: ResourcePreloadRequest): void {
        this.handle("preloadDir", params);
    }

    public load<T extends typeof Asset>(params: ResourceRequest<T>): void {
        if (SceneAsset === params.type as typeof Asset) {
            this.handle("loadScene", {
                path: params.path,
                bundle: params.bundle,
                version: params.version,
                onProgress: params.onProgress,
                onComplete: params.onComplete
            });
            return;
        }

        this.handle("load", params);
    }

    public loadDir<T extends typeof Asset>(params: ResourceDirRequest<T>): void {
        this.handle("loadDir", params);
    }

    public loadRemote({url, ext, onComplete}: RemoteResourceRequest): void {
        if (ext) {
            assetManager.loadRemote(url, {ext}, (error, res: Asset) => {
                if (error) {
                    console.error(`loadRemote ${url} fail`);
                    onComplete?.(null);
                    return;
                }
                onComplete?.(res);
            });
            return;
        }

        assetManager.loadRemote(url, (error, res: Asset) => {
            if (error) {
                console.log(`loadRemote ${url} fail`);
                onComplete?.(null);
                return;
            }
            onComplete?.(res);
        });
    }

    private handle(handle: string, request: ResourceRequest | ResourceDirRequest | ResourcePreloadRequest): void {
        if (!handle) {
            console.error("handle is empty");
            request.onComplete?.(null);
            return;
        }
        if (!request.path) {
            console.error(`${handle} fail. path is empty`);
            request.onComplete?.(null);
            return;
        }

        const args: any[] = [request.path];
        if (request.type) args.push(request.type);
        if (request.onProgress) args.push(request.onProgress);
        args.push((err: string, res: unknown) => {
            if (err) {
                console.error(`${handle} "${request.path}" fail`, err);
                request.onComplete?.(null);
                return;
            }
            request.onComplete?.(res as any);
        });

        this.loadBundle({
            bundle: request.bundle,
            version: request.version,
            onComplete: (loadedBundle) => {
                if (!loadedBundle) {
                    request.onComplete?.(null);
                    return;
                }
                (loadedBundle as any)[handle](...args);
            },
        });
    }

    private normalizeBundle(bundle?: string): string {
        return bundle || "resources";
    }
}

import {BufferAsset} from "cc";
import {Tables} from "../../../scripts/proto/config/bin/schema";
import ByteBuf from "../../../scripts/proto/config/luban/ByteBuf";
import {Module} from "../Module";
import type {ResourceProgress} from "../loader/ResourceTypes";

export type TableLoadProgress = ResourceProgress;

export class TableModule extends Module {
    private _dataMap = new Map<string, Uint8Array>();
    private _tables: Tables | null = null;
    private _isLoaded = false;
    private _loadingPromise: Promise<boolean> | null = null;
    private _loadToken = 0;
    private _destroyed = false;

    async onCreate(): Promise<void> {
        await this.loadAsync();
    }

    public loadAsync(onProgress?: TableLoadProgress): Promise<boolean> {
        if (this._destroyed) {
            this.error("[TableModule] loadAsync called after destroy");
            return Promise.resolve(false);
        }

        if (this._isLoaded && this._tables) {
            return Promise.resolve(true);
        }

        if (this._loadingPromise) {
            return this._loadingPromise;
        }

        const token = ++this._loadToken;
        const promise = this.doLoadAsync(token, onProgress);
        this._loadingPromise = promise;
        promise.finally(() => {
            if (this._loadingPromise === promise) {
                this._loadingPromise = null;
            }
        });
        return promise;
    }

    public isLoaded(): boolean {
        return this._isLoaded && !!this._tables;
    }

    public isLoading(): boolean {
        return !!this._loadingPromise;
    }

    private async doLoadAsync(token: number, onProgress?: TableLoadProgress): Promise<boolean> {
        this.clearLoadedData();

        let cfgs: BufferAsset[] | null = null;
        const released = new Set<BufferAsset>();
        try {
            cfgs = await tyou.res.loadDirAsync({
                path: "game",
                bundle: "config",
                type: BufferAsset,
                onProgress,
            });

            if (this.isStaleLoad(token)) {
                this.releaseConfigs(cfgs);
                return false;
            }

            if (!cfgs || cfgs.length === 0) {
                this.error("[TableModule] config table assets are empty");
                return false;
            }

            for (const cfg of cfgs) {
                try {
                    const buffer = cfg.buffer();
                    this._dataMap.set(cfg.name, new Uint8Array(buffer.slice(0, buffer.byteLength)));
                } finally {
                    tyou.res.decRef(cfg);
                    released.add(cfg);
                }
            }

            if (this.isStaleLoad(token)) {
                this.clearLoadedData();
                return false;
            }

            this._tables = new Tables((fileName: string) => new ByteBuf(this._dataMap.get(fileName)));
            this._isLoaded = true;
            return true;
        } catch (error) {
            this.releaseConfigs(cfgs, released);
            this.error("[TableModule] load config tables failed", error);
            this.clearLoadedData();
            return false;
        }
    }

    private releaseConfigs(cfgs: BufferAsset[] | null, released?: Set<BufferAsset>): void {
        if (!cfgs) {
            return;
        }
        for (const cfg of cfgs) {
            if (released?.has(cfg)) {
                continue;
            }
            tyou.res.decRef(cfg);
        }
    }

    private isStaleLoad(token: number): boolean {
        return this._destroyed || token !== this._loadToken;
    }

    private clearLoadedData(): void {
        this._dataMap.clear();
        this._tables = null;
        this._isLoaded = false;
    }

    public getConfig(): Tables | null {
        return this._tables;
    }

    onDestroy(): void {
        this._destroyed = true;
        this._loadToken++;
        this._loadingPromise = null;
        this.clearLoadedData();
    }

}

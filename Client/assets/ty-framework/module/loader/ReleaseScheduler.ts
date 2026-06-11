import {Asset} from "cc";

interface PendingReleaseInfo {
    asset: Asset;
    markTime: number;
}

export class ReleaseScheduler {
    private _releaseCheckInterval: number = 3;
    private _releaseDelay: number = 2;
    private _elapsedTime: number = 0;
    private _pendingReleaseQueue: Map<Asset, PendingReleaseInfo> = new Map();
    private _enableDelayRelease: boolean = true;

    constructor(
        private readonly _releaseCache: (asset: Asset) => void,
        private readonly _log: (...args: any[]) => void
    ) {
    }

    public update(dt: number): void {
        if (!this._enableDelayRelease) return;

        this._elapsedTime += dt;
        if (this._elapsedTime < this._releaseCheckInterval) return;

        this._elapsedTime = 0;
        this.processReleaseQueue();
    }

    public destroy(): void {
        this.forceReleaseAllPending();
        this._pendingReleaseQueue.clear();
    }

    public setReleaseConfig(checkInterval: number, releaseDelay: number): void {
        this._releaseCheckInterval = Math.max(0.1, checkInterval);
        this._releaseDelay = Math.max(0, releaseDelay);
    }

    public setDelayReleaseEnabled(enabled: boolean): void {
        this._enableDelayRelease = enabled;
        if (!enabled) {
            this.forceReleaseAllPending();
        }
    }

    public getPendingReleaseCount(): number {
        return this._pendingReleaseQueue.size;
    }

    public forceReleaseAllPending(): void {
        for (const [asset] of this._pendingReleaseQueue) {
            if (asset && asset.isValid && asset.refCount === 0) {
                this._releaseCache(asset);
                this._log("ForceRelease", asset.name);
            }
        }
        this._pendingReleaseQueue.clear();
    }

    public addRef(asset: Asset): void {
        if (!asset || !asset.isValid) return;

        asset.addRef();
        this._log("AddRef", asset.name, asset.refCount);

        if (this._pendingReleaseQueue.has(asset)) {
            this._pendingReleaseQueue.delete(asset);
            this._log("RemoveFromPendingRelease", asset.name);
        }
    }

    public decRef(asset: Asset): void {
        if (!asset || !asset.isValid) return;

        if (asset.refCount > 0) {
            asset.decRef();
        }
        this._log("DecRef", asset.name, asset.refCount);

        if (this._enableDelayRelease) {
            if (!this._pendingReleaseQueue.has(asset)) {
                this._pendingReleaseQueue.set(asset, {
                    asset,
                    markTime: Date.now()
                });
                this._log("AddToPendingCheck", asset.name, "refCount:", asset.refCount);
            }
            return;
        }

        if (asset.refCount === 0) {
            this._releaseCache(asset);
        }
    }

    private processReleaseQueue(): void {
        const currentTime = Date.now();
        const toRemove: Asset[] = [];

        for (const [asset, info] of this._pendingReleaseQueue) {
            if (!asset || !asset.isValid) {
                toRemove.push(asset);
                continue;
            }

            if (asset.refCount > 0) {
                continue;
            }

            const elapsed = (currentTime - info.markTime) / 1000;
            if (elapsed >= this._releaseDelay) {
                this._releaseCache(asset);
                this._log("DelayRelease", asset.name, "after", elapsed.toFixed(2), "s");
                toRemove.push(asset);
            }
        }

        for (const asset of toRemove) {
            this._pendingReleaseQueue.delete(asset);
        }
    }
}

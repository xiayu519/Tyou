import {Asset, isValid, Sprite, SpriteFrame} from "cc";
import type {SetSpriteAsyncParams} from "./ResourceModule";

export class SpriteAssignService {
    private _requestId: number = 0;
    private _requestMap: WeakMap<Sprite, number> = new WeakMap();

    constructor(
        private readonly _loadRemoteSpriteFrameAsync: (params: { url: string, ext?: string }) => Promise<SpriteFrame | null>,
        private readonly _loadSprite: (
            path: string,
            version?: string,
            onProgress?: SetSpriteAsyncParams["onProgress"]
        ) => Promise<SpriteFrame | null>,
        private readonly _releaseAsset: (asset: Asset) => void
    ) {
    }

    public async setSpriteAsync(params: SetSpriteAsyncParams): Promise<SpriteFrame | null> {
        if (!params || !params.target) {
            params?.onComplete?.(false, null);
            return null;
        }

        if (!this.isOwnerValid(params)) {
            params.onComplete?.(false, null);
            return null;
        }

        const requestId = ++this._requestId;
        this._requestMap.set(params.target, requestId);

        let spriteFrame: SpriteFrame | null = null;
        if (params.url) {
            spriteFrame = await this._loadRemoteSpriteFrameAsync({url: params.url, ext: params.ext});
        } else if (params.path) {
            spriteFrame = await this._loadSprite(params.path, params.version, params.onProgress);
        }

        if (this._requestMap.get(params.target) !== requestId || !this.isOwnerValid(params)) {
            this.clearRequestIfCurrent(params.target, requestId);
            this.releaseLoadedSpriteFrame(spriteFrame);
            params.onComplete?.(false, spriteFrame);
            return null;
        }

        if (!spriteFrame || !isValid(params.target)) {
            this.clearRequestIfCurrent(params.target, requestId);
            this.releaseLoadedSpriteFrame(spriteFrame);
            params.onComplete?.(false, spriteFrame);
            return null;
        }

        try {
            params.target.spriteFrame = spriteFrame;
            params.onComplete?.(true, spriteFrame);
            return spriteFrame;
        } catch (error) {
            this.clearRequestIfCurrent(params.target, requestId);
            this.releaseLoadedSpriteFrame(spriteFrame);
            params.onComplete?.(false, spriteFrame);
            console.error("setSpriteAsync assign failed", error);
            return null;
        }
    }

    private releaseLoadedSpriteFrame(spriteFrame: SpriteFrame | null): void {
        if (spriteFrame && spriteFrame.isValid) {
            this._releaseAsset(spriteFrame);
        }
    }

    private isOwnerValid(params: SetSpriteAsyncParams): boolean {
        return !params.isValidOwner || params.isValidOwner();
    }

    private clearRequestIfCurrent(target: Sprite, requestId: number): void {
        if (this._requestMap.get(target) === requestId) {
            this._requestMap.delete(target);
        }
    }
}

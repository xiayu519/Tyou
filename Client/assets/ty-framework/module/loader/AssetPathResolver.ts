import {Asset, AssetManager, SpriteFrame} from "cc";
import {AssetIndexManager} from "./AssetIndexManager";
import {AssetTypeRegistry} from "./AssetTypeRegistry";
import {ResourceRequest} from "./ResourceTypes";

export class AssetPathResolver {
    constructor(private readonly _typeRegistry: AssetTypeRegistry) {
    }

    public resolve<T extends typeof Asset>(args: any[]): ResourceRequest<T> {
        const raw = args[0];
        if (typeof raw === "string") {
            return this.resolveLogicalName(raw, args[1], args[2], args[3]);
        }

        if (raw && typeof raw === "object" && raw.params) {
            return this.withDefaultType(raw.params);
        }

        return this.withDefaultType(raw);
    }

    private resolveLogicalName<T extends typeof Asset>(
        name: string,
        version?: string,
        onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void,
        onComplete?: (item: InstanceType<T> | null) => void
    ): ResourceRequest<T> {
        const info = AssetIndexManager.instance.getAssetInfo(name);

        if (!info) {
            console.error(`[ResourceModule] Asset index missing: ${name}`);
            return {
                path: name,
                version,
                type: Asset as T,
                onProgress,
                onComplete,
            };
        }

        let path = info.path || name;
        const type = this._typeRegistry.get(info.type) || Asset;
        if (type === SpriteFrame) {
            path += "/spriteFrame";
        }
        if (!this._typeRegistry.has(info.type)) {
            console.warn(`[ResourceModule] Unknown asset type "${info.type}" for ${name}, fallback to Asset`);
        }

        return {
            path,
            bundle: info.bundle,
            version,
            type: type as T,
            onProgress,
            onComplete,
        };
    }

    private withDefaultType<T extends typeof Asset>(raw: ResourceRequest<T>): ResourceRequest<T> {
        if (!raw) {
            return {path: "", type: Asset as T};
        }
        return {
            ...raw,
            type: raw.type || Asset as T,
        };
    }
}

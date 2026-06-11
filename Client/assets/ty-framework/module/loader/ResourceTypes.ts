import {Asset, AssetManager} from "cc";

export type ResourceProgress = (finish: number, total: number, item: AssetManager.RequestItem) => void;
export type ResourceComplete<T> = (item: T | null) => void;

export interface ResourceRequest<T extends typeof Asset = typeof Asset> {
    path: string;
    bundle?: string;
    version?: string;
    type?: T;
    onProgress?: ResourceProgress;
    onComplete?: ResourceComplete<InstanceType<T>>;
}

export interface ResourceDirRequest<T extends typeof Asset = typeof Asset> {
    path: string;
    bundle?: string;
    version?: string;
    type?: T;
    onProgress?: ResourceProgress;
    onComplete?: ResourceComplete<InstanceType<T>[]>;
}

export interface ResourcePreloadRequest<T extends typeof Asset = typeof Asset> {
    path: string;
    bundle?: string;
    version?: string;
    type?: T;
    onProgress?: ResourceProgress;
    onComplete?: ResourceComplete<AssetManager.RequestItem[]>;
}

export interface RemoteResourceRequest {
    url: string;
    ext?: string;
    onComplete?: ResourceComplete<Asset>;
}

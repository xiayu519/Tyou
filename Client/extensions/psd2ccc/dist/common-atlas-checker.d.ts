type CommonAtlasAssetInfo = {
    isDirectory: boolean;
    name: string;
    file: string;
};
export declare function isCommonAtlasCheckAsset(assetInfo: CommonAtlasAssetInfo): boolean;
export declare function runCommonAtlasCheck(assetInfo: CommonAtlasAssetInfo): Promise<void>;
export declare const COMMON_ATLAS_DB_PATH: string;
export declare function runCommonAtlasCheckForNode(nodeUuid: string): Promise<void>;
export {};

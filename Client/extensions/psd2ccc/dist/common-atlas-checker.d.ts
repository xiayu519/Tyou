type CheckReport = {
    groups: number;
    reusedCommon: number;
    createdCommon: number;
    replacedRefs: number;
    deleted: number;
    skipped: string[];
};
type CommonAtlasAssetInfo = {
    isDirectory: boolean;
    name: string;
    file: string;
};
export declare function isCommonAtlasCheckAsset(assetInfo: CommonAtlasAssetInfo): boolean;
export declare function runCommonAtlasCheck(assetInfo: CommonAtlasAssetInfo): Promise<void>;
export declare const COMMON_ATLAS_DB_PATH: string;
export declare function runAllCommonAtlasCheck(): Promise<void>;
export declare function executeAllCommonAtlasPlan(planId: string, selectedAssetDbPaths: string[]): Promise<CheckReport>;
export declare function discardAllCommonAtlasPlan(planId: string): void;
export declare function runRedundantAtlasCheck(): Promise<void>;
export declare function executeRedundantAtlasPlan(planId: string, selectedAssetDbPaths: string[]): Promise<{
    deleted: number;
    skipped: string[];
}>;
export declare function discardRedundantAtlasPlan(planId: string): void;
export declare function runCommonAtlasCheckForNode(nodeUuid: string): Promise<void>;
export {};

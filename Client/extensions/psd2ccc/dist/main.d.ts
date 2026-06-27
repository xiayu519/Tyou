export declare function resolveSelectedNodeUuid(selection?: any): string;
export declare const methods: {
    checkAllCommonAtlas(): Promise<void>;
    checkRedundantAtlas(): Promise<void>;
    executeAllCommonAtlasPlan(planId: string, selectedAssetDbPaths: string[]): Promise<{
        groups: number;
        reusedCommon: number;
        createdCommon: number;
        replacedRefs: number;
        deleted: number;
        skipped: string[];
    }>;
    executeRedundantAtlasPlan(planId: string, selectedAssetDbPaths: string[]): Promise<{
        deleted: number;
        skipped: string[];
    }>;
    discardAllCommonAtlasPlan(planId: string): void;
    discardRedundantAtlasPlan(planId: string): void;
    checkCommonAtlasForNode(nodeUuid: string): Promise<void>;
    checkCommonAtlasForSelection(): Promise<void>;
};
export declare function load(): void;
export declare function unload(): void;

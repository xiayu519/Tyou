export declare const methods: {
    buildNodes(uiNodeName: string, jsonStr: string, spriteMapStr: string): {
        success: boolean;
        count: number;
        rootUuid: any;
        rootName: any;
    };
    collectSpriteFrameRefs(rootUuid: string): string[];
    replaceSpriteFramesInNodeTree(rootUuid: string, replacementsJson: string): Promise<number>;
    replaceSpriteFramesInOpenScene(replacementsJson: string): Promise<{
        changed: number;
        remainingSourceUuids: string[];
    }>;
};

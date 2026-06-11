import {
    AnimationClip,
    Asset,
    AudioClip,
    BufferAsset,
    Font,
    JsonAsset,
    Prefab,
    SceneAsset,
    sp,
    SpriteAtlas,
    SpriteFrame,
    TextAsset
} from "cc";

export class AssetTypeRegistry {
    private _typeMap: Map<string, typeof Asset> = new Map();

    constructor() {
        this.registerDefaults();
    }

    public register(typeName: string, type: typeof Asset): void {
        this._typeMap.set(typeName, type);
    }

    public get(typeName: string): typeof Asset | undefined {
        return this._typeMap.get(typeName);
    }

    public has(typeName: string): boolean {
        return this._typeMap.has(typeName);
    }

    private registerDefaults(): void {
        this.register("Prefab", Prefab);
        this.register("SpriteFrame", SpriteFrame);
        this.register("cc.SpriteFrame", SpriteFrame);
        this.register("SpriteAtlas", SpriteAtlas);
        this.register("cc.SpriteAtlas", SpriteAtlas);
        this.register("AudioClip", AudioClip);
        this.register("JsonAsset", JsonAsset);
        this.register("Font", Font);
        this.register("TextAsset", TextAsset);
        this.register("AnimationClip", AnimationClip);
        this.register("Scene", SceneAsset);
        this.register("sp.SkeletonData", sp.SkeletonData);
        this.register("BufferAsset", BufferAsset);
    }
}

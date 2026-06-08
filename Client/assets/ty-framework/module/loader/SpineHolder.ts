import {_decorator, Asset, Component, sp} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('SpineHolder')
export class SpineHolder extends Component {
    private spine!: sp.Skeleton;
    private asset: Asset | null = null;
    private isAutoPlay:boolean;
    private isDestory:boolean;
    private isLoop:boolean;
    private completeListener: (() => void) | null = null;

    public init(spine: sp.Skeleton,asset:Asset,isAutoPlay = true,isDestory = true,isLoop = false): void {
        if (this.asset && this.asset !== asset) {
            tyou.res.decRef(this.asset);
        }
        this.spine = spine;
        this.asset = asset;
        this.isAutoPlay = isAutoPlay;
        this.isDestory = isDestory;
        this.isLoop = isLoop;
        this.completeListener = this.onSpineComplete.bind(this);
        this.spine.setCompleteListener(this.completeListener);
        if (isAutoPlay) {
            this.spine.setAnimation(0, "animation", isLoop);
        }
    }
    
    private onSpineComplete() {
        if (this.isLoop) {
            return;
        }
        this.releaseAsset();
        if (this.isDestory) {
            this.node.destroy();
        }
    }

    override onDestroy() {
        this.releaseAsset();
        if (this.spine && this.completeListener) {
            this.spine.setCompleteListener(() => {
            });
        }
        this.completeListener = null;
    }

    private releaseAsset(): void {
        if (!this.asset) {
            return;
        }
        tyou.res.decRef(this.asset);
        this.asset = null;
    }
}

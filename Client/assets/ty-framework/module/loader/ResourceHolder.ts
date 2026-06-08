import {_decorator, Asset, Component} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('ResourceHolder')
export class ResourceHolder extends Component {
    private asset: Asset | null = null;

    public init(asset: Asset | null): void {
        if (this.asset && this.asset !== asset) {
            tyou.res.decRef(this.asset);
        }
        this.asset = asset;
    }
    override onDestroy() {
        if (this.asset) {
            tyou.res.decRef(this.asset);
        }
        this.asset = null;
    }
}

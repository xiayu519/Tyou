import {_decorator, Asset, Button, Component, isValid, Node, Sprite, SpriteFrame, UITransform} from "cc";
import Dictionary from "../../core/collections/Dictionary";
import {ViewUtil} from "../../core/util/ViewUtil";


/**
 * UI基础类
 */

export class UIBase {
    public node: Node | null = null;
    public isPrepare: boolean = false;

    protected _parent: UIBase | null = null;
    protected _userDatas: any[] = [];

    /** 摊平的节点集合（不能重名） */
    private _nodes: Map<string, Node> = new Map();

    /** 自动释放资源 */
    private _dynamicsAssets: Set<Asset> = new Set();

    /** 点击事件列表 */
    private _registerEventList: Map<string, any> = new Map();

    private _canTouch: boolean = true;
    private _touchCd: number = 0.2;

    private _transform: UITransform;
    public get transform() {
        if (!this._transform) {
            this._transform = this.node.getComponent(UITransform);
        }
        return this._transform;
    }

    public get userData(): any {
        if (this._userDatas && this._userDatas.length > 0) {
            return this._userDatas[0];
        }
        return null;
    }

    public get userDatas(): any[] {
        return this._userDatas;
    }

    async getSprite(name: string) {
        const sprite = await tyou.res.loadSprite(name);
        this.addAutoReleaseAsset(sprite);
        return sprite;
    }

    async getSpriteFromAtlas(atlasName: string, spriteFrameName: string) {
        const atlas = await tyou.res.loadAtlas(atlasName);
        if (!atlas) {
            return null;
        }
        const spriteFrame = atlas.getSpriteFrame(spriteFrameName);
        if (!spriteFrame) {
            console.warn("UIBase.getSpriteFromAtlas: spriteFrame not found", atlasName, spriteFrameName);
            return null;
        }
        this.addAutoReleaseAsset(atlas);
        return spriteFrame;
    }

    async setSpriteAsync(target: Sprite | Node, name: string) {
        const sprite = target instanceof Sprite ? target : target?.getComponent(Sprite);
        if (!sprite) {
            return null;
        }
        const spriteFrame = await tyou.res.setSpriteAsync({target: sprite, path: name});
        if (spriteFrame) {
            this.addAutoReleaseAsset(spriteFrame);
        }
        return spriteFrame;
    }

    async setRemoteSpriteAsync(target: Sprite | Node, url: string, ext: string = ".png") {
        const sprite = target instanceof Sprite ? target : target?.getComponent(Sprite);
        if (!sprite) {
            return null;
        }
        const spriteFrame = await tyou.res.setSpriteAsync({target: sprite, url, ext});
        if (spriteFrame) {
            this.addAutoReleaseAsset(spriteFrame);
        }
        return spriteFrame;
    }

    /** 添加自动释放的资源 */
    public addAutoReleaseAsset(asset: Asset): void {
        if (isValid(asset)) {
            this._dynamicsAssets.add(asset);
        }
    }

    /** 添加自动释放的资源数组 */
    public addAutoReleaseAssets(assets: Asset[]): void {
        assets.forEach(asset => {
            this.addAutoReleaseAsset(asset);
        });
    }

    /** 注册事件监听 */
    public onRegisterEvent(node: Node | undefined, callback: Function, param?: any, playAudio: boolean = true): void {
        if (!node) {
            console.error("no node");
            return;
        }
        let btn = node.getComponent(Button);
        if (!btn) return;

        this.removeEventListener(node);
        // 创建事件处理函数
        const eventHandler = () => {
            if (!this._canTouch) {
                return;
            }

            if (playAudio) {
                // 播放音效
                tyou.audio.playEffect("btn_click");
            }

            this._canTouch = false;

            setTimeout(() => {
                this._canTouch = true;
            }, this._touchCd * 1000);

            // 传递参数给回调
            callback.call(this, btn!, param);
        };

        btn.node.on("click", eventHandler, this);

        // 存储完整的事件信息
        this._registerEventList.set(node.uuid, {
            node: node,
            type: "click",
            handler: eventHandler,
            param: param
        });
    }

    /** 移除事件监听 */
    public removeEventListener(node: Node): boolean {
        if (!node) return false;

        const eventInfo = this._registerEventList.get(node.uuid);
        if (eventInfo) {
            node.off(eventInfo.type, eventInfo.handler, this);
            this._registerEventList.delete(node.uuid);
            return true;
        }
        return false;
    }

    /** 通过节点名获取预制上的节点，整个预制不能有重名节点 */
    public get(name: string): Node | undefined {
        return this._nodes.get(name);
    }

    /** 脚本生成（收集节点） */
    protected scriptGenerator(): void {
        ViewUtil.nodeTreeInfoLite(this.node, this._nodes);
    }

    protected registerEvent(): void {
    }

    protected onCreate(): void {
        // 子类实现
    }

    protected onRefresh(): void {
        // 子类实现
    }

    protected onUpdate(): void {
        // 子类实现
    }

    protected onClosed() {
        // 子类实现

    }

    protected async onRelease() {
        this._nodes.clear();
        // 清理事件监听
        this._registerEventList.forEach((eventInfo, uuid) => {
            eventInfo.node.off(eventInfo.type, eventInfo.handler, this);
        });
        this._registerEventList.clear();
        this.onClosed();
        this.unLoadRes();
        tyou.event.targetOff(this);
    }

    protected unLoadRes() {
        if (this._dynamicsAssets.size > 0) {
            this._dynamicsAssets.forEach(asset => {
                tyou.res.decRef(asset)
            });
            this._dynamicsAssets.clear();
        }
    }

    protected onSortDepth(depth: number): void {
        // 子类实现
    }

    protected onSetVisible(visible: boolean): void {
        // 子类实现
    }

}

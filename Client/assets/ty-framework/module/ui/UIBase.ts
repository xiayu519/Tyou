import {Asset, Button, isValid, Node, Sprite, UITransform} from "cc";
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
    private _nodesByName: Map<string, Node[]> = new Map();
    private _nodesByPath: Map<string, Node> = new Map();
    private _nodePaths: WeakMap<Node, string> = new WeakMap();
    private _duplicateNodeNames: Set<string> = new Set();

    /** 自动释放资源 */
    private _dynamicsAssets: Set<Asset> = new Set();

    /** 点击事件列表 */
    private _registerEventList: Map<string, any> = new Map();

    private _canTouch: boolean = true;
    private _touchCd: number = 0.2;
    private _touchTimerId: number = 0;

    private _transform: UITransform | null = null;
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
            this.clearTouchTimer();
            this._touchTimerId = tyou.timer.addTimer(() => {
                this._canTouch = true;
                this._touchTimerId = 0;
            }, this._touchCd);

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

    public getRequired(name: string): Node {
        const node = this.get(name);
        if (node) {
            return node;
        }

        const message = `[UIBase] Required bind node "${name}" not found in ${this.getUIDebugName()}`;
        console.error(message);
        throw new Error(message);
    }

    public getAll(name: string): Node[] {
        const nodes = this._nodesByName.get(name);
        if (!nodes) {
            return [];
        }
        return nodes.filter(node => node && node.isValid);
    }

    public getByPath(path: string): Node | undefined {
        const normalizedPath = path.replace(/\\/g, "/");
        const direct = this._nodesByPath.get(normalizedPath);
        if (direct && direct.isValid) {
            return direct;
        }

        if (this.node) {
            const node = this._nodesByPath.get(`${this.node.name}/${normalizedPath}`);
            return node && node.isValid ? node : undefined;
        }

        return undefined;
    }

    /** 脚本生成（收集节点） */
    protected scriptGenerator(): void {
        const scan = ViewUtil.collectBindNodes(this.node);
        this._nodes = scan.nodes;
        this._nodesByName = scan.nodesByName;
        this._nodesByPath = scan.nodesByPath;
        this._nodePaths = scan.nodePaths;
        this._duplicateNodeNames = scan.duplicateNames;
        this.reportDuplicateBindNodes();
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

    protected onRelease() {
        this.clearTouchTimer();
        this._nodes.clear();
        this._nodesByName.clear();
        this._nodesByPath.clear();
        this._duplicateNodeNames.clear();
        // 清理事件监听
        this._registerEventList.forEach((eventInfo, uuid) => {
            if (eventInfo.node && eventInfo.node.isValid) {
                eventInfo.node.off(eventInfo.type, eventInfo.handler, this);
            }
        });
        this._registerEventList.clear();
        this.onClosed();
        this._parent = null;
        this._userDatas.length = 0;
        this._transform = null;
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

    private clearTouchTimer(): void {
        if (this._touchTimerId > 0) {
            tyou.timer.removeTimer(this._touchTimerId);
            this._touchTimerId = 0;
        }
    }

    private reportDuplicateBindNodes(): void {
        if (this._duplicateNodeNames.size === 0) {
            return;
        }

        this._duplicateNodeNames.forEach((name) => {
            const nodes = this._nodesByName.get(name) || [];
            const paths = nodes.map((node, index) => {
                const path = this._nodePaths.get(node) || node.name;
                return `${index + 1}. ${path}`;
            });
            console.warn(`[UIBase] Duplicate bind node "${name}" in ${this.getUIDebugName()}:\n${paths.join("\n")}`);
        });
    }

    private getUIDebugName(): string {
        return (this as any).windowName || this.node?.name || this.constructor.name;
    }

}

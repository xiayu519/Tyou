import {Asset, Button, isValid, Node, sp, Sprite, UITransform} from "cc";
import {ViewUtil} from "../../core/util/ViewUtil";

export type UIChildConstructor<T extends UIBase = UIBase> = new () => T;


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
    private _dynamicsAssets: Map<Asset, number> = new Map();
    private _dynamicSpineTargets: Set<sp.Skeleton> = new Set();
    private _dynamicSpineAssets: WeakMap<sp.Skeleton, Asset> = new WeakMap();
    private _spineRequestIds: WeakMap<sp.Skeleton, number> = new WeakMap();
    private _spineRequestSeq: number = 0;
    protected _isReleased: boolean = false;
    protected _ownerEpoch: number = 0;

    /** 子 UIWidget 列表 */
    private _childWidgets: Map<any, boolean> = new Map();

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

    public get parent(): UIBase | null {
        return this._parent;
    }

    public get isReleased(): boolean {
        return this._isReleased;
    }

    public get ownerEpoch(): number {
        return this._ownerEpoch;
    }

    async getSprite(name: string) {
        const ownerEpoch = this.captureOwnerEpoch();
        const sprite = await tyou.res.loadSprite(name);
        if (sprite && !this.addAutoReleaseAssetForEpoch(sprite, ownerEpoch)) {
            return null;
        }
        return sprite;
    }

    async getSpriteFromAtlas(atlasName: string, spriteFrameName: string) {
        const ownerEpoch = this.captureOwnerEpoch();
        const spriteFrame = await tyou.res.loadSpriteFromAtlas(atlasName, spriteFrameName);
        if (spriteFrame && !this.addAutoReleaseAssetForEpoch(spriteFrame, ownerEpoch)) {
            return null;
        }
        return spriteFrame;
    }

    async setSpriteAsync(target: Sprite | Node, name: string) {
        const sprite = target instanceof Sprite ? target : target?.getComponent(Sprite);
        if (!sprite) {
            return null;
        }
        const ownerEpoch = this.captureOwnerEpoch();
        const spriteFrame = await tyou.res.setSpriteAsync({
            target: sprite,
            path: name,
            isValidOwner: () => this.isOwnerEpochValid(ownerEpoch),
        });
        if (spriteFrame && !this.addAutoReleaseAssetForEpoch(spriteFrame, ownerEpoch)) {
            return null;
        }
        return spriteFrame;
    }

    async setRemoteSpriteAsync(target: Sprite | Node, url: string, ext: string = ".png") {
        const sprite = target instanceof Sprite ? target : target?.getComponent(Sprite);
        if (!sprite) {
            return null;
        }
        const ownerEpoch = this.captureOwnerEpoch();
        const spriteFrame = await tyou.res.setSpriteAsync({
            target: sprite,
            url,
            ext,
            isValidOwner: () => this.isOwnerEpochValid(ownerEpoch),
        });
        if (spriteFrame && !this.addAutoReleaseAssetForEpoch(spriteFrame, ownerEpoch)) {
            return null;
        }
        return spriteFrame;
    }

    async loadSpineAsync(target: sp.Skeleton | Node, path: string): Promise<sp.SkeletonData | null> {
        return this.assignSpineAsync(target, path);
    }

    async loadSpineEffectAsync(target: sp.Skeleton | Node, path: string, isLoop: boolean = false, animationName: string = "animation"): Promise<sp.SkeletonData | null> {
        const spine = this.getSpineTarget(target);
        const skeletonData = await this.assignSpineAsync(spine, path);
        if (skeletonData && spine && spine.isValid && spine.node?.isValid) {
            spine.setAnimation(0, animationName, isLoop);
        }
        return skeletonData;
    }

    /** 添加自动释放的资源 */
    public addAutoReleaseAsset(asset: Asset | null | undefined): boolean {
        if (!isValid(asset)) {
            return false;
        }

        if (this._isReleased) {
            tyou.res.decRef(asset);
            return false;
        }

        this._dynamicsAssets.set(asset, (this._dynamicsAssets.get(asset) || 0) + 1);
        return true;
    }

    protected addAutoReleaseAssetForEpoch(asset: Asset | null | undefined, ownerEpoch: number): boolean {
        if (!isValid(asset)) {
            return false;
        }

        if (!this.isOwnerEpochValid(ownerEpoch)) {
            tyou.res.decRef(asset);
            return false;
        }

        return this.addAutoReleaseAsset(asset);
    }

    /** 添加自动释放的资源数组 */
    public addAutoReleaseAssets(assets: Asset[]): void {
        assets.forEach(asset => {
            this.addAutoReleaseAsset(asset);
        });
    }

    public createWidget<T extends UIBase>(WidgetClass: UIChildConstructor<T>, node: Node | undefined, ...args: any[]): T | null {
        if (!WidgetClass || !node || !node.isValid) {
            return null;
        }

        const widget = new WidgetClass() as any;
        if (typeof widget.create !== "function") {
            console.error(`[UIBase] ${WidgetClass.name} is not a UIWidget-like class`);
            return null;
        }

        if (!widget.create(this, node, ...args)) {
            return null;
        }

        this.setChildWidgetAutoUpdate(widget, true);
        return widget as T;
    }

    public async loadWidgetAsync<T extends UIBase>(WidgetClass: UIChildConstructor<T>, assetName: string, parentNode?: Node, ...args: any[]): Promise<T | null> {
        if (!WidgetClass || !assetName) {
            return null;
        }

        const ownerEpoch = this.captureOwnerEpoch();
        const parent = parentNode || this.node;
        if (!parent || !parent.isValid) {
            return null;
        }

        const node = await tyou.res.loadGameObjectAsync(assetName, parent);
        if (!node || !node.isValid) {
            return null;
        }

        if (!this.isOwnerEpochValid(ownerEpoch)) {
            node.destroy();
            return null;
        }

        const widget = this.createWidget(WidgetClass, node, ...args);
        if (!widget) {
            node.destroy();
            return null;
        }

        const widgetLike = widget as any;
        if (typeof widgetLike.setDestroyNodeOnRelease === "function") {
            widgetLike.setDestroyNodeOnRelease(true);
        }

        return widget;
    }

    public loadWidgetByTypeAsync<T extends UIBase>(WidgetClass: UIChildConstructor<T>, parentNode?: Node, ...args: any[]): Promise<T | null> {
        return this.loadWidgetAsync(WidgetClass, (WidgetClass as any).name, parentNode, ...args);
    }

    public releaseWidget(widget: any): void {
        if (widget && typeof widget.release === "function") {
            widget.release();
        }
    }

    public registerChildWidget(widget: any, autoUpdate: boolean = false): void {
        if (!widget || widget === this) {
            return;
        }
        const current = this._childWidgets.get(widget) || false;
        this._childWidgets.set(widget, current || autoUpdate);
    }

    public setChildWidgetAutoUpdate(widget: any, autoUpdate: boolean): void {
        if (!widget || widget === this || !this._childWidgets.has(widget)) {
            return;
        }
        this._childWidgets.set(widget, autoUpdate);
    }

    public unregisterChildWidget(widget: any): void {
        if (!widget) {
            return;
        }
        this._childWidgets.delete(widget);
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

    protected updateChildWidgets(): boolean {
        if (this._childWidgets.size === 0) {
            return false;
        }

        let updated = false;
        const widgets = Array.from(this._childWidgets.entries());
        widgets.forEach(([widget, autoUpdate]) => {
            if (!autoUpdate || !widget || typeof widget.updateWidget !== "function") {
                return;
            }

            updated = widget.updateWidget() || updated;
        });
        return updated;
    }

    protected onClosed() {
        // 子类实现

    }

    protected onRelease() {
        this.releaseChildWidgets();
        this._isReleased = true;
        this._ownerEpoch++;
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
        this.clearDynamicSpines();
        if (this._dynamicsAssets.size > 0) {
            this._dynamicsAssets.forEach((count, asset) => {
                for (let i = 0; i < count; i++) {
                    tyou.res.decRef(asset);
                }
            });
            this._dynamicsAssets.clear();
        }
    }

    protected prepareOwner(parent: UIBase | null, node: Node, userDatas: any[] = []): void {
        this._parent = parent;
        this.node = node;
        this._userDatas = userDatas;
        this._isReleased = false;
        this.isPrepare = true;
        this._ownerEpoch++;
    }

    protected setOwnerUserDatas(userDatas: any[]): void {
        this._userDatas = userDatas;
    }

    protected recycleOwnerResources(): void {
        this._ownerEpoch++;
        this.clearTouchTimer();
        this.unLoadRes();
    }

    protected captureOwnerEpoch(): number {
        return this._ownerEpoch;
    }

    public isOwnerEpochValid(ownerEpoch: number): boolean {
        return !this._isReleased
            && this._ownerEpoch === ownerEpoch
            && !!this.node
            && this.node.isValid;
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

    private async assignSpineAsync(target: sp.Skeleton | Node | null | undefined, path: string): Promise<sp.SkeletonData | null> {
        const spine = this.getSpineTarget(target);
        if (!spine || !path) {
            return null;
        }

        const ownerEpoch = this.captureOwnerEpoch();
        const requestId = ++this._spineRequestSeq;
        this._spineRequestIds.set(spine, requestId);
        const skeletonData = await tyou.res.loadAssetAsync({path, type: sp.SkeletonData}) as sp.SkeletonData | null;
        if (!skeletonData) {
            return null;
        }

        if (!this.isOwnerEpochValid(ownerEpoch)
            || this._spineRequestIds.get(spine) !== requestId
            || !spine.isValid
            || !spine.node?.isValid) {
            tyou.res.decRef(skeletonData);
            return null;
        }

        try {
            this.releaseTrackedSpine(spine);
            spine.skeletonData = skeletonData;
            this._dynamicSpineTargets.add(spine);
            this._dynamicSpineAssets.set(spine, skeletonData);
            if (!this.addAutoReleaseAssetForEpoch(skeletonData, ownerEpoch)) {
                if (spine.isValid && spine.skeletonData === skeletonData) {
                    spine.skeletonData = null;
                }
                this._dynamicSpineTargets.delete(spine);
                this._dynamicSpineAssets.delete(spine);
                return null;
            }
            return skeletonData;
        } catch (error) {
            if (spine && spine.isValid && spine.skeletonData === skeletonData) {
                spine.skeletonData = null;
            }
            tyou.res.decRef(skeletonData);
            console.error("[UIBase] loadSpineAsync", path, error);
            return null;
        }
    }

    private getSpineTarget(target: sp.Skeleton | Node | null | undefined): sp.Skeleton | null {
        if (!target) {
            return null;
        }
        return target instanceof sp.Skeleton ? target : target.getComponent(sp.Skeleton);
    }

    private clearDynamicSpines(): void {
        if (this._dynamicSpineTargets.size === 0) {
            return;
        }

        this._dynamicSpineTargets.forEach(spine => {
            this.releaseTrackedSpine(spine, false);
        });
        this._dynamicSpineTargets.clear();
    }

    private releaseTrackedSpine(spine: sp.Skeleton | null | undefined, releaseAsset: boolean = true): void {
        if (!spine) {
            return;
        }

        const asset = this._dynamicSpineAssets.get(spine);
        if (spine.isValid) {
            spine.setCompleteListener(() => {
            });
            if (!asset || spine.skeletonData === asset) {
                spine.skeletonData = null;
            }
        }

        this._dynamicSpineAssets.delete(spine);
        this._dynamicSpineTargets.delete(spine);
        if (releaseAsset && asset) {
            this.releaseTrackedDynamicAsset(asset);
        }
    }

    private releaseTrackedDynamicAsset(asset: Asset): void {
        const count = this._dynamicsAssets.get(asset) || 0;
        if (count <= 1) {
            this._dynamicsAssets.delete(asset);
        } else {
            this._dynamicsAssets.set(asset, count - 1);
        }
        tyou.res.decRef(asset);
    }

    private releaseChildWidgets(): void {
        if (this._childWidgets.size === 0) {
            return;
        }

        const widgets = Array.from(this._childWidgets.keys());
        this._childWidgets.clear();
        widgets.forEach(widget => {
            if (widget && typeof widget.release === "function") {
                widget.release();
            }
        });
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

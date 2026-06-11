import {UIBase} from "./UIBase";
import {IWindowAttribute} from "./WindowAttribute";
import {Node} from "cc";

/**
 * UI窗口类
 */
export class UIWindow extends UIBase {
    public windowName: string = '';
    public windowLayer: number = 0;
    public assetName: string = '';
    public fullScreen: boolean = false;
    public bgClose: boolean = false;
    public blurBackground: boolean = true;
    public hideTimeToClose: number = 0;
    public hideTimerId: number = 0;

    public isLoadDone: boolean = false;
    public isDestroyed: boolean = false;
    public isHide: boolean = false;

    private _isCreate: boolean = false;
    private _depth: number = 0;

    /**
     * 获取最终窗口属性（由 @UIDecorator 装饰器配置）
     */
    public get customAttribute(): IWindowAttribute {
        return (this.constructor as any).__uiAttributes || {};
    }

    public get depth(): number {
        return this._depth;
    }

    public set depth(value: number) {
        if (this._depth === value) {
            return;
        }
        this._depth = value;
        if (this._isCreate) {
            this.onSortDepth(value);
        }
    }

    public get visible(): boolean {
        return this.node ? this.node.active : false;
    }

    public set visible(value: boolean) {
        if (!this.node) return;
        if (this.isDestroyed) return;
        if (this.node.active === value) return;

        this.node.active = value;
        this.onSetVisible(value);
    }

    /** 初始化窗口 */
    public init(name: string, layer: number, fullScreen: boolean, bgClose: boolean, blurBackground: boolean, assetName: string, hideTimeToClose: number): void {
        this.windowName = name;
        this.windowLayer = layer;
        this.fullScreen = fullScreen;
        this.bgClose = bgClose;
        this.blurBackground = blurBackground;
        this.assetName = assetName;
        this.hideTimeToClose = hideTimeToClose;
    }

    /** 尝试调用准备回调 */
    public tryInvoke(prepareCallback: (window: UIWindow) => void, ...args: any[]): void {
        if (this.isDestroyed) {
            return;
        }

        this.cancelHideToCloseTimer();
        this._userDatas = args;

        if (this.isPrepare && this.node && this.node.isValid) {
            prepareCallback?.(this);
        }
    }

    /** 内部加载 */
    public async baseLoad(location: string, ...args: any[]): Promise<boolean> {
        if (this.isDestroyed) {
            return false;
        }

        this._userDatas = args;
        this.isLoadDone = false;
        this.isPrepare = false;
        const uiInstance = await tyou.res.loadGameObjectAsync(location, tyou.ui.getLayerNode(this.windowLayer));
        return this.handleCompleted(uiInstance);
    }

    /** 内部创建 */
    public baseCreate(): void {
        if (this.isDestroyed || !this.isPrepare) {
            return;
        }

        if (!this._isCreate) {
            this._isCreate = true;
            this.scriptGenerator();
            this.bindMemberProperty();
            this.registerEvent();
            this.onCreate();
        }
    }

    /** 内部刷新 */
    public baseRefresh(): void {
        if (this.isDestroyed || !this.isPrepare) {
            return;
        }

        this.onRefresh();
    }

    /** 内部更新 */
    public baseUpdate(): boolean {
        if (!this.isPrepare || !this.visible) {
            return false;
        }
        // 移除List实现，简化为直接调用
        this.onUpdate();
        return true;
    }

    /** 内部销毁 */
    public baseDestroy(isShutdown: boolean = false): void {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.isHide = false;
        this.isPrepare = false;
        this.isLoadDone = false;
        this._isCreate = false;
        this.cancelHideToCloseTimer();
        this.onRelease();

        const node = this.node;
        this.node = null;
        if (node && node.isValid) {
            node.destroy();
        }
    }

    /** 隐藏窗口 */
    public hide(): void {
        tyou.ui.hideWindow(this.windowName);
    }

    /** 关闭窗口 */
    public close(): void {
        tyou.ui.closeWindow(this.windowName);
    }

    /** 取消隐藏关闭计时器 */
    public cancelHideToCloseTimer(): void {
        this.isHide = false;
        if (this.hideTimerId > 0) {
            tyou.timer.removeTimer(this.hideTimerId);
            this.hideTimerId = 0;
        }
    }

    public startHideToCloseTimer(callback: () => void): void {
        this.cancelHideToCloseTimer();
        if (this.hideTimeToClose <= 0 || this.isDestroyed) {
            return;
        }

        this.hideTimerId = tyou.timer.addTimer(callback, this.hideTimeToClose);
    }

    /** 处理加载完成 */
    private handleCompleted(panel: Node | null): boolean {
        if (panel === null) {
            throw new Error(`UI Prefab load returned null: ${this.windowName}`);
        }

        this.isLoadDone = true;
        if (this.isDestroyed) {
            panel.destroy();
            return false;
        }

        panel.name = this.windowName;
        this.node = panel;
        this.isPrepare = true;
        return true;
    }

    protected bindMemberProperty(): void {
     
    }

}

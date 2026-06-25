import {Node} from "cc";
import {UIBase} from "./UIBase";

/**
 * UI子组件类。
 * 可用于列表item、子面板、页签等非顶层窗口UI。
 */
export class UIWidget extends UIBase {
    public widgetName: string = "";
    public isDestroyed: boolean = false;

    private _isCreated: boolean = false;
    private _destroyNodeOnRelease: boolean = false;

    public get visible(): boolean {
        return this.node ? this.node.active : false;
    }

    public set visible(value: boolean) {
        if (!this.node || this.isDestroyed || this.node.active === value) {
            return;
        }

        this.node.active = value;
        this.onSetVisible(value);
    }

    public create(parent: UIBase | null, node: Node, ...args: any[]): boolean {
        if (this.isDestroyed || !node || !node.isValid) {
            return false;
        }

        this.widgetName = node.name;
        this.prepareOwner(parent, node, args);
        parent?.registerChildWidget(this);

        if (!this._isCreated) {
            this._isCreated = true;
            this.scriptGenerator();
            this.bindMemberProperty();
            this.registerEvent();
            this.onCreate();
        }

        this.onRefresh();
        return true;
    }

    public setDestroyNodeOnRelease(value: boolean): void {
        this._destroyNodeOnRelease = value;
    }

    public refresh(...args: any[]): void {
        if (this.isDestroyed || !this.node || !this.node.isValid) {
            return;
        }

        this.isPrepare = true;
        this.setOwnerUserDatas(args);
        this.onRefresh();
    }

    public recycle(...args: any[]): void {
        if (this.isDestroyed) {
            return;
        }

        this.setOwnerUserDatas(args);
        this.onRecycle();
        this.recycleOwnerResources();
    }

    public release(): void {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.isPrepare = false;
        const parent = this.parent;
        const node = this.node;
        parent?.unregisterChildWidget(this);
        this.onRelease();
        if (this._destroyNodeOnRelease && node && node.isValid) {
            node.destroy();
        }
        this.node = null;
        this._isCreated = false;
    }

    public updateWidget(): boolean {
        if (!this.isPrepare || !this.visible || this.isDestroyed) {
            return false;
        }

        this.updateChildWidgets();
        this.onUpdate();
        return true;
    }

    protected bindMemberProperty(): void {
    }

    protected onRecycle(): void {
    }
}

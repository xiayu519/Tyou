import {Label, Layout, Node, Sprite} from "cc";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {IWindowAttribute} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

export class TestUI2 extends UIWindow {
    //#region UI组件引用
    private _btnEnter: Node;

    static get WINDOW_NAME(): string {
        return UIName.TestUI2;
    }		

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick)
    }
    //#endregion

    private onBtnEnterClick(btn:Node,param:any) {

    }

    protected get customAttributeOverride(): Partial<IWindowAttribute> {
        return { };
    }

    override onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {
        
    }
}
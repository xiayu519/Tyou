import {Label, Layout, Node, Sprite} from "cc";
import {UIDecorator} from "../../../ty-framework/module/ui/UIDecorator";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {UILayer} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

@UIDecorator({ name: UIName.TestUI5 })
export class TestUI5 extends UIWindow {
    //#region UI组件引用
    private _btnEnter: Node;

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick)
    }
    //#endregion

    private onBtnEnterClick(btn:Node,param:any) {

    }

    override onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {
        
    }
}
import { Label, Layout, Node, Sprite } from "cc";
import { UIDecorator } from "../../../ty-framework/module/ui/UIDecorator";
import { UIWindow } from "../../../ty-framework/module/ui/UIWindow";
import { UIName } from "./UIName";
import { UILayer } from "../../../ty-framework/module/ui/WindowAttribute";

@UIDecorator({ name: UIName.TestUI2, layer: UILayer.UI, fullScreen: false, bgClose: true, })
export class TestUI2 extends UIWindow {
    //#region UI组件引用
    private _btnEnter: Node;

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick)
    }
    //#endregion

    private onBtnEnterClick(btn: Node, param: any) {

    }

    override onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {

    }
}
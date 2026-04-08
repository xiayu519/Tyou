import {Label, Layout, Node, Sprite} from "cc";
import {UIDecorator} from "../../../ty-framework/module/ui/UIDecorator";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {UILayer} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

@UIDecorator({ name: UIName.TestPsdUI })
export class TestPsdUI extends UIWindow {
    //#region UI组件引用
    private _textTitle: Label;

    private _btnClose: Node;

    override bindMemberProperty() {
        this._textTitle = this.get("m_textTitle").getComponent(Label);
        this._btnClose = this.get("m_btnClose");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnClose, this.onBtnCloseClick)
    }
    //#endregion

    private onBtnCloseClick(btn:Node,param:any) {

    }

    override onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {
        
    }
}
import {Label, Layout, Node, Sprite} from "cc";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {IWindowAttribute, UILayer} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

export enum MessageBoxType {
    One,
    Two
}

export class MessageBoxUI extends UIWindow {
    //#region UI组件引用
    private _btnExit: Node;

    private _textExit: Label;

    private _btnSure: Node;

    private _textSure: Label;

    private _textContent: Label;

    private _textTitle: Label;

    static get WINDOW_NAME(): string {
        return UIName.MessageBoxUI;
    }

    override bindMemberProperty() {
        this._btnExit = this.get("m_btnExit");
        this._textExit = this.get("m_textExit").getComponent(Label);
        this._btnSure = this.get("m_btnSure");
        this._textSure = this.get("m_textSure").getComponent(Label);
        this._textContent = this.get("m_textContent").getComponent(Label);
        this._textTitle = this.get("m_textTitle").getComponent(Label);
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnExit, this.onBtnExitClick)
        this.onRegisterEvent(this._btnSure, this.onBtnSureClick)
    }

    //#endregion

    private onBtnExitClick(btn: Node, param: any) {
        this.hide();
        this._params.cb1?.();
    }

    private onBtnSureClick(btn: Node, param: any) {
        this.hide();
        this._params.cb2?.();
    }

    protected get customAttributeOverride(): Partial<IWindowAttribute> {
        return {
            fullScreen: false,
            layer: UILayer.Tips,
            hideTimeToClose: 60
        };
    }

    private _type: MessageBoxType;
    private _params;

    override onCreate() {

    }

    override onRefresh() {
        this._type = this.userData;
        this._params = this.userDatas[1];
        this._btnExit.active = this._type === MessageBoxType.Two;
        this._textTitle.string = this._params.title || "提示";
        this._textContent.string = this._params.content || "是否确定";
        if (!this._params.tips) {
            this._textExit.string = "取消";
            this._textSure.string = "确定";
        } else {
            this._textExit.string = this._params.tips[0];
            if (this._params.tips.length > 1) {
                this._textSure.string = this._params.tips[1];
            }
        }
    }

    override onClosed() {

    }
}
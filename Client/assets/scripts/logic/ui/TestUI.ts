import {Label, Layout, Node, Sprite} from "cc";
import {SceneEnum} from "../../../ty-framework/module/scene/Scene";
import {UIDecorator} from "../../../ty-framework/module/ui/UIDecorator";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {UILayer} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

@UIDecorator({
    name: UIName.TestUI,
    layer: UILayer.Tips,
    fullScreen: false,
    bgClose: true,
    hideTimeToClose: 3,
})
export class TestUI extends UIWindow {
    //#region UI组件引用
    private _btnEnter: Node;

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick)
    }

    //#endregion

    private async onBtnEnterClick(btn: Node, param: any) {
        this.close();
        await tyou.ui.showUIAsync(UIName.TestPsdUI);
/*         await tyou.scene.loadSceneAsync(SceneEnum.Game);
        tyou.ui.showUIAsync(UIName.TestUI1);  */
    }

    override async onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {

    }
}

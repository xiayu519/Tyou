import {Node} from "cc";
import {UIWidget} from "../../../../ty-framework/module/ui/UIWidget";

export class WidgetTest extends UIWidget {
    private _btnEnter: Node;

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick)
    }

    private onBtnEnterClick(btn:Node,param:any) {

    }

    override onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {

    }
}

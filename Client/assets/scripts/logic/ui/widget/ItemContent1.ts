import {Label, Node} from "cc";
import {UIWidget} from "../../../../ty-framework/module/ui/UIWidget";

export class ItemContent1 extends UIWidget {
    private _textItemContent1: Label;

    override bindMemberProperty() {
        this._textItemContent1 = this.get("m_textItemContent1").getComponent(Label);
    }

    override registerEvent() {

    }

    override onCreate() {

    }

    override onRefresh() {

    }

    override onRecycle() {

    }

    override onClosed() {

    }
}

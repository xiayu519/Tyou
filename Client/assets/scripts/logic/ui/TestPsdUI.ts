import { Label, Node, UITransform } from "cc";
import ListView from "../../../ty-framework/module/ui/loop-list/ListView"
import { UIDecorator } from "../../../ty-framework/module/ui/UIDecorator";
import { UIWindow } from "../../../ty-framework/module/ui/UIWindow";
import { UILayer } from "../../../ty-framework/module/ui/WindowAttribute";
import { UIName } from "./UIName";
import { ItemContent } from "./widget/ItemContent";

@UIDecorator({ name: UIName.TestPsdUI })
export class TestPsdUI extends UIWindow {
    private static readonly ITEM_COUNT = 50;

    //#region UI组件引用
    private _btnBack: Node;

    private _textContent: Label;

    private _listContent: ListView;

    override bindMemberProperty() {
        this._btnBack = this.get("m_btnBack");
        this._textContent = this.get("m_textContent").getComponent(Label);
        const listNode = this.get("m_listContent");
        this.normalizeListContent(listNode);
        this._listContent = listNode.getComponent(ListView);
        this._listContent.setItemWidget(ItemContent, this);
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnBack, this.onBtnBackClick)
    }
    //#endregion

    private async onBtnBackClick(btn: Node, param: any) {
        this.close();
        await tyou.ui.showUIAsync(UIName.TestUI);
    }

    override onCreate() {
        this._listContent.count = TestPsdUI.ITEM_COUNT;
    }

    override onRefresh() {
        this._listContent.count = TestPsdUI.ITEM_COUNT;
    }

    override onClosed() {

    }

    private normalizeListContent(listNode: Node) {
        const listTransform = listNode.getComponent(UITransform);
        const content = listNode.getChildByName("content");
        const contentTransform = content?.getComponent(UITransform);
        if (!listTransform || !content || !contentTransform) {
            return;
        }

        contentTransform.setAnchorPoint(0.5, 1);
        content.setPosition(0, listTransform.height * (1 - listTransform.anchorY), 0);
    }
}

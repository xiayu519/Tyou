import {find, Label, Sprite} from "cc";
import {UIWidget} from "../../../../ty-framework/module/ui/UIWidget";

export class ItemContent extends UIWidget {
    private _spriteContent: Sprite | null = null;
    private _textIndex: Label | null = null;

    override bindMemberProperty() {
        this._spriteContent = this.node.getComponent(Sprite);
        const indexLabelNode = this.get("m_textIndex") || find("Label", this.node);
        this._textIndex = indexLabelNode?.getComponent(Label) || null;
    }

    override registerEvent() {

    }

    override onCreate() {

    }

    override onRefresh() {
        const index = Number(this.userDatas[0]) || 0;
        if (this._textIndex) {
            this._textIndex.string = index.toString();
        }
        void this.refreshSpriteAsync(index);
    }

    override onRecycle() {
        if (this._textIndex) {
            this._textIndex.string = "";
        }
        if (this._spriteContent) {
            this._spriteContent.spriteFrame = null;
        }
    }

    override onClosed() {
        if (this._textIndex) {
            this._textIndex.string = "";
        }
        if (this._spriteContent) {
            this._spriteContent.spriteFrame = null;
        }
    }

    private async refreshSpriteAsync(index: number) {
        if (!this._spriteContent) {
            return;
        }

        this._spriteContent.spriteFrame = null;
        const spriteName = `l_grid${index % 3 + 1}`;
        await this.setSpriteAsync(this._spriteContent, spriteName);
    }
}

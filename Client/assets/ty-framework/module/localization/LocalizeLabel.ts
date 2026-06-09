import {_decorator, Component, Label} from "cc";
import {GameEvent} from "../../core/GameEvent";

const {ccclass, property} = _decorator;

@ccclass("LocalizeLabel")
export class LocalizeLabel extends Component {
    @property
    public key: string = "";

    private _label: Label | null = null;
    private _args: any[] = [];

    public onEnable(): void {
        this._label = this.getComponent(Label);
        tyou.event.on(GameEvent.LANGUAGE_CHANGED, this.refresh, this);
        this.refresh();
    }

    public onDisable(): void {
        tyou.event.off(GameEvent.LANGUAGE_CHANGED, this.refresh, this);
    }

    public setKey(key: string, ...args: any[]): void {
        this.key = key;
        this._args = args || [];
        this.refresh();
    }

    public refresh(): void {
        if (!this._label) {
            this._label = this.getComponent(Label);
        }
        if (!this._label || !this.key) {
            return;
        }
        this._label.string = tyou.i18n.get(this.key, ...this._args);
    }
}

import {find, Label, Node, Vec3} from "cc";
import {EasingType} from "../../core/EasingType";
import {GameUtil} from "../../core/util/GameUtil";
import {NodePool} from "../pool/NodePool";
import {UILayer} from "./WindowAttribute";

export class TipManager {
    private _pool: NodePool;
    private _windowLayer = UILayer.Tips;
    private _queue: string[] = [];
    private _interval: number = 0.3;
    private _cooldown: number = 0;
    private _isDestroyed: boolean = false;

    async onCreate() {
        this._isDestroyed = false;
        this._pool = await tyou.pool.getOrCreateNodePool({
                assetPath: "TipUI",
                preloadCount: 1,
            }
        );
    }

    onUpdate(dt: number): void {
        if (this._isDestroyed) {
            return;
        }

        if (this._queue.length === 0) {
            return;
        }
        if (this._cooldown > 0) {
            this._cooldown -= dt;
            if (this._cooldown > 0) {
                return;
            }
        }
        this._spawnNext();
    }

    onDestroy() {
        this._isDestroyed = true;
        this._queue.length = 0;
        this._pool?.destroy();
    }

    async showTip(msg: string) {
        if (this._isDestroyed) {
            return;
        }

        this._queue.push(msg);
        if (this._cooldown <= 0 && this._queue.length === 1) {
            this._spawnNext();
        }
    }

    private _spawnNext(): void {
        if (this._isDestroyed) {
            return;
        }

        if (this._queue.length === 0) {
            return;
        }
        const msg = this._queue.shift();
        if (!msg) {
            return;
        }
        this._cooldown = this._interval;
        this._playTip(msg).then();
    }

    private async _playTip(msg: string) {
        let tip: Node | null = null;
        let v3: Vec3 | null = null;

        try {
            if (this._isDestroyed) {
                return;
            }

            tip = await this._pool.getAsync();
            if (this._isDestroyed) {
                return;
            }

            tip.setPosition(0, 0);
            const label = find("m_textTip", tip)?.getComponent(Label);
            if (!label) {
                throw new Error("TipUI missing m_textTip Label");
            }

            label.string = msg;
            tip.parent = tyou.ui.getLayerNode(this._windowLayer);
            v3 = tyou.pool.getVec3();
            v3.set(tip.position.x, tip.position.y + 200, 0);
            await Promise.all([
                GameUtil.moveTo(tip, v3, 200),
                GameUtil.opacityTo(tip, 255, 0, 250, EasingType.EASE_IN)
            ]);
        } catch (error) {
            console.warn("[TipManager] play tip failed:", error);
        } finally {
            if (v3) {
                tyou.pool.releaseVec3(v3);
            }
            if (tip && tip.isValid) {
                this._pool?.release(tip);
            }
        }
    }
}



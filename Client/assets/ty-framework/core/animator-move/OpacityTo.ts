// OpacityTo.ts
import {_decorator, Component, UIOpacity} from 'cc';
import { EasingFunctions, EasingType } from "../EasingType";

const {ccclass, property} = _decorator;

/** 透明度过渡动画 */
@ccclass('OpacityTo')
export class OpacityTo extends Component {
    /** 目标透明度 (0-255) */
    target: number = 255;

    /** 变化速度（每秒变化的透明度值） */
    speed: number = 0;

    easing: string = 'linear';

    /** 动画完成回调 */
    onComplete: Function | null = null;
    /** 动画取消回调 */
    onCancel: Function | null = null;

    private _startOpacity: number = 0;
    private _totalDistance: number = 0;
    private _currentTime: number = 0;
    private _totalTime: number = 0;
    private _easingFunc: (t: number) => number = EasingFunctions.linear;
    private _uiOpacity: UIOpacity | null = null;
    private _settled: boolean = false;

    start() {
        this._uiOpacity = this.node.getComponent(UIOpacity);
        if (!this._uiOpacity) {
            console.error('OpacityTo requires UIOpacity component!');
            this.cancel();
            return;
        }

        this._startOpacity = this._uiOpacity.opacity;
        this._totalDistance = Math.abs(this.target - this._startOpacity);
        this._totalTime = this._totalDistance / this.speed;
        this._currentTime = 0;

        // 设置缓动函数
        this._easingFunc = EasingFunctions.getEasingFunction(this.easing as EasingType);

        // 如果速度为零或目标值等于当前值，直接完成
        if (this.speed <= 0 || this._totalDistance <= 0.001) {
            this._uiOpacity.opacity = this.target;
            this.exit();
        }
    }

    update(dt: number) {
        if (!this._uiOpacity || this._totalTime <= 0) return;

        this._currentTime += dt;

        // 计算进度 (0-1)
        let progress = Math.min(this._currentTime / this._totalTime, 1);

        // 应用缓动函数
        progress = this._easingFunc(progress);

        // 计算当前透明度
        const currentOpacity = this._startOpacity + (this.target - this._startOpacity) * progress;

        // 设置透明度（确保在有效范围内）
        this._uiOpacity.opacity = Math.max(0, Math.min(255, Math.round(currentOpacity)));

        // 检查是否完成
        if (this._currentTime >= this._totalTime) {
            this._uiOpacity.opacity = this.target;
            this.exit();
        }
    }

    public exit() {
        this._settle(true, true);
    }

    public cancel(): void {
        this._settle(false, true);
    }

    protected onDestroy(): void {
        this._settle(false, false);
    }

    private _settle(completed: boolean, destroySelf: boolean): void {
        if (this._settled) {
            return;
        }
        this._settled = true;
        const callback = completed ? this.onComplete : this.onCancel;
        this.onComplete = null;
        this.onCancel = null;
        try {
            callback?.call(this);
        } catch (error) {
            console.error(completed ? "OpacityTo complete callback failed" : "OpacityTo cancel callback failed", error);
        } finally {
            if (destroySelf && this.isValid) {
                this.destroy();
            }
        }
    }
}

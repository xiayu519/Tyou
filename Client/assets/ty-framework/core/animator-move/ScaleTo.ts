// ScaleTo.ts
import { _decorator, Component } from 'cc';
import {EasingFunctions, EasingType} from "../EasingType";

const { ccclass, property } = _decorator;

/** 缩放到指定目标尺寸（2D缩放，x和y相同） */
@ccclass('ScaleTo')
export class ScaleTo extends Component {
    /** 目标缩放尺寸（number类型，x和y缩放值相同） */
    @property
    target: number = 1;

    /** 缩放速度（每秒缩放的量） */
    @property
    speed: number = 0;

    /** 缓动类型 */
    easing: string = 'linear';

    /** 缩放完成回调 */
    onComplete: Function | null = null;
    /** 缩放取消回调 */
    onCancel: Function | null = null;

    private _startScale: number = 0;
    private _totalDistance: number = 0;
    private _currentTime: number = 0;
    private _totalTime: number = 0;
    private _settled: boolean = false;
    private _easingFunc: (t: number) => number = EasingFunctions.linear;

    start() {
        this._startScale = this.node.scale.x;
        this._totalDistance = Math.abs(this.target - this._startScale);
        this._totalTime = this._totalDistance / this.speed;
        this._currentTime = 0;

        // 设置缓动函数
        this._easingFunc = EasingFunctions.getEasingFunction(this.easing as EasingType);

        // 如果速度为零或目标值等于当前值，直接完成
        if (this.speed <= 0 || this._totalDistance <= 0.001) {
            this.node.setScale(this.target, this.target);
            this.exit();
        }
    }

    update(dt: number) {
        if (this._totalTime <= 0) return;
        this._currentTime += dt;
        // 计算进度 (0-1)
        let progress = Math.min(this._currentTime / this._totalTime, 1);
        // 应用缓动函数
        progress = this._easingFunc(progress);
        // 计算当前值
        const currentScale = this._startScale + (this.target - this._startScale) * progress;
        // 设置缩放
        this.node.setScale(currentScale, currentScale);
        // 检查是否完成
        if (this._currentTime >= this._totalTime) {
            this.node.setScale(this.target, this.target);
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
            console.error(completed ? "ScaleTo complete callback failed" : "ScaleTo cancel callback failed", error);
        } finally {
            if (destroySelf && this.isValid) {
                this.destroy();
            }
        }
    }
}

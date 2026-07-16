// MoveTo.ts
import { Component, Node, Vec3, _decorator, UITransform } from "cc";
import { WECHAT } from "cc/env";
import {EasingFunctions, EasingType} from "../EasingType";

const { ccclass, property } = _decorator;

/** 移动到指定目标位置 */
@ccclass('MoveTo')
export class MoveTo extends Component {
    /** 目标位置 */
    target: Vec3 | Node | null = null;
    /** 移动速度（每秒移动的像素距离） */
    speed: number = 0;
    /** 缓动类型 */
    easing: EasingType = EasingType.LINEAR;
    /** 坐标标（默认本地坐标） */
    ns: number = Node.NodeSpace.WORLD;
    /** 移动开始 */
    onStart: Function | null = null;
    /** 移动完成回调 */
    onComplete: Function | null = null;
    /** 移动取消回调 */
    onCancel: Function | null = null;
    /** 距离变化时 */
    onChange: Function | null = null;

    /** 动画相关参数 */
    private _startPosition: Vec3 = new Vec3();
    private _targetPosition: Vec3 = new Vec3();
    private _totalDistance: number = 0;
    private _totalTime: number = 0;
    private _currentTime: number = 0;
    private _isDynamicTarget: boolean = false;
    private _hasStartPosition: boolean = false;
    private _settled: boolean = false;
    private _easingFunc: (t: number) => number = EasingFunctions.linear;

    start() {
        // 检查速度是否有效
        if (!WECHAT) {
            console.assert(this.speed > 0, "移动速度必须要大于零");
        }

        if (this.speed <= 0) {
            console.error("移动速度必须要大于零");
            this.cancel();
            return;
        }

        // 设置缓动函数
        this._easingFunc = EasingFunctions.getEasingFunction(this.easing);

        // 记录起始位置
        this._captureStartPosition();

        // 标记是否为动态目标（目标是一个Node，可能会移动）
        this._isDynamicTarget = this.target instanceof Node;

        // 计算目标位置
        if (!this._updateTargetPosition()) {
            return;
        }

        // 计算总距离
        this._totalDistance = Vec3.distance(this._startPosition, this._targetPosition);

        if (this._totalDistance <= 0) {
            this.exit();
            return;
        }

        // 计算总时间
        this._totalTime = this._totalDistance / this.speed;
        this._currentTime = 0;

        // 触发开始事件
        this.onStart?.call(this);
        this.onChange?.call(this);
    }

    update(dt: number) {
        if (this._totalTime <= 0) return;

        // 如果是动态目标，每帧更新目标位置
        if (this._isDynamicTarget) {
            if (!this._updateTargetPosition()) {
                return;
            }
        }

        this._currentTime += dt;

        // 计算进度 (0-1)
        let progress = Math.min(this._currentTime / this._totalTime, 1);

        // 应用缓动函数
        progress = this._easingFunc(progress);

        // 计算当前位置
        const currentPos = new Vec3();
        Vec3.lerp(currentPos, this._startPosition, this._targetPosition, progress);

        // 设置节点位置
        if (this.ns === Node.NodeSpace.WORLD) {
            this.node.worldPosition = currentPos;
        } else {
            this.node.position = currentPos;
        }

        // 触发变化事件
        if (this._currentTime < this._totalTime) {
            this.onChange?.call(this);
        }

        // 检查是否完成
        if (this._currentTime >= this._totalTime) {
            // 确保最终位置准确
            if (this.ns === Node.NodeSpace.WORLD) {
                this.node.worldPosition = this._targetPosition;
            } else {
                this.node.position = this._targetPosition;
            }
            this.exit();
        }
    }

    /** 更新目标位置 */
    private _updateTargetPosition(): boolean {
        if (!this.target) {
            console.error("MoveTo target is null!");
            this.cancel();
            return false;
        }

        this._captureStartPosition();

        // 计算目标位置
        let end: Vec3;
        if (this.target instanceof Node) {
            if (!this.target.isValid) {
                this.cancel();
                return false;
            }
            if (this.ns === Node.NodeSpace.WORLD) {
                end = this.target.worldPosition.clone();
            } else {
                const parent = this.node.parent;
                if (parent) {
                    const parentTransform = parent.getComponent(UITransform);
                    if (parentTransform) {
                        const worldPos = this.target.worldPosition.clone();
                        end = parentTransform.convertToNodeSpaceAR(worldPos);
                    } else {
                        end = this.target.position.clone();
                    }
                } else {
                    end = this.target.position.clone();
                }
            }
        } else {
            end = (this.target as Vec3).clone();
        }

        // 更新目标位置
        this._targetPosition.set(end);

        // 如果是动态目标，需要重新计算总距离和时间
        if (this._isDynamicTarget && this._currentTime < this._totalTime) {
            const currentPos = this.ns === Node.NodeSpace.WORLD
                ? this.node.worldPosition.clone()
                : this.node.position.clone();
            const remainingDistance = Vec3.distance(currentPos, this._targetPosition);

            if (remainingDistance <= 0) {
                this.exit();
                return false;
            }

            // 重新计算剩余时间
            const remainingTime = remainingDistance / this.speed;
            this._totalTime = this._currentTime + remainingTime;
        }
        return true;
    }

    private _captureStartPosition(): void {
        if (this._hasStartPosition) {
            return;
        }
        if (this.ns === Node.NodeSpace.WORLD) {
            this._startPosition.set(this.node.worldPosition);
        } else {
            this._startPosition.set(this.node.position);
        }
        this._hasStartPosition = true;
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
            console.error(completed ? "MoveTo complete callback failed" : "MoveTo cancel callback failed", error);
        } finally {
            if (destroySelf && this.isValid) {
                this.destroy();
            }
        }
    }
}

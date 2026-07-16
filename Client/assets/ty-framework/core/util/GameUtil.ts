import {Vec3, Node, UIOpacity, UITransform, sp} from "cc";
import {MoveTo} from "../animator-move/MoveTo";
import {ScaleTo} from "../animator-move/ScaleTo";
import {OpacityTo} from "../animator-move/OpacityTo";
import {EasingType} from "../EasingType";


export class GameUtil {
    static async moveTo(from: Node, to: Vec3 | Node, speed: number, easing: EasingType = EasingType.LINEAR, ns = Node.NodeSpace.LOCAL) {
        const existing = from.getComponent(MoveTo);
        if (existing) {
            existing.cancel();
            await Unitask.waitNextFrame();
        }
        if (!from.isValid) {
            return;
        }
        const moveTo = from.addComponent(MoveTo)!;
        moveTo.speed = speed;
        moveTo.target = to;
        moveTo.easing = easing;
        moveTo.ns = ns;
        await new Promise<void>((resolve) => {
            moveTo.onComplete = resolve;
            moveTo.onCancel = resolve;
        });
    }

    static async scaleTo(from: Node, to: number, speed: number, easing: EasingType = EasingType.LINEAR) {
        if (!from.isValid) {
            return;
        }
        const scaleTo = from.addComponent(ScaleTo)!;
        scaleTo.speed = speed;
        scaleTo.target = to;
        scaleTo.easing = easing;
        await new Promise<void>((resolve) => {
            scaleTo.onComplete = resolve;
            scaleTo.onCancel = resolve;
        });
    }

    static async opacityTo(node: Node, from: number, to: number, speed: number, easing: EasingType = EasingType.LINEAR) {
        if (!node.isValid) {
            return;
        }
        let uiOpacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
        uiOpacity.opacity = from;
        const opacityTo = node.addComponent(OpacityTo)!;
        opacityTo.speed = speed;
        opacityTo.easing = easing;
        opacityTo.target = to;
        await new Promise<void>((resolve) => {
            opacityTo.onComplete = resolve;
            opacityTo.onCancel = resolve;
        });
    }

    static getLocalPositionFromN2N(form: Node, to: Node) {
        const worldPos = form.getWorldPosition();
        const toTransform = to.getComponent(UITransform);
        const nodePos = toTransform.convertToNodeSpaceAR(worldPos);
        return nodePos;
    }

    static playSpineSample(node: Node, cb: Function) {
        const spine = node.getComponent(sp.Skeleton) || node.getComponentInChildren(sp.Skeleton);
        spine.setAnimation(0, "animation", false);
        spine.setCompleteListener(() => {
            cb?.();
        });
    }

    static direction2degrees(direction: { x: number, y: number }): number {
        return (Math.atan2(direction.y, direction.x) - Math.PI / 2) * (180 / Math.PI);
    }

}

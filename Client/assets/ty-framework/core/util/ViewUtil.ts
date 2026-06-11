import {
    Button,
    EditBox,
    EventTouch,
    Label,
    Layout,
    Node,
    Prefab,
    ProgressBar,
    RichText,
    ScrollView,
    Size,
    Slider,
    Sprite,
    Toggle,
    UITransform,
    v3,
    Vec3
} from "cc";
import ListView from "../../../scripts/logic/core/loop-list/ListView";

//import { oops } from "../Oops";

export interface IBindNodeScanResult {
    nodes: Map<string, Node>;
    nodesByName: Map<string, Node[]>;
    nodesByPath: Map<string, Node>;
    nodePaths: WeakMap<Node, string>;
    duplicateNames: Set<string>;
}

/** 显示对象工具 */
export class ViewUtil {
    static readonly UI_BIND_COMPONENT_CONFIG = [
        {prefix: "m_go", component: null},
        {prefix: "m_tf", component: UITransform},
        {prefix: "m_text", component: Label},
        {prefix: "m_btn", component: Button},
        {prefix: "m_img", component: Sprite},
        {prefix: "m_grid", component: Layout},
        {prefix: "m_list", component: ListView},
        {prefix: "m_scroll", component: ScrollView},
        {prefix: "m_toggle", component: Toggle},
        {prefix: "m_slider", component: Slider},
        {prefix: "m_progress", component: ProgressBar},
        {prefix: "m_eb", component: EditBox},
        {prefix: "m_rt", component: RichText},
    ];

    static collectBindNodes(parent: Node): IBindNodeScanResult {
        const result: IBindNodeScanResult = {
            nodes: new Map(),
            nodesByName: new Map(),
            nodesByPath: new Map(),
            nodePaths: new WeakMap(),
            duplicateNames: new Set(),
        };

        if (!parent) {
            return result;
        }

        ViewUtil.collectBindNodesInternal(parent, parent.name, result);
        return result;
    }

    /**
     * 把Node当前的节点树结构根据Node命名转成一个js对象,重名的组件会覆盖，
     * Node的name不应该包含空格键，否则将跳过
     * @param parent 被遍历的Node组件
     * @param obj    绑定的js对象 (可选)
     */
    static nodeTreeInfoLite(parent: Node, obj?: Map<string, Node>): Map<string, Node> | null {
        const scan = ViewUtil.collectBindNodes(parent);
        let map: Map<string, Node> = obj || new Map();
        scan.nodes.forEach((node, name) => {
            if (!map.has(name)) {
                map.set(name, node);
            }
        });
        return map;
    }

    private static collectBindNodesInternal(parent: Node, parentPath: string, result: IBindNodeScanResult): void {
        const items = parent.children;
        for (let i = 0; i < items.length; i++) {
            const node = items[i];
            const path = `${parentPath}/${node.name}`;

            if (ViewUtil.isBindNode(node)) {
                result.nodePaths.set(node, path);
                result.nodesByPath.set(path, node);

                const nodes = result.nodesByName.get(node.name) || [];
                nodes.push(node);
                result.nodesByName.set(node.name, nodes);

                if (!result.nodes.has(node.name)) {
                    result.nodes.set(node.name, node);
                } else {
                    result.duplicateNames.add(node.name);
                }
            }

            ViewUtil.collectBindNodesInternal(node, path, result);
        }
    }

    private static isBindNode(node: Node): boolean {
        for (const config of ViewUtil.UI_BIND_COMPONENT_CONFIG) {
            if (node.name.startsWith(config.prefix)) {
                return true;
            }
        }
        return false;
    }

    static findNode(parent: Node, name: string): Node | null {
        const child = parent.getChildByName(name);
        if (child) return child;
        for (const childNode of parent.children) {
            const result = childNode.getChildByName(name);
            if (result) return result;
        }
        return null;
    }


    static findNodes(reg: RegExp, parent: Node, nodes?: Array<Node>): Array<Node> {
        let ns: Array<Node> = nodes || [];
        let items = parent.children;
        for (let i = 0; i < items.length; i++) {
            let _name: string = items[i].name;
            if (reg.test(_name)) {
                ns.push(items[i]);
            }
            ViewUtil.findNodes(reg, items[i], ns);
        }
        return ns;
    };

    /**
     * 节点之间坐标互转
     * @param a         A节点
     * @param b         B节点
     * @param aPos      A节点空间中的相对位置
     */
    static calculateASpaceToBSpacePos(a: Node, b: Node, aPos: Vec3): Vec3 {
        var world: Vec3 = a.getComponent(UITransform)!.convertToWorldSpaceAR(aPos);
        var space: Vec3 = b.getComponent(UITransform)!.convertToNodeSpaceAR(world);
        return space;
    }

    /**
     * 屏幕转空间坐标
     * @param event 触摸事件
     * @param space 转到此节点的坐标空间
     */
    static calculateScreenPosToSpacePos(event: EventTouch, space: Node): Vec3 {
        let uil = event.getUILocation();
        let worldPos: Vec3 = v3(uil.x, uil.y);
        let mapPos: Vec3 = space.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
        return mapPos;
    }

    /**
     * 显示对象等比缩放
     * @param targetWidth       目标宽
     * @param targetHeight      目标高
     * @param defaultWidth      默认宽
     * @param defaultHeight     默认高
     */
    static uniformScale(targetWidth: number, targetHeight: number, defaultWidth: number, defaultHeight: number) {
        var widthRatio = defaultWidth / targetWidth;
        var heightRatio = defaultHeight / targetHeight;
        var ratio;
        widthRatio < heightRatio ? ratio = widthRatio : ratio = heightRatio;
        var size = new Size(Math.floor(targetWidth * ratio), Math.floor(targetHeight * ratio));
        return size;
    }


    /**
     * 从资源缓存中找到预制资源名并创建一个显示对象
     * @param path 资源路径
     */
    static async createPrefabNode(path: string) {
        const n = await tyou.res.loadGameObjectAsync(path);
        return n;
    }


    /*    /!**
         * 添加节点动画
         * @param path              资源路径
         * @param node              目标节点
         * @param onlyOne           是否唯一
         * @param isDefaultClip     是否播放默认动画剪辑
         *!/
        static addNodeAnimation(path: string, node: Node, onlyOne: boolean = true, isDefaultClip: boolean = false) {
            if (!node || !node.isValid) {
                return;
            }
    
            var anim = node.getComponent(Animation);
            if (anim == null) {
                anim = node.addComponent(Animation);
            }
    
            var clip = oops.res.get(path, AnimationClip) as AnimationClip;
            if (!clip) {
                return;
            }
    
            if (onlyOne && anim.getState(clip.name) && anim.getState(clip.name).isPlaying) {
                return;
            }
    
            if (isDefaultClip) {
                anim.defaultClip = clip;
                anim.play();
                return;
            }
    
            // 播放完成后恢复播放默认动画
            anim.once(Animation.EventType.FINISHED, () => {
                if (anim!.defaultClip) {
                    anim!.play();
                }
            }, this);
    
            if (anim.getState(clip.name)) {
                anim.play(clip.name);
                return
            }
            anim.createState(clip, clip!.name);
            anim.play(clip!.name);
        }*/
}

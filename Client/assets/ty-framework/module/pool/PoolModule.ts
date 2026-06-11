// PoolModule.ts
import List from "../../core/collections/List";
import {Module} from "../Module";
import {ClassPoolManager} from "./ClassPoolManager";
import {IClassPoolConfig} from "./ClassPool";
import {IPoolConfig, NodePool} from "./NodePool";
import {NodePoolManager} from "./NodePoolManager";
import {Color, Quat, Vec2, Vec3, Node} from "cc";

export class PoolModule extends Module {
    private _nodePool: NodePoolManager;
    private _classPool: ClassPoolManager;

    readonly VEC3 = "Vec3";
    readonly VEC2 = "Vec2";
    readonly COLOR = "Color";
    readonly QUAT = "Quat";

    onCreate(): void {
        this._nodePool = new NodePoolManager();
        this._classPool = new ClassPoolManager();

        // 设置默认配置
        this._classPool.setDefaultConfig({
            maxCapacity: 1000,
            cleanupInterval: 10,
            preloadCount: 1
        });
    }

    onDestroy(): void {
        this._nodePool.onDestroy();
        this._classPool.onDestroy();
    }

    async getOrCreateNodePool(config: IPoolConfig): Promise<NodePool> {
        return await this._nodePool.getOrCreatePool(config);
    }

    async instantiateAsync(assetPath: string, parent?: Node, pos?: Vec3, timeoutMs: number = 0) {
        const node = await this._nodePool.getAsync(assetPath, undefined, timeoutMs);
        if (parent) {
            node.setParent(parent);
            if (pos) {
                node.setPosition(pos);
            } else {
 /*               this.useVec3((v3) => {
                    v3.set(0, 0, 0);
                    node.setPosition(v3);
                })*/
            }
        }
        return node;
    }

    releaseNode(node: Node): boolean {
        return this._nodePool.release(node);
    }

    destroyNodePool(poolNameOrAssetPath: string) {
        this._nodePool.destroyPool(poolNameOrAssetPath);
    }

    /**
     * 使用类对象池（推荐，自动归还）
     */
    public useClass<T extends object, R>(
        configName: string,
        constructor: new () => T,
        callback: (obj: T) => R,
        resetFunc?: (obj: T) => void
    ): R {
        return this._classPool.use(configName, constructor, callback, resetFunc);
    }

    /**
     * 获取类对象（需要手动归还）
     */
    public getClass<T extends object>(
        configName: string,
        constructor?: new () => T,
        resetFunc?: (obj: T) => void
    ): T {
        return this._classPool.get(configName, constructor, resetFunc);
    }

    /**
     * 归还类对象
     */
    public releaseClass<T extends object>(configName: string, obj: T): void {
        this._classPool.release(configName, obj);
    }

    /**
     * 获取或创建类对象池（如果需要更多控制）
     */
    public getOrCreateClassPool<T extends object>(config: IClassPoolConfig<T>) {
        return this._classPool.getOrCreatePool(config);
    }

    public useVec3<R>(callback: (vec: Vec3) => R): R {
        return this.useClass(
            this.VEC3,
            Vec3,
            callback,
            (vec) => vec.set(0, 0, 0)
        );
    }

    /**
     * 获取 Vec3（需手动归还）
     */
    public getVec3(): Vec3 {
        return this.getClass(
            this.VEC3,
            Vec3,
            (vec) => vec.set(0, 0, 0)
        );
    }

    /**
     * 归还 Vec3
     */
    public releaseVec3(vec: Vec3): void {
        this.releaseClass(this.VEC3, vec);
    }

    public releaseVec3List(vecList: Vec3[] | List<Vec3>): void {
        vecList.forEach((v) => {
            this.releaseClass(this.VEC3, v);
        })
    }

    public useVec2<R>(callback: (vec: Vec2) => R): R {
        return this.useClass(
            this.VEC2,
            Vec2,
            callback,
            (vec) => vec.set(0, 0)
        );
    }

    public useColor<R>(callback: (color: Color) => R): R {
        return this.useClass(
            this.COLOR,
            Color,
            callback,
            (color) => color.set(255, 255, 255, 255)
        );
    }

    public useQuat<R>(callback: (quat: Quat) => R): R {
        return this.useClass(
            this.QUAT,
            Quat,
            callback,
            (quat) => quat.set(0, 0, 0, 1)
        );
    }


    /**
     * 更新方法
     */
    public onUpdate(dt: number): void {
        this._nodePool?.onUpdate(dt);
        this._classPool?.onUpdate(dt);
    }

    /**
     * 获取所有 Node 池的状态（调试用）
     */
    public getAllNodePoolStatus(): Array<{ poolName: string; assetPath: string; status: any }> {
        return this._nodePool?.getAllPoolStatus() ?? [];
    }
}

import {game, Node} from "cc";
import {IPoolConfig, NodePool} from "./NodePool";

/**
 * 节点池管理器
 */
export class NodePoolManager {
    // 池管理
    private readonly _pools: Map<string, NodePool> = new Map();

    // 节点到池名称的映射（用于release）
    private readonly _nodeToPoolMap: WeakMap<Node, string> = new WeakMap();

    // 配置
    private _maxInstancesPerFrame: number = 10;
    // 清理间隔
    private _cleanupInterval: number = 10000;
    private _lastCleanupTime: number = 0;


    /**
     * 设置每帧最大实例化数量
     */
    public setMaxInstancesPerFrame(count: number): void {
        this._maxInstancesPerFrame = Math.max(1, count);
    }

    /**
     * 异步创建节点池
     */
    public async createPool(config: IPoolConfig): Promise<NodePool> {
        const poolName = config.poolName || config.assetPath;
        if (this._pools.has(poolName)) {
            const pool = this._pools.get(poolName);
            console.warn(`节点池已存在: ${poolName}`);
            return pool!;
        }

        const preloadCount = Math.max(0, config.preloadCount ?? 1);

        // 创建池配置（确保有每帧实例化数量）
        const poolConfig: IPoolConfig = {
            ...config,
            preloadCount: preloadCount,
            maxInstancesPerFrame: Math.max(1, config.maxInstancesPerFrame ?? this._maxInstancesPerFrame),
            poolName: poolName
        };

        // 创建节点池
        const pool = new NodePool(poolConfig);
        this._pools.set(poolName, pool);

        // 初始化池（加载预制体）
        await pool.initializeAsync();
        // 执行预加载
        await pool.preloadAsync(preloadCount);
        return pool;
    }

    /**
     * 获取节点池
     */
    public getPool(poolName: string): NodePool | null {
        return this._pools.get(poolName) || null;
    }

    /**
     * 通过资源路径查找池
     */
    public findPoolByAssetPath(assetPath: string): NodePool | null {
        for (const pool of this._pools.values()) {
            const status = pool.getStatus();
            if (status.assetPath === assetPath) {
                return pool;
            }
        }
        return null;
    }

    /**
     * 获取或创建节点池（异步）
     */
    public async getOrCreatePool(config: IPoolConfig): Promise<NodePool> {
        const poolName = config.poolName || config.assetPath;
        const pool = this.getPool(poolName);
        if (pool) {
            pool.reset();
            return pool;
        }

        return await this.createPool(config);
    }

    /**
     * 异步获取节点
     */
    public async getAsync(assetPath: string, config?: IPoolConfig, timeoutMs: number = 0): Promise<Node> {

        // 先尝试通过资源路径查找池 这里要求 assetPath和poolname一样才可以 一般都是一样的 
        let pool = this.getPool(assetPath);

        if (!pool) {
            // 如果没有池，创建默认池
            if (config) {
                pool = await this.createPool(config);
            } else {
                pool = await this.createPool({assetPath: assetPath});
            }
        }
        const node = await pool.getAsync(timeoutMs);
        this._nodeToPoolMap.set(node, assetPath);
        return node;
    }

    public release(node: Node): boolean {
        if (!node || !node.isValid) {
            return false;
        }

        // 查找节点所属的池
        const poolName = this._nodeToPoolMap.get(node);
        if (!poolName) {
            console.warn(`无法找到节点所属的对象池: ${node.name}`);
            return false;
        }

        // 获取池
        const pool = this.getPool(poolName);
        if (!pool) {
            console.warn(`节点所属的对象池不存在: ${poolName}`);
            this._nodeToPoolMap.delete(node);
            return false;
        }

        // 释放节点
        pool.release(node);

        // 清理映射（节点回到池中后，不再需要这个映射，直到下次被取出）
        // 注意：这里不删除映射，因为节点在池中时仍然属于这个池
        // 当下次从池中取出时，会重新设置映射

        return true;
    }


    /**
     * 异步预加载节点
     */
    public async preloadAsync(assetPath: string, count: number = 1): Promise<void> {
        const pool = this.getPool(assetPath);
        if (!pool) {
            // 创建池并预加载
            await this.createPool({
                assetPath,
                maxCapacity: Math.max(50, count * 2),
                preloadCount: count
            });
        } else {
            await pool.preloadAsync(count);
        }
    }

    /**
     * 批量预加载
     */
    public async preloadBatchAsync(preloadItems: Array<{ assetPath: string; count?: number }>): Promise<void> {
        const promises = preloadItems.map(item =>
            this.preloadAsync(item.assetPath, item.count || 1)
        );

        await Promise.all(promises);
    }

    /**
     * 更新方法（需要在游戏循环中调用）
     */
    public onUpdate(dt: number): void {
        // 更新所有池
        let hasActiveTasks = false;
        for (const pool of this._pools.values()) {
            const hasTask = pool.update(dt);
            if (hasTask) {
                hasActiveTasks = true;
            }
        }

        // 定期清理
        const now = game.totalTime;//Date.now();
        if (now - this._lastCleanupTime >= this._cleanupInterval) {
            this.cleanupAll();
            this._lastCleanupTime = now;
        }
    }

    /**
     * 清理所有池
     */
    public cleanupAll(): void {
        for (const pool of this._pools.values()) {
            pool.cleanup();
        }
    }

    /**
     * 强制清理
     */
    public forceCleanup(): void {
        this.cleanupAll();
        this._lastCleanupTime = game.totalTime; //Date.now();
    }

    /**
     * 销毁所有池
     */
    public destroyAll(): void {
        for (const pool of this._pools.values()) {
            pool.destroy();
        }

        this._pools.clear();
    }

    /**
     * 获取所有池状态
     */
    public getAllPoolStatus(): Array<{ poolName: string; assetPath: string; status: any }> {
        const result: Array<{ poolName: string; assetPath: string; status: any }> = [];

        for (const [poolName, pool] of this._pools) {
            const status = pool.getStatus();
            result.push({
                poolName,
                assetPath: status.assetPath,
                status
            });
        }

        return result;
    }

    /**
     * 检查池是否存在
     */
    public hasPool(poolName: string): boolean {
        return this._pools.has(poolName);
    }

    /**
     * 销毁指定池
     */
    public destroyPool(poolName: string): void {
        const pool = this.getPool(poolName);
        if (pool) {
            pool.destroy();
            this._pools.delete(poolName);
        }
    }


    /**
     * 获取节点所属的池信息
     */
    public getNodePoolInfo(node: Node): { poolName?: string; assetPath?: string } | null {
        const poolName = this._nodeToPoolMap.get(node);
        if (!poolName) {
            return null;
        }

        const pool = this.getPool(poolName);
        if (!pool) {
            return {poolName};
        }

        const status = pool.getStatus();
        return {
            poolName,
            assetPath: status.assetPath
        };
    }

    /**
     * 初始化
     */
    public onCreate(): void {
        // 初始化逻辑
    }

    /**
     * 关闭
     */
    public onDestroy(): void {
        this.destroyAll();
    }
}

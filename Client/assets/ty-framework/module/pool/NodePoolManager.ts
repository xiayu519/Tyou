import {game, Node} from "cc";
import {IPoolConfig, NodePool} from "./NodePool";

/**
 * 节点池管理器
 */
export class NodePoolManager {
    private readonly _pools: Map<string, NodePool> = new Map();
    private readonly _nodeToPoolMap: WeakMap<Node, string> = new WeakMap();

    private _maxInstancesPerFrame: number = 10;
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
        const poolName = this._resolvePoolName(config);
        if (this._pools.has(poolName)) {
            const pool = this._pools.get(poolName)!;
            if (!pool.isDisposed) {
                console.warn(`节点池已存在: ${poolName}`);
                return pool;
            }

            this._pools.delete(poolName);
        }

        const preloadCount = Math.max(0, config.preloadCount ?? 1);

        const poolConfig: IPoolConfig = {
            ...config,
            preloadCount: preloadCount,
            maxInstancesPerFrame: Math.max(1, config.maxInstancesPerFrame ?? this._maxInstancesPerFrame),
            poolName: poolName
        };

        const pool = new NodePool(poolConfig, {
            onNodeRented: (node, ownerPool) => this._trackNodeOwner(node, ownerPool),
            onNodeDisposed: (node, ownerPool) => this._untrackNodeOwner(node, ownerPool),
            onPoolDisposed: (ownerPool) => this._unregisterPool(ownerPool)
        });
        this._pools.set(poolName, pool);

        try {
            await pool.initializeAsync();
            await pool.preloadAsync(preloadCount);
            return pool;
        } catch (error) {
            this._unregisterPool(pool);
            pool.destroy();
            throw error;
        }
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
            if (pool.assetPath === assetPath) {
                return pool;
            }
        }
        return null;
    }

    /**
     * 获取或创建节点池（异步）
     */
    public async getOrCreatePool(config: IPoolConfig): Promise<NodePool> {
        const poolName = this._resolvePoolName(config);
        const pool = this.getPool(poolName);
        if (pool && !pool.isDisposed) {
            return pool;
        }

        if (pool?.isDisposed) {
            this._pools.delete(poolName);
        }

        return await this.createPool(config);
    }

    /**
     * 异步获取节点
     */
    public async getAsync(assetPath: string, config?: IPoolConfig, timeoutMs: number = 0): Promise<Node> {
        const poolConfig = config ? {...config, assetPath: config.assetPath || assetPath} : {assetPath};
        const poolName = this._resolvePoolName(poolConfig);
        let pool = this.getPool(poolName);

        if (!pool) {
            pool = await this.createPool(poolConfig);
        }

        const node = await pool.getAsync(timeoutMs);
        this._trackNodeOwner(node, pool);
        return node;
    }

    public release(node: Node): boolean {
        if (!node) {
            return false;
        }

        const poolName = this._nodeToPoolMap.get(node);
        if (!node.isValid) {
            if (poolName) {
                this._nodeToPoolMap.delete(node);
            }
            return false;
        }

        if (!poolName) {
            console.warn(`无法找到节点所属的对象池: ${node.name}`);
            return false;
        }

        const pool = this.getPool(poolName);
        if (!pool) {
            console.warn(`节点所属的对象池不存在: ${poolName}`);
            this._nodeToPoolMap.delete(node);
            return false;
        }

        return pool.release(node);
    }


    /**
     * 异步预加载节点
     */
    public async preloadAsync(assetPath: string, count: number = 1): Promise<void> {
        const pool = this._resolveExistingPool(assetPath);
        if (!pool) {
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
        for (const pool of this._pools.values()) {
            pool.update(dt);
        }

        const now = game.totalTime;
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
        this._lastCleanupTime = game.totalTime;
    }

    /**
     * 销毁所有池
     */
    public destroyAll(): void {
        for (const pool of Array.from(this._pools.values())) {
            pool.destroy();
        }

        this._pools.clear();
    }

    /**
     * 获取所有池状态
     */
    public getAllPoolStatus(): Array<{ poolName: string; assetPath: string; status: any }> {
        const result: Array<{ poolName: string; assetPath: string; status: any }> = [];

        for (const pool of this._pools.values()) {
            const status = pool.getStatus();
            result.push({
                poolName: pool.poolName,
                assetPath: pool.assetPath,
                status
            });
        }

        return result;
    }

    /**
     * 检查池是否存在
     */
    public hasPool(poolName: string): boolean {
        return !!this._resolveExistingPool(poolName);
    }

    /**
     * 销毁指定池
     */
    public destroyPool(poolNameOrAssetPath: string): void {
        const pool = this._resolveExistingPool(poolNameOrAssetPath);
        if (pool) {
            pool.destroy();
            this._pools.delete(pool.poolName);
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

        return {
            poolName: pool.poolName,
            assetPath: pool.assetPath
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

    private _resolvePoolName(config: IPoolConfig): string {
        return config.poolName || config.assetPath;
    }

    private _resolveExistingPool(poolNameOrAssetPath: string): NodePool | null {
        return this.getPool(poolNameOrAssetPath) || this.findPoolByAssetPath(poolNameOrAssetPath);
    }

    private _trackNodeOwner(node: Node, pool: NodePool): void {
        this._nodeToPoolMap.set(node, pool.poolName);
    }

    private _untrackNodeOwner(node: Node, pool: NodePool): void {
        if (this._nodeToPoolMap.get(node) === pool.poolName) {
            this._nodeToPoolMap.delete(node);
        }
    }

    private _unregisterPool(pool: NodePool): void {
        if (this._pools.get(pool.poolName) === pool) {
            this._pools.delete(pool.poolName);
        }
    }
}

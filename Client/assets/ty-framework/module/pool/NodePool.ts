import {game, instantiate, Node} from "cc";

// 对象池配置接口
export interface IPoolConfig {
    /** 资源路径 */
    assetPath: string;
    /** 池名称 */
    poolName?: string;
    /** 最大容量 */
    maxCapacity?: number;
    /** 过期时间（秒），0表示永不过期 */
    expireTime?: number;
    /** 预加载数量 */
    preloadCount?: number;
    /** 最小保留数量（清理时至少保留的节点数） */
    minReserveCount?: number;
    /** 每帧最大实例化数量（用于分帧加载） */
    maxInstancesPerFrame?: number;
}

/**
 * 池状态枚举
 */
export enum PoolState {
    Uninitialized = 0,
    LoadingPrefab = 1,
    Preloading = 2,
    Ready = 3,
    Disposed = 4
}

/**
 * 节点池 - 专注于Node对象的管理
 */
export class NodePool {
    // 配置
    private readonly _assetPath: string;
    private readonly _poolName: string;
    private readonly _maxCapacity: number;
    private readonly _expireTime: number;
    private readonly _minReserveCount: number;
    private readonly _maxInstancesPerFrame: number;

    // 对象存储
    private readonly _availableNodes: Node[] = [];
    private readonly _allNodes: Set<Node> = new Set();
    private readonly _activeNodes: Set<Node> = new Set();

    // 资源引用
    private _prefab: any = null;
    private _prefabRefCount: number = 0;
    private _isPrefabLoading: boolean = false;
    private _prefabLoadPromise: Promise<any> | null = null;

    // 实例化队列（用于分帧加载）
    private readonly _instantiateQueue: Array<{
        count: number;
        resolve?: () => void;
        reject?: (error: any) => void;
    }> = [];
    private _instancesCreatedThisFrame: number = 0;

    // 等待中的获取请求
    private readonly _pendingGetRequests: Array<{
        resolve: (node: Node) => void;
        reject: (error: any) => void;
        requestTime: number;
        timeoutId?: any;
    }> = [];

    // 状态管理
    private _state: PoolState = PoolState.Uninitialized;
    private _initializationPromise: Promise<void> | null = null;
    private _preloadPromise: Promise<void> | null = null;
    private readonly _pendingWarningThreshold: number = 10;

    // 节点信息映射（避免在Node上直接添加属性）
    private readonly _nodeInfoMap: WeakMap<Node, {
        addTime: number;
        poolName: string;
    }> = new WeakMap();

    constructor(config: IPoolConfig) {
        this._assetPath = config.assetPath;
        this._poolName = config.poolName || config.assetPath;
        this._maxCapacity = config.maxCapacity || 200;
        //game时间是ms
        this._expireTime = (config.expireTime || 10) * 1000;
        this._maxInstancesPerFrame = Math.max(1, config.maxInstancesPerFrame ?? 10);
        const preloadCount = Math.max(0, config.preloadCount ?? 0);
        this._minReserveCount = config.minReserveCount ?? preloadCount;
    }


    /**
     * 获取游戏总时间（秒）
     */
    private _getGameTotalTime(): number {
        return game.totalTime; // 直接使用 game.totalTime
    }

    /**
     * 重置池状态
     */
    public reset(): void {
        this._state = PoolState.Ready;
    }

    /**
     * 异步初始化池（加载预制体）
     */
    public async initializeAsync(): Promise<void> {
        if (this._state !== PoolState.Uninitialized && this._state !== PoolState.Disposed) {
            return;
        }

        if (this._initializationPromise) {
            return this._initializationPromise;
        }

        this._state = PoolState.LoadingPrefab;
        this._initializationPromise = this._initializeInternal();

        try {
            await this._initializationPromise;
        } finally {
            this._initializationPromise = null;
        }
    }

    /**
     * 异步初始化内部实现
     */
    private async _initializeInternal(): Promise<void> {
        try {
            // 加载预制体
            this._prefab = await tyou.res.loadAssetAsync(this._assetPath);
            this._prefabRefCount = 0;
            this._state = PoolState.Ready;

            console.log(`节点池初始化完成: ${this._assetPath}`);
        } catch (error) {
            this._state = PoolState.Uninitialized;
            console.error(`节点池初始化失败: ${this._assetPath}`, error);
            throw error;
        }
    }

    /**
     * 异步预加载节点
     */
    public async preloadAsync(count: number): Promise<void> {
        if (this._state === PoolState.Disposed) {
            throw new Error("节点池已销毁");
        }

        // 等待池初始化完成
        if (this._state !== PoolState.Ready) {
            await this.initializeAsync();
        }

        if (this._preloadPromise) {
            return this._preloadPromise;
        }

        const targetCount = Math.min(count, this._maxCapacity - this._allNodes.size);
        if (targetCount <= 0) {
            return;
        }

        console.log(`开始预加载: ${this._assetPath}，数量: ${targetCount}`);

        // 创建预加载任务并等待完成
        this._state = PoolState.Preloading;
        this._preloadPromise = new Promise<void>((resolve, reject) => {
            this._instantiateQueue.push({
                count: targetCount,
                resolve: () => {
                    console.log(`预加载完成: ${this._assetPath}，数量: ${targetCount}`);
                    this._state = PoolState.Ready;
                    resolve();
                },
                reject: (error) => {
                    console.error(`预加载失败: ${this._assetPath}`, error);
                    this._state = PoolState.Ready;
                    reject(error);
                }
            });
        });

        try {
            await this._preloadPromise;
        } finally {
            this._preloadPromise = null;
        }
    }

    /**
     * 异步获取节点 - 核心方法
     */
    public async getAsync(timeoutMs: number = 0): Promise<Node> {
        if (this._state === PoolState.Disposed) {
            throw new Error("节点池已销毁");
        }

        // 等待池初始化完成
        if (this._state !== PoolState.Ready) {
            await this.initializeAsync();
        }

        // 等待预加载完成（如果有）
        if (this._preloadPromise) {
            await this._preloadPromise;
        }

        // 1. 尝试从可用队列获取
        const availableNode = this._tryGetFromAvailable();
        if (availableNode) {
            return availableNode;
        }

        // 2. 检查是否可以创建新节点
        if (this._allNodes.size < this._maxCapacity) {
            const newNode = this._createNode();
            if (newNode) {
                this._allNodes.add(newNode);
                this._activeNodes.add(newNode);
                this._prefabRefCount++;
                return newNode;
            }
        }

        // 3. 如果池已满，等待节点释放
        return new Promise<Node>((resolve, reject) => {
            const request = {
                resolve,
                reject,
                requestTime: this._getGameTotalTime(),
                timeoutId: undefined as any
            };

            if (timeoutMs > 0) {
                request.timeoutId = setTimeout(() => {
                    const index = this._pendingGetRequests.indexOf(request);
                    if (index >= 0) {
                        this._pendingGetRequests.splice(index, 1);
                        reject(new Error(`获取节点超时: ${this._assetPath}, timeout=${timeoutMs}ms`));
                    }
                }, timeoutMs);
            }

            this._pendingGetRequests.push(request);
            if (this._pendingGetRequests.length >= this._pendingWarningThreshold) {
                console.warn(`节点池等待队列过长: ${this._assetPath}, pending=${this._pendingGetRequests.length}`);
            }
        });
    }

    /**
     * 尝试从可用队列获取节点
     */
    private _tryGetFromAvailable(): Node | null {
        while (this._availableNodes.length > 0) {
            const node = this._availableNodes.pop()!;

            // 检查节点是否有效
            if (!this._isNodeValid(node)) {
                this._allNodes.delete(node);
                continue;
            }

            return this._activateNode(node);
        }

        return null;
    }

    /**
     * 归还节点
     */
    public release(node: Node): void {
        if (this._state === PoolState.Disposed) {
            return;
        }

        if (!this._allNodes.has(node)) {
            Log.error(`尝试归还不属于此池的节点: ${this._assetPath}`);
            return;
        }

        // 如果节点不是活跃的，直接返回
        if (!this._activeNodes.has(node)) {
            return;
        }

        // 重置节点状态
        this._resetNode(node);

        // 移动到可用队列
        this._activeNodes.delete(node);
        this._availableNodes.push(node);

        // 检查是否有等待中的请求
        this._processPendingRequests();
    }

    /**
     * 处理等待中的获取请求
     */
    private _processPendingRequests(): void {
        while (this._pendingGetRequests.length > 0 && this._availableNodes.length > 0) {
            const request = this._pendingGetRequests.shift()!;
            const availableNode = this._tryGetFromAvailable();
            if (availableNode) {
                if (request.timeoutId) {
                    clearTimeout(request.timeoutId);
                }
                request.resolve(availableNode);
            } else {
                // 如果没有可用节点，将请求放回队列
                this._pendingGetRequests.unshift(request);
                break;
            }
        }
    }

    /**
     * 更新方法（需要在游戏循环中调用）
     * @param dt 帧时间
     * @returns 是否有任务在执行
     */
    public update(dt: number): boolean {
        this._instancesCreatedThisFrame = 0;

        // 处理实例化队列
        return this._processInstantiateQueue();
    }

    /**
     * 清理过期节点
     */
    public cleanup(): void {
       // console.log("cleanup==", this._assetPath, this._state)
        if (this._state === PoolState.Disposed || this._expireTime <= 0) {
            return;
        }

        const now = this._getGameTotalTime();//Date.now();
        const expiredTime = this._expireTime;

/*        // 收集过期节点
        const expiredNodes: Node[] = [];

        for (const node of this._availableNodes) {
            // 检查节点是否已被使用
            if (this._activeNodes.has(node)) {
                continue;
            }

            // 使用WeakMap获取节点信息
            const nodeInfo = this._nodeInfoMap.get(node);
            if (nodeInfo) {
                const timeSinceLastUse = now - nodeInfo.addTime;
                if (timeSinceLastUse > expiredTime) {
                    expiredNodes.push(node);
                }
            }
        }

        // 清理过期节点
        for (const node of expiredNodes) {
            this._destroyNode(node);
        }*/

        // 清理过期节点（最多清理maxToClean个）
        let cleanedCount = 0;
        const currentAvailable = this._availableNodes.length;
        const maxToClean = Math.max(0, currentAvailable - this._minReserveCount);
        // 注意：从后往前清理，避免索引变化问题
        for (let i = this._availableNodes.length - 1; i >= 0 && cleanedCount < maxToClean; i--) {
            const node = this._availableNodes[i];

            // 再次检查是否过期
            if (this._activeNodes.has(node)) {
                continue;
            }

            const nodeInfo = this._nodeInfoMap.get(node);
            if (nodeInfo) {
                const timeSinceLastUse = now - nodeInfo.addTime;
                if (timeSinceLastUse > expiredTime) {
                    // 清理这个节点
                    this._availableNodes.splice(i, 1);
                    this._destroyNode(node);
                    cleanedCount++;

                    // 检查是否达到最大清理数量
                    if (cleanedCount >= maxToClean) {
                        break;
                    }
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`清理过期节点: ${this._assetPath}`);
            console.log(`  清理数量: ${cleanedCount}`);
            console.log(`  清理前可用: ${currentAvailable}`);
            console.log(`  清理后可用: ${this._availableNodes.length}`);
            console.log(`  最小保留数: ${this._minReserveCount}`);
            console.log(`  活跃节点数: ${this._activeNodes.size}`);
        }
    }


    /**
     * 释放所有活跃节点到对象池
     * 用于游戏进程中重置/重新开始，但保留池状态
     */
    public releaseAll(): void {
        if (this._state === PoolState.Disposed) {
            return;
        }

        console.log(`开始释放所有节点: ${this._assetPath}，活跃节点数: ${this._activeNodes.size}`);

        // 复制活跃节点集合，因为我们在循环中会修改_activeNodes
        const activeNodes = Array.from(this._activeNodes);

        // 遍历并释放所有活跃节点
        for (const node of activeNodes) {
            // 检查节点是否仍然活跃且有效
            if (this._activeNodes.has(node) && this._isNodeValid(node)) {
                this.release(node);
            }
        }

        // 处理等待中的请求
        this._processPendingRequests();

        console.log(`释放所有节点完成: ${this._assetPath}，当前可用节点数: ${this._availableNodes.length}`);
    }

    /**
     * 销毁池
     */
    public destroy(): void {
        if (this._state === PoolState.Disposed) {
            return;
        }

        // 清理所有等待中的请求
        for (const request of this._pendingGetRequests) {
            if (request.timeoutId) {
                clearTimeout(request.timeoutId);
            }
            request.reject(new Error("对象池已销毁"));
        }
        this._pendingGetRequests.length = 0;

        // 清理实例化队列
        for (const task of this._instantiateQueue) {
            task.reject?.(new Error("对象池已销毁"));
        }
        this._instantiateQueue.length = 0;

        // 销毁所有节点
        for (const node of this._allNodes) {
            this._destroyNode(node);
        }

        this._allNodes.clear();
        this._activeNodes.clear();
        this._availableNodes.length = 0;
        this._instancesCreatedThisFrame = 0;

        // 卸载预制体
        this._unloadPrefab();

        this._state = PoolState.Disposed;
        console.log(`节点池已销毁: ${this._assetPath}`);
    }

    /**
     * 获取池状态
     */
    public getStatus() {
        return {
            assetPath: this._assetPath,
            poolName: this._poolName,
            state: PoolState[this._state],
            totalCount: this._allNodes.size,
            availableCount: this._availableNodes.length,
            activeCount: this._activeNodes.size,
            maxCapacity: this._maxCapacity,
            minReserveCount: this._minReserveCount,
            expireTime: this._expireTime,
            prefabLoaded: !!this._prefab,
            prefabRefCount: this._prefabRefCount,
            instantiateQueueLength: this._instantiateQueue.length,
            pendingRequests: this._pendingGetRequests.length,
            oldestPendingWaitTime: this._getOldestPendingWaitTime(),
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 卸载预制体
     */
    private _unloadPrefab(): void {
        if (this._prefab) {
            tyou.res.decRef(this._prefab);
            this._prefab = null;
            this._prefabRefCount = 0;
        }
    }

    private _getOldestPendingWaitTime(): number {
        if (this._pendingGetRequests.length === 0) {
            return 0;
        }

        const now = this._getGameTotalTime();
        let oldest = now;
        for (const request of this._pendingGetRequests) {
            if (request.requestTime < oldest) {
                oldest = request.requestTime;
            }
        }
        return now - oldest;
    }

    /**
     * 创建节点
     */
    private _createNode(): Node | null {
        if (!this._prefab) {
            console.error(`预制体未加载: ${this._assetPath}`);
            return null;
        }

        try {
            const node = instantiate(this._prefab);
            node.name = `${this._poolName}_${this._getGameTotalTime()}_${this._allNodes.size}`;
            node.active = true;

            // 使用WeakMap存储节点信息，避免在Node上直接添加属性
            this._nodeInfoMap.set(node, {
                addTime: this._getGameTotalTime(),
                poolName: this._poolName
            });

            return node;
        } catch (error) {
            console.error(`实例化节点失败: ${this._assetPath}`, error);
            return null;
        }
    }

    /**
     * 激活节点
     */
    private _activateNode(node: Node): Node {
        // 激活节点
        node.active = true;
        this._activeNodes.add(node);

        return node;
    }

    /**
     * 重置节点状态
     */
    private _resetNode(node: Node): void {
        // 重置节点属性
        node.active = false;

        // 重置位置、旋转、缩放
        node.setPosition(-9999, 0, 0);
        node.setRotationFromEuler(0, 0, 0);
        node.setScale(1, 1, 1);

        // 如果有重置方法，调用它
        if (typeof (node as any).reset === 'function') {
            (node as any).reset();
        }

        // 更新节点添加时间（用于过期清理）
        const nodeInfo = this._nodeInfoMap.get(node);
        if (nodeInfo) {
            nodeInfo.addTime = this._getGameTotalTime();//Date.now();
        }
    }

    /**
     * 销毁节点
     */
    private _destroyNode(node: Node): void {
        // 从集合中移除
        this._allNodes.delete(node);
        this._activeNodes.delete(node);

        const index = this._availableNodes.indexOf(node);
        if (index > -1) {
            this._availableNodes.splice(index, 1);
        }

        // 清理节点信息
        this._nodeInfoMap.delete(node);

        // 减少预制体引用计数
        this._prefabRefCount = Math.max(0, this._prefabRefCount - 1);

        // 销毁节点
        if (node.isValid) {
            node.destroy();
        }
    }

    /**
     * 检查节点是否有效
     */
    private _isNodeValid(node: Node): boolean {
        return node && node.isValid;
    }

    /**
     * 处理实例化队列（分帧执行）
     */
    private _processInstantiateQueue(): boolean {
        // 如果没有任务，直接返回
        if (this._instantiateQueue.length === 0) {
            return false;
        }

        const task = this._instantiateQueue[0];

        // 确保预制体已加载
        if (!this._prefab) {
            console.warn(`预制体未加载，无法实例化: ${this._assetPath}`);
            task.reject?.(new Error('Prefab not loaded'));
            this._instantiateQueue.shift();
            return false;
        }

        // 检查容量
        if (this._allNodes.size >= this._maxCapacity) {
            console.warn(`节点池已满: ${this._assetPath}`);
            task.reject?.(new Error('Pool is full'));
            this._instantiateQueue.shift();
            return false;
        }

        // 本帧实例化数量
        const instancesThisFrame = Math.min(
            this._maxInstancesPerFrame - this._instancesCreatedThisFrame,
            task.count
        );

        // 实例化节点
        for (let i = 0; i < instancesThisFrame; i++) {
            if (this._allNodes.size >= this._maxCapacity) {
                break;
            }

            const node = this._createNode();
            if (node) {
                this._allNodes.add(node);
                this._availableNodes.push(node);

                // 增加预制体引用计数
                this._prefabRefCount++;

                this._instancesCreatedThisFrame++;
                task.count--;
            }
        }

        // 检查任务是否完成
        if (task.count <= 0) {
            this._instantiateQueue.shift();
            task.resolve?.();
            return false;
        }

        return true;
    }


    public forceDestroyNode(node: Node): void {
        if (!this._allNodes.has(node)) {
            return;
        }

        // 标记节点为已销毁状态
        if (this._activeNodes.has(node)) {
            this._activeNodes.delete(node);
        }

        // 从所有节点集合中移除
        this._allNodes.delete(node);

        // 从可用队列中移除
        const index = this._availableNodes.indexOf(node);
        if (index > -1) {
            this._availableNodes.splice(index, 1);
        }

        // 清理节点信息
        this._nodeInfoMap.delete(node);

        // 减少预制体引用计数
        this._prefabRefCount = Math.max(0, this._prefabRefCount - 1);

        console.log(`节点被强制销毁: ${this._assetPath}`);
    }
}

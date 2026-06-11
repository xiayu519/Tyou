import {game, instantiate, Node} from "cc";

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

export enum PoolState {
    Uninitialized = 0,
    LoadingPrefab = 1,
    Preloading = 2,
    Ready = 3,
    Disposed = 4
}

interface INodePoolLifecycleHooks {
    onNodeRented?: (node: Node, pool: NodePool) => void;
    onNodeDisposed?: (node: Node, pool: NodePool) => void;
    onPoolDisposed?: (pool: NodePool) => void;
}

export class NodePool {
    private readonly _assetPath: string;
    private readonly _poolName: string;
    private readonly _maxCapacity: number;
    private readonly _expireTime: number;
    private readonly _minReserveCount: number;
    private readonly _maxInstancesPerFrame: number;

    private readonly _availableNodes: Node[] = [];
    private readonly _allNodes: Set<Node> = new Set();
    private readonly _activeNodes: Set<Node> = new Set();

    private _prefab: any = null;
    private _prefabRefCount: number = 0;

    private readonly _instantiateQueue: Array<{
        count: number;
        resolve?: () => void;
        reject?: (error: any) => void;
    }> = [];
    private _instancesCreatedThisFrame: number = 0;

    private readonly _pendingGetRequests: Array<{
        resolve: (node: Node) => void;
        reject: (error: any) => void;
        requestTime: number;
        timeoutId?: any;
    }> = [];

    private _state: PoolState = PoolState.Uninitialized;
    private _initializationPromise: Promise<void> | null = null;
    private _preloadPromise: Promise<void> | null = null;
    private readonly _pendingWarningThreshold: number = 10;
    private readonly _hooks: INodePoolLifecycleHooks;

    private readonly _nodeInfoMap: WeakMap<Node, {
        addTime: number;
        poolName: string;
    }> = new WeakMap();

    constructor(config: IPoolConfig, hooks: INodePoolLifecycleHooks = {}) {
        this._assetPath = config.assetPath;
        this._poolName = config.poolName || config.assetPath;
        this._maxCapacity = config.maxCapacity || 200;
        this._expireTime = (config.expireTime ?? 10) * 1000;
        this._maxInstancesPerFrame = Math.max(1, config.maxInstancesPerFrame ?? 10);
        const preloadCount = Math.max(0, config.preloadCount ?? 0);
        this._minReserveCount = config.minReserveCount ?? preloadCount;
        this._hooks = hooks;
    }

    public get assetPath(): string {
        return this._assetPath;
    }

    public get poolName(): string {
        return this._poolName;
    }

    public get isDisposed(): boolean {
        return this._state === PoolState.Disposed;
    }

    /**
     * Cocos game.totalTime 单位是毫秒。
     */
    private _getGameTotalTime(): number {
        return game.totalTime;
    }

    public reset(): void {
        if (this._state !== PoolState.Disposed && this._prefab) {
            this._state = PoolState.Ready;
        }
    }

    public async initializeAsync(): Promise<void> {
        if (this.isDisposed) {
            throw new Error("节点池已销毁");
        }

        if (this._initializationPromise) {
            return this._initializationPromise;
        }

        if (this._state !== PoolState.Uninitialized) {
            return;
        }

        this._state = PoolState.LoadingPrefab;
        this._initializationPromise = this._initializeInternal();

        try {
            await this._initializationPromise;
        } finally {
            this._initializationPromise = null;
        }
    }

    private async _initializeInternal(): Promise<void> {
        try {
            const prefab = await tyou.res.loadAssetAsync(this._assetPath);
            if (!prefab) {
                throw new Error(`Prefab 加载结果为空: ${this._assetPath}`);
            }

            if (this._state === PoolState.Disposed) {
                tyou.res.decRef(prefab);
                throw new Error("节点池已销毁");
            }

            this._prefab = prefab;
            this._prefabRefCount = 0;
            this._state = PoolState.Ready;

            console.log(`节点池初始化完成: ${this._assetPath}`);
        } catch (error) {
            if (this._state !== PoolState.Disposed) {
                this._state = PoolState.Uninitialized;
            }
            console.error(`节点池初始化失败: ${this._assetPath}`, error);
            throw error;
        }
    }

    public async preloadAsync(count: number): Promise<void> {
        if (this.isDisposed) {
            throw new Error("节点池已销毁");
        }

        if (this._state !== PoolState.Ready) {
            await this.initializeAsync();
        }

        if (this.isDisposed) {
            throw new Error("节点池已销毁");
        }

        if (this._preloadPromise) {
            return this._preloadPromise;
        }

        const targetCount = Math.min(count, this._maxCapacity - this._allNodes.size);
        if (targetCount <= 0) {
            return;
        }

        console.log(`开始预加载: ${this._assetPath}，数量: ${targetCount}`);

        this._state = PoolState.Preloading;
        this._preloadPromise = new Promise<void>((resolve, reject) => {
            this._instantiateQueue.push({
                count: targetCount,
                resolve: () => {
                    console.log(`预加载完成: ${this._assetPath}，数量: ${targetCount}`);
                    this._setReadyIfAlive();
                    resolve();
                },
                reject: (error) => {
                    console.error(`预加载失败: ${this._assetPath}`, error);
                    this._setReadyIfAlive();
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

    public async getAsync(timeoutMs: number = 0): Promise<Node> {
        if (this.isDisposed) {
            throw new Error("节点池已销毁");
        }

        if (this._state !== PoolState.Ready) {
            await this.initializeAsync();
        }

        if (this._preloadPromise) {
            await this._preloadPromise;
        }

        if (this._state === PoolState.Disposed) {
            throw new Error("节点池已销毁");
        }

        const availableNode = this._tryGetFromAvailable();
        if (availableNode) {
            return availableNode;
        }

        if (this._allNodes.size < this._maxCapacity) {
            const newNode = this._createNode();
            if (!newNode) {
                throw new Error(`实例化节点失败: ${this._assetPath}`);
            }

            this._registerNode(newNode);
            return this._activateNode(newNode);
        }

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
     * 尝试从可用队列获取节点。
     */
    private _tryGetFromAvailable(): Node | null {
        while (this._availableNodes.length > 0) {
            const node = this._availableNodes.pop()!;

            if (!this._isNodeValid(node)) {
                this._forgetNode(node);
                continue;
            }

            return this._activateNode(node);
        }

        return null;
    }

    public release(node: Node): boolean {
        if (this._state === PoolState.Disposed) {
            return false;
        }

        if (!this._allNodes.has(node)) {
            console.warn(`尝试归还不属于此池的节点: ${this._assetPath}`);
            return false;
        }

        if (!this._isNodeValid(node)) {
            this._forgetNode(node);
            this._processPendingRequests();
            return false;
        }

        if (!this._activeNodes.has(node)) {
            return false;
        }

        this._resetNode(node);
        this._activeNodes.delete(node);
        this._availableNodes.push(node);
        this._processPendingRequests();
        return true;
    }

    private _processPendingRequests(): void {
        while (this._state !== PoolState.Disposed && this._pendingGetRequests.length > 0) {
            const request = this._pendingGetRequests.shift()!;

            let node = this._tryGetFromAvailable();
            if (!node && this._allNodes.size < this._maxCapacity) {
                const newNode = this._createNode();
                if (newNode) {
                    this._registerNode(newNode);
                    node = this._activateNode(newNode);
                }
            }

            if (node) {
                this._clearPendingTimeout(request);
                request.resolve(node);
            } else {
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
        if (this._state === PoolState.Disposed) {
            return false;
        }

        this._instancesCreatedThisFrame = 0;
        return this._processInstantiateQueue();
    }

    public cleanup(): void {
        if (this._state === PoolState.Disposed || this._expireTime <= 0) {
            return;
        }

        const now = this._getGameTotalTime();
        const expiredTime = this._expireTime;

        let cleanedCount = 0;
        const currentAvailable = this._availableNodes.length;
        const maxToClean = Math.max(0, currentAvailable - this._minReserveCount);
        for (let i = this._availableNodes.length - 1; i >= 0 && cleanedCount < maxToClean; i--) {
            const node = this._availableNodes[i];

            if (this._activeNodes.has(node)) {
                continue;
            }

            const nodeInfo = this._nodeInfoMap.get(node);
            if (nodeInfo) {
                const timeSinceLastUse = now - nodeInfo.addTime;
                if (timeSinceLastUse > expiredTime) {
                    this._availableNodes.splice(i, 1);
                    this._destroyNode(node);
                    cleanedCount++;

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


    public releaseAll(): void {
        if (this._state === PoolState.Disposed) {
            return;
        }

        console.log(`开始释放所有节点: ${this._assetPath}，活跃节点数: ${this._activeNodes.size}`);

        const activeNodes = Array.from(this._activeNodes);
        for (const node of activeNodes) {
            if (this._activeNodes.has(node) && this._isNodeValid(node)) {
                this.release(node);
            } else if (this._activeNodes.has(node)) {
                this._forgetNode(node);
            }
        }

        this._processPendingRequests();

        console.log(`释放所有节点完成: ${this._assetPath}，当前可用节点数: ${this._availableNodes.length}`);
    }

    public destroy(): void {
        if (this._state === PoolState.Disposed) {
            return;
        }

        this._state = PoolState.Disposed;
        const disposedError = new Error("对象池已销毁");

        this._rejectPendingRequests(disposedError);
        this._rejectInstantiateQueue(disposedError);

        const allNodes = Array.from(this._allNodes);
        for (const node of allNodes) {
            this._destroyNode(node);
        }

        this._allNodes.clear();
        this._activeNodes.clear();
        this._availableNodes.length = 0;
        this._instancesCreatedThisFrame = 0;

        this._unloadPrefab();

        this._hooks.onPoolDisposed?.(this);
        console.log(`节点池已销毁: ${this._assetPath}`);
    }

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

    private _unloadPrefab(): void {
        if (this._prefab) {
            tyou.res.decRef(this._prefab);
            this._prefab = null;
            this._prefabRefCount = 0;
        }
    }

    private _setReadyIfAlive(): void {
        if (this._state !== PoolState.Disposed) {
            this._state = PoolState.Ready;
        }
    }

    private _clearPendingTimeout(request: { timeoutId?: any }): void {
        if (request.timeoutId) {
            clearTimeout(request.timeoutId);
            request.timeoutId = undefined;
        }
    }

    private _rejectPendingRequests(error: Error): void {
        for (const request of this._pendingGetRequests) {
            this._clearPendingTimeout(request);
            request.reject(error);
        }
        this._pendingGetRequests.length = 0;
    }

    private _rejectInstantiateQueue(error: Error): void {
        for (const task of this._instantiateQueue) {
            task.reject?.(error);
        }
        this._instantiateQueue.length = 0;
        this._preloadPromise = null;
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

    private _createNode(): Node | null {
        if (!this._prefab) {
            console.error(`预制体未加载: ${this._assetPath}`);
            return null;
        }

        try {
            const node = instantiate(this._prefab);
            node.name = `${this._poolName}_${this._getGameTotalTime()}_${this._allNodes.size}`;
            node.active = false;

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

    private _registerNode(node: Node): void {
        this._allNodes.add(node);
        this._prefabRefCount++;
    }

    private _activateNode(node: Node): Node {
        node.active = true;
        this._activeNodes.add(node);
        this._hooks.onNodeRented?.(node, this);
        return node;
    }

    private _resetNode(node: Node): void {
        node.active = false;
        node.setPosition(-9999, 0, 0);
        node.setRotationFromEuler(0, 0, 0);
        node.setScale(1, 1, 1);

        if (typeof (node as any).reset === 'function') {
            (node as any).reset();
        }

        const nodeInfo = this._nodeInfoMap.get(node);
        if (nodeInfo) {
            nodeInfo.addTime = this._getGameTotalTime();
        }
    }

    private _destroyNode(node: Node): void {
        this._forgetNode(node);
        if (node?.isValid) {
            node.destroy();
        }
    }

    private _forgetNode(node: Node): void {
        if (!this._allNodes.has(node)) {
            return;
        }

        this._allNodes.delete(node);
        this._activeNodes.delete(node);

        const index = this._availableNodes.indexOf(node);
        if (index > -1) {
            this._availableNodes.splice(index, 1);
        }

        this._nodeInfoMap.delete(node);
        this._prefabRefCount = Math.max(0, this._prefabRefCount - 1);
        this._hooks.onNodeDisposed?.(node, this);
    }

    private _isNodeValid(node: Node): boolean {
        return node && node.isValid;
    }

    private _processInstantiateQueue(): boolean {
        if (this._state === PoolState.Disposed || this._instantiateQueue.length === 0) {
            return false;
        }

        const task = this._instantiateQueue[0];

        if (!this._prefab) {
            console.warn(`预制体未加载，无法实例化: ${this._assetPath}`);
            task.reject?.(new Error('Prefab not loaded'));
            this._instantiateQueue.shift();
            return false;
        }

        if (this._allNodes.size >= this._maxCapacity) {
            console.warn(`节点池已满: ${this._assetPath}`);
            task.reject?.(new Error('Pool is full'));
            this._instantiateQueue.shift();
            return false;
        }

        const instancesThisFrame = Math.min(
            this._maxInstancesPerFrame - this._instancesCreatedThisFrame,
            task.count
        );

        for (let i = 0; i < instancesThisFrame; i++) {
            if (this._allNodes.size >= this._maxCapacity) {
                break;
            }

            const node = this._createNode();
            if (node) {
                this._registerNode(node);
                this._availableNodes.push(node);
                this._instancesCreatedThisFrame++;
                task.count--;
            } else {
                task.reject?.(new Error(`实例化节点失败: ${this._assetPath}`));
                this._instantiateQueue.shift();
                this._setReadyIfAlive();
                return false;
            }
        }

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

        this._destroyNode(node);
        this._processPendingRequests();
        console.log(`节点被强制销毁: ${this._assetPath}`);
    }
}

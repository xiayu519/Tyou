// ClassPool.ts
import {game} from "cc";

// 对象池配置接口
export interface IClassPoolConfig<T extends object> {
    /** 池名称 */
    poolName: string;
    /** 类构造函数 */
    constructor: new () => T;
    /** 预加载数量 */
    preloadCount?: number;
    /** 最大容量 */
    maxCapacity?: number;
    /** 清理间隔时间（秒），0表示不清理 */
    cleanupInterval?: number;
    /** 最小保留数量（清理时至少保留的对象数） */
    minReserveCount?: number;
    /** 重置函数（可选） */
    resetFunc?: (obj: T) => void;
    /** 销毁函数（可选） */
    destroyFunc?: (obj: T) => void;
}

/**
 * 类对象池 - 通用对象池实现
 */
export class ClassPool<T extends object> {
    // 配置
    private readonly _poolName: string;
    private readonly _constructor: new () => T;
    private readonly _maxCapacity: number;
    private readonly _cleanupInterval: number;
    private readonly _resetFunc?: (obj: T) => void;
    private readonly _destroyFunc?: (obj: T) => void;
    private readonly _preloadCount: number = 0;
    private readonly _minReserveCount: number = 0;


    // 对象存储
    private readonly _availableObjects: T[] = [];
    private readonly _allObjects: Set<T> = new Set();
    private readonly _activeObjects: Set<T> = new Set();

    // 时间管理
    private _lastCleanupTime: number = 0;
    private readonly _objectReturnTime: WeakMap<T, number> = new WeakMap();

    // 统计信息
    private _totalCreated: number = 0;
    private _totalReused: number = 0;

    constructor(config: IClassPoolConfig<T>) {
        this._poolName = config.poolName;
        this._constructor = config.constructor;
        this._maxCapacity = config.maxCapacity || 200;
        this._cleanupInterval = (config.cleanupInterval ?? 10) * 1000; // 转换为毫秒
        this._resetFunc = config.resetFunc;
        this._destroyFunc = config.destroyFunc;
        this._preloadCount = config.preloadCount || 0;
        this._minReserveCount = config.minReserveCount ?? this._preloadCount;

        // 预加载
        const preloadCount = config.preloadCount || 0;
        if (preloadCount > 0) {
            this.preload(preloadCount);
        }
    }

    /**
     * 获取游戏总时间（毫秒）
     */
    private _getGameTotalTime(): number {
        return game.totalTime; // 转换为毫秒
    }

    /**
     * 预加载对象
     */
    public preload(count: number): void {
        const targetCount = Math.min(
            count,
            this._maxCapacity - this._allObjects.size
        );

        for (let i = 0; i < targetCount; i++) {
            const obj = this._createObject();
            if (obj) {
                this._availableObjects.push(obj);
                this._allObjects.add(obj);
                this._totalCreated++;
            }
        }
    }

    /**
     * 获取对象
     */
    public get(): T {
        // 1. 尝试从可用队列获取
        let obj: T | undefined;

        while (this._availableObjects.length > 0) {
            obj = this._availableObjects.pop();
            if (obj !== undefined) {
                this._totalReused++;
                break;
            }
        }

        // 2. 如果可用队列为空且未达容量上限，创建新对象
        if (!obj && this._allObjects.size < this._maxCapacity) {
            obj = this._createObject();
            if (obj) {
                this._allObjects.add(obj);
                this._totalCreated++;
            }
        }

        // 3. 激活对象
        if (obj) {
            this._activateObject(obj);
            return obj;
        }

        // 4. 池已满，返回新对象但不放入池中
        console.warn(`对象池已满: ${this._poolName}, 创建新对象但不放入池中`);
        return new this._constructor();
    }

    /**
     * 归还对象
     */
    public release(obj: T): void {
        if (!this._allObjects.has(obj)) {
            // 不是池创建的对象，直接忽略
            return;
        }

        if (!this._activeObjects.has(obj)) {
            console.warn(`对象重复归还: ${this._poolName}`);
            return;
        }

        // 先重置对象；如果业务重置逻辑抛错，保持 active 状态，避免对象落入无归属状态。
        this._resetObject(obj);

        // 归还不会增加池内对象总数，因此不需要再次判断最大容量。
        this._activeObjects.delete(obj);
        this._availableObjects.push(obj);
        this._objectReturnTime.set(obj, this._getGameTotalTime());
    }

    /**
     * 批量获取对象
     */
    public getBatch(count: number): T[] {
        const result: T[] = [];
        for (let i = 0; i < count; i++) {
            const obj = this.get();
            result.push(obj);
        }
        return result;
    }

    /**
     * 批量归还对象
     */
    public releaseBatch(objects: T[]): void {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    /**
     * 安全使用模式（自动归还）
     */
    public use<R>(callback: (obj: T) => R): R {
        const obj = this.get();
        try {
            return callback(obj);
        } finally {
            this.release(obj);
        }
    }

    /**
     * 更新方法（定期清理）
     */
    public update(dt: number): void {
        if (this._cleanupInterval <= 0) {
            return;
        }

        const now = this._getGameTotalTime();
        if (now - this._lastCleanupTime >= this._cleanupInterval) {
            this._cleanupExpiredObjects();
            this._lastCleanupTime = now;
           // console.log("类对象池回池", this._cleanupInterval, this.getStatus())
        }
    }

    /**
     * 清理过期对象
     */
    private _cleanupExpiredObjects(): void {
        if (this._cleanupInterval <= 0) {
            return;
        }

        const now = this._getGameTotalTime();
        const expiredTime = now - this._cleanupInterval;

        const currentAvailable = this._availableObjects.length;
        let cleanedCount = 0;
        for (let i = this._availableObjects.length - 1; i >= 0; i--) {
            // 检查是否已经清理了足够数量
            const remainingAfterClean = this._availableObjects.length - cleanedCount;
            if (remainingAfterClean <= this._minReserveCount) {
                break;
            }

            const obj = this._availableObjects[i];
            const returnTime = this._objectReturnTime.get(obj);

            // 只清理过期的
            if (returnTime && returnTime < expiredTime) {
                this._availableObjects.splice(i, 1);
                this._destroyObject(obj);
                this._allObjects.delete(obj);
                this._objectReturnTime.delete(obj);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`清理过期对象: ${this._poolName}`);
            console.log(`  清理数量: ${cleanedCount}`);
            console.log(`  清理前可用: ${currentAvailable}`);
            console.log(`  清理后可用: ${this._availableObjects.length}`);
            console.log(`  最小保留数: ${this._minReserveCount}`);
        }
    }

    /**
     * 强制清理所有可用对象
     */
    public cleanup(): void {
        for (const obj of this._availableObjects) {
            this._destroyObject(obj);
            this._allObjects.delete(obj);
        }
        this._availableObjects.length = 0;
    }

    /**
     * 释放所有活跃对象
     */
    public releaseAll(): void {
        const activeObjects = Array.from(this._activeObjects);
        for (const obj of activeObjects) {
            this.release(obj);
        }
    }

    /**
     * 销毁池
     */
    public destroy(): void {
        this.releaseAll();
        this.cleanup();

        // 清理统计
        this._totalCreated = 0;
        this._totalReused = 0;
        this._lastCleanupTime = 0;
    }

    /**
     * 获取池状态
     */
    public getStatus() {
        return {
            poolName: this._poolName,
            totalCount: this._allObjects.size,
            availableCount: this._availableObjects.length,
            activeCount: this._activeObjects.size,
            maxCapacity: this._maxCapacity,
            cleanupInterval: this._cleanupInterval,
            totalCreated: this._totalCreated,
            totalReused: this._totalReused,
            reuseRate: this._totalCreated > 0 ? (this._totalReused / this._totalCreated * 100).toFixed(2) + '%' : '0%'
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 创建对象
     */
    private _createObject(): T {
        return new this._constructor();
    }

    /**
     * 激活对象
     */
    private _activateObject(obj: T): void {
        this._activeObjects.add(obj);

        // 从返回时间映射中移除
        this._objectReturnTime.delete(obj);
    }

    /**
     * 重置对象
     */
    private _resetObject(obj: T): void {
        if (this._resetFunc) {
            this._resetFunc(obj);
        }
    }

    /**
     * 销毁对象
     */
    private _destroyObject(obj: T): void {
        if (this._destroyFunc) {
            this._destroyFunc(obj);
        }
    }
}

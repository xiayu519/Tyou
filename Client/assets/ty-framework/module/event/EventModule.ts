import {Module} from "../Module";

/** 事件监听器信息 */
interface EventListenerInfo {
    callback: Function;
    target: any;
    priority: number;
    once: boolean;
}

interface PendingRemoval {
    type: string;
    callback?: Function;
    target?: any;
}

interface EventWaiter {
    type: string;
    callback: (...args: any[]) => void;
    timeoutId: any;
    resolve: (args: any[] | null) => void;
}

/** 事件优先级 */
export enum EventPriority {
    LOWEST = 0,
    LOW = 25,
    NORMAL = 50,
    HIGH = 75,
    HIGHEST = 100
}

/**
 * 事件模块 - 完全自实现的优先级事件系统（不依赖 Cocos EventTarget）
 *
 * 所有监听器统一管理，支持优先级排序（数值越大越先执行）。
 * 默认优先级为 NORMAL(50)，与原有 on/off/emit API 完全兼容。
 *
 * @example
 * // 基础用法
 * tyou.event.on("eventName", callback, this);
 * tyou.event.emit("eventName", arg1, arg2);
 * tyou.event.off("eventName", callback, this);
 *
 * // 带优先级
 * tyou.event.on("eventName", callback, this, EventPriority.HIGH);
 *
 * // 一次性监听
 * tyou.event.once("eventName", callback, this);
 *
 * // 异步等待
 * const args = await tyou.event.waitFor("eventName", 5000);
 *
 * // 批量绑定
 * const bindId = tyou.event.bindEvents(this, {
 *     "event1": this.onEvent1,
 *     "event2": this.onEvent2,
 * });
 * tyou.event.unbindEvents(bindId);
 *
 * // 移除目标所有监听
 * tyou.event.targetOff(this);
 */
export class EventModule extends Module {
    /** 事件 -> 监听器列表（按优先级降序排列） */
    private _listeners: Map<string, EventListenerInfo[]> = new Map();

    /** 批量绑定管理 */
    private _bindIdCounter: number = 0;
    private _bindingMap: Map<number, { target: any; entries: { event: string; callback: Function }[] }> = new Map();

    /** 正在 emit 中的事件深度（支持同事件嵌套 emit） */
    private _emitDepthMap: Map<string, number> = new Map();
    /** emit 期间的延迟移除请求 */
    private _pendingRemovals: PendingRemoval[] = [];
    /** waitFor 等待中的一次性监听，用于销毁时释放 */
    private _waiters: Set<EventWaiter> = new Set();

    public onCreate(): void {
    }

    public onDestroy(): void {
        this._cancelAllWaiters();
        this._listeners.clear();
        this._bindingMap.clear();
        this._emitDepthMap.clear();
        this._pendingRemovals.length = 0;
    }

    // ─── 注册 ───────────────────────────────────────

    /**
     * 注册事件监听
     * @param type      事件类型
     * @param callback  回调函数
     * @param target    回调目标（可选）
     * @param priority  优先级（可选，默认 NORMAL=50，数值越大越先执行）
     * @returns 回调函数本身
     */
    public on<T extends (...args: any[]) => void>(
        type: string,
        callback: T,
        target?: any,
        priority: number = EventPriority.NORMAL
    ): T {
        return this._addListener(type, callback, target, priority, false);
    }

    /**
     * 注册一次性事件监听
     * @param type      事件类型
     * @param callback  回调函数
     * @param target    回调目标（可选）
     * @param priority  优先级（可选）
     * @returns 回调函数本身
     */
    public once<T extends (...args: any[]) => void>(
        type: string,
        callback: T,
        target?: any,
        priority: number = EventPriority.NORMAL
    ): T {
        return this._addListener(type, callback, target, priority, true);
    }

    // ─── 注销 ───────────────────────────────────────

    /**
     * 取消事件监听
     * - off("event", callback, target) — 精确移除
     * - off("event", callback)         — 移除所有 target 匹配该 callback 的
     * - off("event")                   — 移除该事件所有监听
     */
    public off(type: string, callback?: Function, target?: any): void {
        if (this._isEmitting(type)) {
            this._queueRemoval(type, callback, target);
            return;
        }
        this._removeListeners(type, callback, target);
    }

    /**
     * 移除某个目标对象的所有事件监听
     * @param target 目标对象
     */
    public targetOff(target: any): void {
        if (!target) return;

        for (const [type, list] of this._listeners) {
            if (this._isEmitting(type)) {
                this._queueRemoval(type, undefined, target);
            } else {
                for (let i = list.length - 1; i >= 0; i--) {
                    if (list[i].target === target) {
                        list.splice(i, 1);
                    }
                }
                if (list.length === 0) this._listeners.delete(type);
            }
        }
    }

    /**
     * 移除特定事件类型的所有监听，或某个目标的所有监听
     * @param typeOrTarget 事件类型（string）或目标对象
     */
    public removeAll(typeOrTarget: any): void {
        if (typeof typeOrTarget === 'string') {
            if (this._isEmitting(typeOrTarget)) {
                this._queueRemoval(typeOrTarget);
            } else {
                this._listeners.delete(typeOrTarget);
            }
        } else {
            this.targetOff(typeOrTarget);
        }
    }

    // ─── 触发 ───────────────────────────────────────

    /**
     * 触发事件
     * @param type 事件类型
     * @param args 最多 5 个参数（与原有 emit 签名一致）
     */
    public emit(type: string, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
        this.emitArray(type, [arg0, arg1, arg2, arg3, arg4]);
    }

    /**
     * 触发事件（参数数组形式）
     * @param type 事件类型
     * @param args 参数数组
     */
    public emitArray(type: string, args: any[] = []): void {
        const list = this._listeners.get(type);
        if (!list || list.length === 0) return;

        this._beginEmit(type);

        // 快照遍历：防止 once 移除或回调中 off 影响遍历
        const snapshot = list.slice();

        try {
            for (let i = 0; i < snapshot.length; i++) {
                const info = snapshot[i];
                // once 必须在回调前从正式列表移除，确保同事件递归 emit 时不会再次触发。
                // 如果已被更深层的嵌套 emit 消费，则外层快照必须跳过它。
                if (info.once && !this._removeListenerInfo(type, info)) {
                    continue;
                }
                try {
                    if (info.target) {
                        info.callback.call(info.target, ...args);
                    } else {
                        (info.callback as Function)(...args);
                    }
                } catch (e) {
                    console.error(`[EventModule] Error in event "${type}":`, e);
                }
            }
        } finally {
            this._endEmit(type);
        }
    }

    // ─── 查询 ───────────────────────────────────────

    /**
     * 检查是否已注册指定事件的监听
     */
    public hasEventListener(type: string, callback?: Function, target?: any): boolean {
        const list = this._listeners.get(type);
        if (!list || list.length === 0) return false;
        if (!callback) return true;
        return list.some(info =>
            info.callback === callback && (target === undefined || info.target === target)
        );
    }

    /**
     * 获取某事件的监听器数量
     */
    public getListenerCount(type: string): number {
        const list = this._listeners.get(type);
        return list ? list.length : 0;
    }

    /**
     * 获取已注册的事件类型数量
     */
    public getEventTypeCount(): number {
        return this._listeners.size;
    }

    /**
     * 获取所有事件的监听器总数
     */
    public getTotalListenerCount(): number {
        let total = 0;
        for (const list of this._listeners.values()) {
            total += list.length;
        }
        return total;
    }

    // ─── 高级功能 ────────────────────────────────────

    /**
     * 异步等待事件触发
     * @param type    事件类型
     * @param timeout 超时毫秒数，0 = 不超时
     * @returns 事件参数数组，超时返回 null
     *
     * @example
     * const args = await tyou.event.waitFor("LOGIN_RESULT", 5000);
     */
    public waitFor(type: string, timeout: number = 0): Promise<any[] | null> {
        return new Promise((resolve) => {
            const waiter: EventWaiter = {
                type,
                callback: () => {
                },
                timeoutId: 0,
                resolve
            };

            waiter.callback = (...args: any[]) => {
                this._finishWaiter(waiter, args);
            };

            this._waiters.add(waiter);
            this.once(type, waiter.callback);

            if (timeout > 0) {
                waiter.timeoutId = setTimeout(() => {
                    this._finishWaiter(waiter, null);
                }, timeout);
            }
        });
    }

    /**
     * 批量注册事件
     * @param target 目标对象
     * @param events 事件映射 { eventName: callback }
     * @returns 绑定 ID，用于 unbindEvents
     *
     * @example
     * const id = tyou.event.bindEvents(this, {
     *     "playerDie": this.onPlayerDie,
     *     "gameOver": this.onGameOver,
     * });
     * tyou.event.unbindEvents(id);
     */
    public bindEvents(target: any, events: { [eventName: string]: Function }): number {
        const bindId = ++this._bindIdCounter;
        const entries: { event: string; callback: Function }[] = [];

        for (const [eventName, callback] of Object.entries(events)) {
            this.on(eventName, callback as any, target);
            entries.push({event: eventName, callback});
        }

        this._bindingMap.set(bindId, {target, entries});
        return bindId;
    }

    /**
     * 批量注销事件
     * @param bindId bindEvents 返回的 ID
     */
    public unbindEvents(bindId: number): void {
        const binding = this._bindingMap.get(bindId);
        if (!binding) return;

        for (const entry of binding.entries) {
            this.off(entry.event, entry.callback, binding.target);
        }
        this._bindingMap.delete(bindId);
    }

    /**
     * 清空所有事件监听、批量绑定记录和等待中的 waitFor
     */
    public clear(): void {
        this._cancelAllWaiters();
        if (this._emitDepthMap.size > 0) {
            for (const type of this._listeners.keys()) {
                this._queueRemoval(type);
            }
            this._bindingMap.clear();
            return;
        }

        this._listeners.clear();
        this._bindingMap.clear();
        this._pendingRemovals.length = 0;
    }

    // ─── 兼容别名 ───────────────────────────────────

    /** @deprecated 使用 on() 并传入 priority 参数代替 */
    public onWithPriority<T extends (...args: any[]) => void>(
        type: string,
        callback: T,
        target?: any,
        priority: number = EventPriority.NORMAL
    ): T {
        return this.on(type, callback, target, priority);
    }

    /** @deprecated 使用 once() 并传入 priority 参数代替 */
    public onceWithPriority<T extends (...args: any[]) => void>(
        type: string,
        callback: T,
        target?: any,
        priority: number = EventPriority.NORMAL
    ): T {
        return this.once(type, callback, target, priority);
    }

    // ─── 内部方法 ────────────────────────────────────

    private _addListener<T extends Function>(
        type: string,
        callback: T,
        target: any,
        priority: number,
        once: boolean
    ): T {
        let list = this._listeners.get(type);
        if (!list) {
            list = [];
            this._listeners.set(type, list);
        }

        // 去重
        const exists = list.some(info =>
            info.callback === callback && info.target === target
        );
        if (exists) return callback as any;

        const info: EventListenerInfo = {callback, target, priority, once};

        // 按优先级降序插入
        let inserted = false;
        for (let i = 0; i < list.length; i++) {
            if (priority > list[i].priority) {
                list.splice(i, 0, info);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            list.push(info);
        }

        return callback as any;
    }

    private _removeListeners(type: string, callback?: Function, target?: any): void {
        const list = this._listeners.get(type);
        if (!list) return;

        if (!callback && target === undefined) {
            this._listeners.delete(type);
            return;
        }

        for (let i = list.length - 1; i >= 0; i--) {
            const info = list[i];
            const callbackMatched = !callback || info.callback === callback;
            const targetMatched = target === undefined || info.target === target;
            if (callbackMatched && targetMatched) {
                list.splice(i, 1);
            }
        }

        if (list.length === 0) this._listeners.delete(type);
    }

    private _removeListenerInfo(type: string, listener: EventListenerInfo): boolean {
        const list = this._listeners.get(type);
        if (!list) return false;

        const index = list.indexOf(listener);
        if (index < 0) {
            return false;
        }
        list.splice(index, 1);

        if (list.length === 0) {
            this._listeners.delete(type);
        }
        return true;
    }

    private _beginEmit(type: string): void {
        this._emitDepthMap.set(type, (this._emitDepthMap.get(type) || 0) + 1);
    }

    private _endEmit(type: string): void {
        const depth = this._emitDepthMap.get(type) || 0;
        if (depth <= 1) {
            this._emitDepthMap.delete(type);
            this._flushPendingRemovals();
        } else {
            this._emitDepthMap.set(type, depth - 1);
        }
    }

    private _isEmitting(type: string): boolean {
        return (this._emitDepthMap.get(type) || 0) > 0;
    }

    private _queueRemoval(type: string, callback?: Function, target?: any): void {
        const exists = this._pendingRemovals.some(req =>
            req.type === type && req.callback === callback && req.target === target
        );
        if (!exists) {
            this._pendingRemovals.push({type, callback, target});
        }
    }

    private _flushPendingRemovals(): void {
        if (this._pendingRemovals.length === 0) return;

        const remaining: PendingRemoval[] = [];
        for (const req of this._pendingRemovals) {
            if (this._isEmitting(req.type)) {
                remaining.push(req);
            } else {
                this._removeListeners(req.type, req.callback, req.target);
            }
        }
        this._pendingRemovals = remaining;
    }

    private _finishWaiter(waiter: EventWaiter, args: any[] | null): void {
        if (!this._waiters.delete(waiter)) {
            return;
        }

        if (waiter.timeoutId) {
            clearTimeout(waiter.timeoutId);
            waiter.timeoutId = 0;
        }

        this.off(waiter.type, waiter.callback);
        waiter.resolve(args);
    }

    private _cancelAllWaiters(): void {
        if (this._waiters.size === 0) {
            return;
        }

        const waiters = Array.from(this._waiters);
        this._waiters.clear();
        for (let i = 0; i < waiters.length; i++) {
            const waiter = waiters[i];
            if (waiter.timeoutId) {
                clearTimeout(waiter.timeoutId);
                waiter.timeoutId = 0;
            }
            this.off(waiter.type, waiter.callback);
            waiter.resolve(null);
        }
    }
}

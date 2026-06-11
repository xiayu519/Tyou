import {_decorator} from 'cc';
import {Module} from "../Module";

const {ccclass} = _decorator;

// 计时器回调类型
export type TimerHandler = (args?: any[]) => void;

const EMPTY_TIMER_HANDLER: TimerHandler = () => {
};

export interface TimerInfo {
    id: number;
    leftTime: number;
    totalTime: number;
    isLoop: boolean;
    isRunning: boolean;
}

class Timer {
    public id: number = 0;
    public currentTime: number = 0;
    public totalTime: number = 0;
    public handler: TimerHandler = EMPTY_TIMER_HANDLER;
    public isLoop: boolean = false;
    public isNeedRemove: boolean = false;
    public isRunning: boolean = false;
    public args: any[] = [];
    public heapIndex: number = -1; // 在堆中的索引，用于快速定位

    /** 重置Timer对象用于复用 */
    public reset(): void {
        this.id = 0;
        this.currentTime = 0;
        this.totalTime = 0;
        this.handler = EMPTY_TIMER_HANDLER;
        this.isLoop = false;
        this.isNeedRemove = false;
        this.isRunning = false;
        this.args.length = 0;
        this.heapIndex = -1;
    }
}

/**
 * 最小堆实现，用于高效管理定时器
 * 时间复杂度：插入 O(log n)，删除 O(log n)，取最小 O(1)
 */
class TimerHeap {
    private _heap: Timer[] = [];
    private _size: number = 0;

    public get size(): number {
        return this._size;
    }

    /** 插入定时器 */
    public push(timer: Timer): void {
        timer.heapIndex = this._size;
        this._heap[this._size] = timer;
        this._size++;
        this._siftUp(timer.heapIndex);
    }

    /** 获取堆顶（最小时间）定时器，不移除 */
    public peek(): Timer | null {
        return this._size > 0 ? this._heap[0] : null;
    }

    /** 弹出堆顶定时器 */
    public pop(): Timer | null {
        if (this._size === 0) return null;

        const result = this._heap[0];
        result.heapIndex = -1;
        this._size--;

        if (this._size > 0) {
            const last = this._heap[this._size];
            this._heap[0] = last;
            last.heapIndex = 0;
            this._siftDown(0);
        }

        this._heap.length = this._size;
        return result;
    }

    /** 更新指定定时器的位置（当currentTime改变时调用） */
    public update(timer: Timer): void {
        if (timer.heapIndex < 0 || timer.heapIndex >= this._size) return;

        const index = timer.heapIndex;
        // 先尝试上浮，再尝试下沉
        this._siftUp(index);
        this._siftDown(timer.heapIndex);
    }

    /** 移除指定定时器 */
    public remove(timer: Timer): boolean {
        const index = timer.heapIndex;
        if (index < 0 || index >= this._size) return false;

        timer.heapIndex = -1;
        this._size--;

        if (index === this._size) {
            // 移除的是最后一个，直接返回
            this._heap.length = this._size;
            return true;
        }

        // 用最后一个元素替换被删除的元素
        const last = this._heap[this._size];
        this._heap[index] = last;
        last.heapIndex = index;

        // 调整堆
        this._siftUp(index);
        this._siftDown(last.heapIndex);
        this._heap.length = this._size;

        return true;
    }

    /** 清空堆 */
    public clear(): void {
        for (let i = 0; i < this._size; i++) {
            this._heap[i].heapIndex = -1;
        }
        this._size = 0;
        this._heap.length = 0;
    }

    /** 遍历所有定时器 */
    public forEach(callback: (timer: Timer) => void): void {
        for (let i = 0; i < this._size; i++) {
            callback(this._heap[i]);
        }
    }

    /** 上浮操作 */
    private _siftUp(index: number): void {
        const timer = this._heap[index];
        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            const parent = this._heap[parentIndex];

            if (timer.currentTime >= parent.currentTime) break;

            this._heap[index] = parent;
            parent.heapIndex = index;
            index = parentIndex;
        }

        this._heap[index] = timer;
        timer.heapIndex = index;
    }

    /** 下沉操作 */
    private _siftDown(index: number): void {
        const timer = this._heap[index];
        const halfSize = this._size >> 1;

        while (index < halfSize) {
            let minChildIndex = (index << 1) + 1;
            let minChild = this._heap[minChildIndex];
            const rightIndex = minChildIndex + 1;

            if (rightIndex < this._size && this._heap[rightIndex].currentTime < minChild.currentTime) {
                minChildIndex = rightIndex;
                minChild = this._heap[rightIndex];
            }

            if (timer.currentTime <= minChild.currentTime) break;

            this._heap[index] = minChild;
            minChild.heapIndex = index;
            index = minChildIndex;
        }

        this._heap[index] = timer;
        timer.heapIndex = index;
    }
}

@ccclass('TimerModule')
export class TimerModule extends Module {
    private _currentTimerId: number = 0;
    private _timerHeap: TimerHeap = new TimerHeap();
    private _timerMap: Map<number, Timer> = new Map(); // id -> Timer 快速查找
    private _timerPool: Timer[] = []; // Timer对象池
    private _elapsedSeconds: number = 0;
    private _dispatchingTimerId: number = 0;
    private _isDestroyed: boolean = false;

    public onCreate(): void {
        this._isDestroyed = false;
    }

    public onDestroy(): void {
        this.removeAllTimer();
        this.clearTimerPool();
        this._isDestroyed = true;
    }

    /** 从对象池获取或创建Timer */
    private _createTimer(): Timer {
        return this._timerPool.pop() || new Timer();
    }

    /** 回收Timer到对象池 */
    private _recycleTimer(timer: Timer): void {
        timer.reset();
        this._timerPool.push(timer);
    }

    /**
     * 添加计时器
     * @param callback 回调函数
     * @param time 时间间隔（秒）
     * @param isLoop 是否循环
     * @param args 回调参数
     * @returns 计时器ID
     */
    public addTimer(callback: TimerHandler, time: number, isLoop: boolean = false, ...args: any[]): number {
        if (this._isDestroyed) {
            console.warn('[TimerModule] addTimer ignored after destroy');
            return 0;
        }

        if (!callback) {
            console.warn('[TimerModule] addTimer ignored because callback is invalid');
            return 0;
        }

        const delay = this._normalizeDelay(time);
        const timer = this._createTimer();
        timer.id = ++this._currentTimerId;
        timer.currentTime = this._elapsedSeconds + delay;
        timer.totalTime = delay;
        timer.handler = callback;
        timer.isLoop = isLoop;
        timer.args = args;
        timer.isNeedRemove = false;
        timer.isRunning = true;

        this._timerHeap.push(timer);
        this._timerMap.set(timer.id, timer);

        return timer.id;
    }

    /**
     * 暂停计时器
     * @param timerId 计时器ID
     */
    public stop(timerId: number): void {
        const timer = this._timerMap.get(timerId);
        if (timer && timer.isRunning) {
            timer.currentTime = Math.max(0, timer.currentTime - this._elapsedSeconds);
            timer.isRunning = false;
            if (timer.id !== this._dispatchingTimerId) {
                this._timerHeap.remove(timer);
            }
        }
    }

    /**
     * 恢复计时器
     * @param timerId 计时器ID
     */
    public resume(timerId: number): void {
        const timer = this._timerMap.get(timerId);
        if (timer && !timer.isRunning && !timer.isNeedRemove) {
            this._scheduleTimer(timer, timer.currentTime);
        }
    }

    /**
     * 检查计时器是否正在运行
     * @param timerId 计时器ID
     * @returns 是否运行中
     */
    public isRunning(timerId: number): boolean {
        const timer = this._timerMap.get(timerId);
        return !!timer && !timer.isNeedRemove && timer.isRunning;
    }

    /**
     * 获取计时器剩余时间
     * @param timerId 计时器ID
     * @returns 剩余时间
     */
    public getLeftTime(timerId: number): number {
        const timer = this._timerMap.get(timerId);
        if (!timer || timer.isNeedRemove) return 0;
        return timer.isRunning ? Math.max(0, timer.currentTime - this._elapsedSeconds) : Math.max(0, timer.currentTime);
    }

    /**
     * 重新开始计时器
     * @param timerId 计时器ID
     */
    public restart(timerId: number): void {
        const timer = this._timerMap.get(timerId);
        if (timer && !timer.isNeedRemove) {
            timer.isNeedRemove = false;
            this._scheduleTimer(timer, timer.totalTime);
        }
    }

    /**
     * 重置计时器
     * @param timerId 计时器ID
     * @param callback 回调函数
     * @param time 时间间隔
     * @param isLoop 是否循环
     */
    public resetTimer(timerId: number, callback: TimerHandler, time: number, isLoop: boolean = false): void {
        const timer = this._timerMap.get(timerId);
        if (timer && !timer.isNeedRemove) {
            timer.totalTime = this._normalizeDelay(time);
            timer.handler = callback;
            timer.isLoop = isLoop;
            timer.isNeedRemove = false;
            this._scheduleTimer(timer, timer.totalTime);
        }
    }

    /**
     * 重置计时器（不改变回调函数）
     * @param timerId 计时器ID
     * @param time 时间间隔
     * @param isLoop 是否循环
     */
    public resetTimerEx(timerId: number, time: number, isLoop: boolean): void {
        const timer = this._timerMap.get(timerId);
        if (timer && !timer.isNeedRemove) {
            timer.totalTime = this._normalizeDelay(time);
            timer.isLoop = isLoop;
            timer.isNeedRemove = false;
            this._scheduleTimer(timer, timer.totalTime);
        }
    }

    /**
     * 移除计时器
     * @param timerId 计时器ID
     */
    public removeTimer(timerId: number): void {
        const timer = this._timerMap.get(timerId);
        if (timer) {
            timer.isNeedRemove = true;
            if (timer.id !== this._dispatchingTimerId) {
                this._removeTimer(timer);
            }
        }
    }

    /**
     * 移除所有计时器
     */
    public removeAllTimer(): void {
        for (const timer of this._timerMap.values()) {
            if (timer.id === this._dispatchingTimerId) {
                timer.isNeedRemove = true;
                continue;
            }
            this._recycleTimer(timer);
        }
        this._timerHeap.clear();
        this._timerMap.clear();
        this._dispatchingTimerId = 0;
    }

    /**
     * 获取当前活跃定时器数量
     */
    public getTimerCount(): number {
        let count = 0;
        for (const timer of this._timerMap.values()) {
            if (!timer.isNeedRemove) {
                count++;
            }
        }
        return count;
    }

    /**
     * 检查计时器是否仍存在
     */
    public hasTimer(timerId: number): boolean {
        const timer = this._timerMap.get(timerId);
        return !!timer && !timer.isNeedRemove;
    }

    /**
     * 获取计时器状态快照
     */
    public getTimerInfo(timerId: number): TimerInfo | null {
        const timer = this._timerMap.get(timerId);
        if (!timer || timer.isNeedRemove) return null;

        return {
            id: timer.id,
            leftTime: this.getLeftTime(timerId),
            totalTime: timer.totalTime,
            isLoop: timer.isLoop,
            isRunning: timer.isRunning
        };
    }

    /**
     * 获取可复用Timer对象数量
     */
    public getTimerPoolSize(): number {
        return this._timerPool.length;
    }

    /**
     * 清空Timer对象池，用于销毁或内存诊断
     */
    public clearTimerPool(): void {
        this._timerPool.length = 0;
    }

    /**
     * Component生命周期：更新
     * @param dt 增量时间
     */
    public onUpdate(dt: number): void {
        this._updateTimer(dt);
    }

    /**
     * 更新所有计时器（优化版本）
     * @param elapsedSeconds 经过的秒数
     */
    private _updateTimer(elapsedSeconds: number): void {
        if (this._isDestroyed) {
            return;
        }

        this._elapsedSeconds += this._normalizeDelay(elapsedSeconds);

        // 处理所有到期的定时器
        // 使用迭代而非递归，防止栈溢出
        const maxIterations = 1000; // 安全限制，防止无限循环
        let iterations = 0;

        while (iterations < maxIterations) {
            const top = this._timerHeap.peek();
            if (!top) {
                break;
            }

            if (top.isNeedRemove) {
                this._removeTimer(top);
                continue;
            }

            if (!top.isRunning) {
                this._timerHeap.remove(top);
                continue;
            }

            if (top.currentTime > this._elapsedSeconds) {
                break;
            }

            // 执行回调
            if (top.handler) {
                try {
                    this._dispatchingTimerId = top.id;
                    top.handler(top.args);
                } catch (e) {
                    console.error('[TimerModule] Timer callback error:', e);
                } finally {
                    this._dispatchingTimerId = 0;
                }
            }

            iterations++;

            if (top.isNeedRemove) {
                this._removeTimer(top);
            } else if (top.isLoop && top.isRunning) {
                if (top.currentTime > this._elapsedSeconds) {
                    this._timerHeap.update(top);
                    continue;
                }
                if (top.totalTime <= 0) {
                    console.warn('[TimerModule] Loop timer interval must be greater than 0');
                    this._removeTimer(top);
                    continue;
                }
                top.currentTime = this._elapsedSeconds + top.totalTime;
                this._timerHeap.update(top);
            } else if (!top.isRunning) {
                this._timerHeap.remove(top);
            } else if (top.currentTime > this._elapsedSeconds) {
                this._timerHeap.update(top);
            } else {
                this._removeTimer(top);
            }
        }

        if (iterations >= maxIterations) {
            console.warn('[TimerModule] Too many timer callbacks in one frame, possible infinite loop');
        }
    }

    private _scheduleTimer(timer: Timer, delay: number): void {
        timer.currentTime = this._elapsedSeconds + this._normalizeDelay(delay);
        timer.isRunning = true;
        if (timer.heapIndex >= 0) {
            this._timerHeap.update(timer);
        } else {
            this._timerHeap.push(timer);
        }
    }

    private _removeTimer(timer: Timer): void {
        if (timer.heapIndex >= 0) {
            this._timerHeap.remove(timer);
        }
        this._timerMap.delete(timer.id);
        this._recycleTimer(timer);
    }

    private _normalizeDelay(time: number): number {
        return Number.isFinite(time) ? Math.max(0, time) : 0;
    }
}



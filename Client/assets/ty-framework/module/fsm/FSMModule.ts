import {Module} from "../Module";

export type FSMStateResult = void | Promise<void>;

export interface IFSMState<T> {
    type: T;
    isEntered: boolean;
    onEnter(previousState: T | null, data?: any): FSMStateResult;
    onExit(nextState: T): FSMStateResult;
    onUpdate(dt: number): void;
}

export interface FSMInfo<T> {
    id: string;
    ownerType: string;
    currentState: T | null;
    previousState: T | null;
    isActive: boolean;
    isTransitioning: boolean;
    isDestroyed: boolean;
    stateCount: number;
}

export class FSM<T extends string | number> {
    public waitUntilTimeout: number = 10;

    private _states: Map<T, IFSMState<T>> = new Map();
    private _currentState: T | null = null;
    private _previousState: T | null = null;
    private _id: string;
    private _owner: any;
    private _isActive: boolean = true;
    private _isDestroyed: boolean = false;
    private _isTransitioning: boolean = false;
    private _transitionVersion: number = 0;
    private _transitionQueue: Promise<void> = Promise.resolve();
    private _onDestroyed: ((fsm: FSM<T>) => void) | null;

    private _waitResolve: ((value: boolean) => void) | null = null;
    private _waitCondition: (() => boolean) | null = null;
    private _waitElapsed: number = 0;
    private _waitTimeout: number = 0;
    private _waitDesc: string = "";
    private _waitVersion: number = 0;

    constructor(id: string, owner: any, onDestroyed?: (fsm: FSM<T>) => void) {
        this._id = id;
        this._owner = owner;
        this._onDestroyed = onDestroyed || null;
    }

    public registerState(key: T, state: IFSMState<T>): void {
        if (this._isDestroyed) {
            console.warn(`[FSM:${this._id}] cannot register state after destroy: ${String(key)}`);
            return;
        }

        if (this._states.has(key)) {
            console.warn(`[FSM:${this._id}] state already registered and will be replaced: ${String(key)}`);
        }

        state.type = key;
        state.isEntered = false;
        this._states.set(key, state);
    }

    public registerStates(states: Map<T, IFSMState<T>> | Record<string, IFSMState<T>>): void {
        if (states instanceof Map) {
            states.forEach((state, key) => this.registerState(key, state));
            return;
        }

        Object.keys(states).forEach(key => {
            this.registerState(key as unknown as T, states[key]);
        });
    }

    public unregisterState(key: T): boolean {
        if (!this._states.has(key)) {
            return false;
        }

        if (this._currentState === key) {
            console.warn(`[FSM:${this._id}] cannot unregister current state: ${String(key)}`);
            return false;
        }

        return this._states.delete(key);
    }

    public hasState(key: T): boolean {
        return this._states.has(key);
    }

    public getState(key: T): IFSMState<T> | null {
        return this._states.get(key) || null;
    }

    public getCurrStateObj(): IFSMState<T> | null {
        return this._currentState === null ? null : this.getState(this._currentState);
    }

    public changeState(newState: T, data?: any): Promise<boolean> {
        if (!this.canQueueTransition(newState)) {
            return Promise.resolve(false);
        }

        const version = this._transitionVersion;
        const task = this._transitionQueue.then(() => this.doChangeState(newState, data, version));
        this._transitionQueue = task.then(() => undefined, () => undefined);
        return task;
    }

    public reset(initialState?: T): void {
        void this.resetAsync(initialState);
    }

    public resetAsync(initialState?: T): Promise<boolean> {
        if (this._isDestroyed) {
            return Promise.resolve(false);
        }

        if (initialState !== undefined && !this._states.has(initialState)) {
            console.error(`[FSM:${this._id}] unregistered reset state: ${String(initialState)}`);
            return Promise.resolve(false);
        }

        const version = this.invalidateTransitions();
        const task = this._transitionQueue.then(() => this.doReset(initialState, version));
        this._transitionQueue = task.then(() => undefined, () => undefined);
        return task;
    }

    public destroy(): void {
        if (this._isDestroyed) {
            return;
        }

        this._isDestroyed = true;
        this._isActive = false;
        this.invalidateTransitions();

        const currentState = this._currentState;
        const currentStateObj = this.getCurrStateObj();
        this._currentState = null;
        this._previousState = null;
        this._transitionQueue = Promise.resolve();

        if (currentState !== null && currentStateObj) {
            currentStateObj.isEntered = false;
            void this.callExit(currentStateObj, currentState);
        }

        this._states.clear();
        this._owner = null;
        const onDestroyed = this._onDestroyed;
        this._onDestroyed = null;
        onDestroyed?.(this);
        console.log(`[FSM:${this._id}] destroyed`);
    }

    public update(dt: number): void {
        this.tickWait(dt);

        if (!this._isActive || this._isDestroyed || this._currentState === null) {
            return;
        }

        const currentStateObj = this._states.get(this._currentState);
        if (!currentStateObj) {
            return;
        }

        try {
            currentStateObj.onUpdate(dt);
        } catch (error) {
            console.error(`[FSM:${this._id}] state update failed: ${String(this._currentState)}`, error);
        }
    }

    public getCurrentState(): T | null {
        return this._currentState;
    }

    public getPreviousState(): T | null {
        return this._previousState;
    }

    public isInState(state: T): boolean {
        return this._currentState === state;
    }

    public setActive(active: boolean): void {
        if (this._isDestroyed && active) {
            console.warn(`[FSM:${this._id}] cannot reactivate destroyed FSM`);
            return;
        }
        this._isActive = active;
    }

    public isActive(): boolean {
        return this._isActive && !this._isDestroyed;
    }

    public isTransitioning(): boolean {
        return this._isTransitioning;
    }

    public isDestroyed(): boolean {
        return this._isDestroyed;
    }

    public getId(): string {
        return this._id;
    }

    public getOwner(): any {
        return this._owner;
    }

    public getAllStates(): T[] {
        return Array.from(this._states.keys());
    }

    public getStateCount(): number {
        return this._states.size;
    }

    public getInfo(): FSMInfo<T> {
        return {
            id: this._id,
            ownerType: this._owner?.constructor?.name || typeof this._owner,
            currentState: this._currentState,
            previousState: this._previousState,
            isActive: this.isActive(),
            isTransitioning: this._isTransitioning,
            isDestroyed: this._isDestroyed,
            stateCount: this._states.size,
        };
    }

    private canQueueTransition(newState: T): boolean {
        if (this._isDestroyed) {
            console.warn(`[FSM:${this._id}] cannot change state after destroy`);
            return false;
        }

        if (!this._isActive) {
            console.warn(`[FSM:${this._id}] cannot change state while inactive`);
            return false;
        }

        if (!this._states.has(newState)) {
            console.error(`[FSM:${this._id}] unregistered state: ${String(newState)}`);
            return false;
        }

        return true;
    }

    private async doChangeState(newState: T, data: any, version: number): Promise<boolean> {
        if (this.isTransitionStale(version) || !this.canRunTransition(newState)) {
            return false;
        }

        this._isTransitioning = true;
        try {
            const fromState = this._currentState;
            const fromStateObj = fromState === null ? null : this._states.get(fromState);

            if (fromState !== null && fromStateObj) {
                const entered = await this.waitUntilWithTimeout(
                    () => fromStateObj.isEntered,
                    this.waitUntilTimeout,
                    `waiting ${String(fromState)} onEnter`,
                    version
                );
                if (this.isTransitionStale(version)) {
                    return false;
                }
                if (!entered) {
                    console.warn(`[FSM:${this._id}] wait for ${String(fromState)} onEnter timeout, force transition to ${String(newState)}`);
                }

                const exited = await this.callExit(fromStateObj, newState);
                if (this.isTransitionStale(version)) {
                    return false;
                }
                if (!exited) {
                    return false;
                }

                fromStateObj.isEntered = false;
                this._previousState = fromState;
            } else {
                this._previousState = fromState;
            }

            const newStateObj = this._states.get(newState);
            if (!newStateObj || this.isTransitionStale(version)) {
                return false;
            }

            this._currentState = newState;
            newStateObj.type = newState;
            newStateObj.isEntered = false;

            const entered = await this.callEnter(newStateObj, this._previousState, data);
            if (this.isTransitionStale(version)) {
                return false;
            }

            newStateObj.isEntered = true;
            return entered;
        } finally {
            this._isTransitioning = false;
        }
    }

    private canRunTransition(newState: T): boolean {
        return !this._isDestroyed && this._isActive && this._states.has(newState);
    }

    private async doReset(initialState: T | undefined, version: number): Promise<boolean> {
        if (this._isDestroyed || this.isTransitionStale(version)) {
            return false;
        }

        this._isTransitioning = true;
        try {
            const currentState = this._currentState;
            const currentStateObj = currentState === null ? null : this._states.get(currentState);
            const nextState = initialState ?? currentState;

            if (currentState !== null && currentStateObj && nextState !== null) {
                const exited = await this.callExit(currentStateObj, nextState);
                if (this.isTransitionStale(version)) {
                    return false;
                }
                if (!exited) {
                    return false;
                }
                currentStateObj.isEntered = false;
            }

            this._currentState = null;
            this._previousState = null;

            if (initialState === undefined) {
                return true;
            }

            const initialStateObj = this._states.get(initialState);
            if (!initialStateObj || this.isTransitionStale(version)) {
                return false;
            }

            this._currentState = initialState;
            initialStateObj.type = initialState;
            initialStateObj.isEntered = false;

            const entered = await this.callEnter(initialStateObj, null);
            if (this.isTransitionStale(version)) {
                return false;
            }

            initialStateObj.isEntered = true;
            return entered;
        } finally {
            this._isTransitioning = false;
        }
    }

    private async callEnter(state: IFSMState<T>, previousState: T | null, data?: any): Promise<boolean> {
        try {
            await Promise.resolve(state.onEnter(previousState, data));
            return true;
        } catch (error) {
            console.error(`[FSM:${this._id}] onEnter failed: ${String(state.type)}`, error);
            return false;
        }
    }

    private async callExit(state: IFSMState<T>, nextState: T): Promise<boolean> {
        try {
            await Promise.resolve(state.onExit(nextState));
            return true;
        } catch (error) {
            console.error(`[FSM:${this._id}] onExit failed: ${String(state.type)} -> ${String(nextState)}`, error);
            return false;
        }
    }

    private waitUntilWithTimeout(condition: () => boolean, timeout: number, desc: string, version: number): Promise<boolean> {
        if (this.isTransitionStale(version)) {
            return Promise.resolve(false);
        }

        if (condition()) {
            return Promise.resolve(true);
        }

        this.resolveWait(false);

        return new Promise<boolean>((resolve) => {
            this._waitResolve = resolve;
            this._waitCondition = condition;
            this._waitElapsed = 0;
            this._waitTimeout = timeout;
            this._waitDesc = desc;
            this._waitVersion = version;
        });
    }

    private tickWait(dt: number): void {
        if (!this._waitResolve || !this._waitCondition) {
            return;
        }

        if (this.isTransitionStale(this._waitVersion)) {
            this.resolveWait(false);
            return;
        }

        if (this._waitCondition()) {
            this.resolveWait(true);
            return;
        }

        if (this._waitTimeout <= 0) {
            return;
        }

        this._waitElapsed += dt;
        if (this._waitElapsed >= this._waitTimeout) {
            console.warn(`[FSM:${this._id}] waitUntil timeout: ${this._waitDesc}`);
            this.resolveWait(false);
        }
    }

    private resolveWait(value: boolean): void {
        if (!this._waitResolve) {
            this.clearWait();
            return;
        }

        const resolve = this._waitResolve;
        this.clearWait();
        resolve(value);
    }

    private clearWait(): void {
        this._waitResolve = null;
        this._waitCondition = null;
        this._waitElapsed = 0;
        this._waitTimeout = 0;
        this._waitDesc = "";
        this._waitVersion = 0;
    }

    private invalidateTransitions(): number {
        this._transitionVersion++;
        this.resolveWait(false);
        return this._transitionVersion;
    }

    private isTransitionStale(version: number): boolean {
        return this._isDestroyed || version !== this._transitionVersion;
    }
}

export class FSMModule extends Module {
    private _fsms: Map<string, FSM<any>> = new Map();
    private _nextFsmId: number = 0;

    public onCreate(): void {
        console.log("[FSMModule] initialized");
    }

    public onDestroy(): void {
        const fsms = Array.from(this._fsms.values());
        for (const fsm of fsms) {
            fsm.destroy();
        }

        const destroyedCount = fsms.length;
        this._fsms.clear();
        this._nextFsmId = 0;

        console.log(`[FSMModule] destroyed, fsm count: ${destroyedCount}`);
    }

    public createFSM<T extends string | number>(owner: any): FSM<T> {
        const fsmId = `fsm_${++this._nextFsmId}`;
        const fsm = new FSM<T>(fsmId, owner, (destroyedFsm) => {
            if (this._fsms.get(fsmId) === destroyedFsm) {
                this._fsms.delete(fsmId);
            }
        });
        this._fsms.set(fsmId, fsm);
        console.log(`[FSMModule] create FSM: ${fsmId}, owner: ${owner?.constructor?.name || typeof owner}`);
        return fsm;
    }

    public getFSM<T extends string | number>(fsmId: string): FSM<T> | null {
        return this._fsms.get(fsmId) as FSM<T> || null;
    }

    public hasFSM(fsmId: string): boolean {
        return this._fsms.has(fsmId);
    }

    public destroyFSM<T extends string | number>(fsm: FSM<T>): boolean;
    public destroyFSM(fsmId: string): boolean;
    public destroyFSM<T extends string | number>(target: FSM<T> | string): boolean {
        const fsmId = typeof target === "string" ? target : target.getId();
        return this.destroyFSMById(fsmId);
    }

    public destroyFSMById(fsmId: string): boolean {
        const fsm = this._fsms.get(fsmId);
        if (!fsm) {
            console.warn(`[FSMModule] FSM not found: ${fsmId}`);
            return false;
        }

        fsm.destroy();
        this._fsms.delete(fsmId);
        console.log(`[FSMModule] destroy FSM: ${fsmId}`);
        return true;
    }

    public destroyAllFSMByOwner(owner: any): number {
        const entries = Array.from(this._fsms.entries());
        let destroyedCount = 0;

        for (const [fsmId, fsm] of entries) {
            if (fsm.getOwner() !== owner) {
                continue;
            }

            fsm.destroy();
            this._fsms.delete(fsmId);
            destroyedCount++;
        }

        if (destroyedCount > 0) {
            const ownerName = owner?.constructor?.name || typeof owner;
            console.log(`[FSMModule] destroy owner FSMs: ${ownerName}, count: ${destroyedCount}`);
        }

        return destroyedCount;
    }

    public resetFSM(fsmId: string, initialState?: any): boolean {
        const fsm = this._fsms.get(fsmId);
        if (!fsm) {
            return false;
        }

        fsm.reset(initialState);
        console.log(`[FSMModule] reset FSM: ${fsmId}`);
        return true;
    }

    public resetFSMAsync(fsmId: string, initialState?: any): Promise<boolean> {
        const fsm = this._fsms.get(fsmId);
        if (!fsm) {
            return Promise.resolve(false);
        }

        return fsm.resetAsync(initialState);
    }

    public setFSMActive(fsmId: string, active: boolean): boolean {
        const fsm = this._fsms.get(fsmId);
        if (!fsm) {
            return false;
        }

        fsm.setActive(active);
        return true;
    }

    public onUpdate(dt: number): void {
        const fsms = Array.from(this._fsms.values());
        for (const fsm of fsms) {
            fsm.update(dt);
        }
    }

    public getAllFSMInfo(): Array<FSMInfo<any>> {
        return Array.from(this._fsms.values(), fsm => fsm.getInfo());
    }

    public getStats(): {
        totalFsmCount: number;
        activeFsmCount: number;
        inactiveFsmCount: number;
        transitioningFsmCount: number;
    } {
        let activeCount = 0;
        let transitioningCount = 0;

        this._fsms.forEach(fsm => {
            if (fsm.isActive()) {
                activeCount++;
            }
            if (fsm.isTransitioning()) {
                transitioningCount++;
            }
        });

        const totalCount = this._fsms.size;
        return {
            totalFsmCount: totalCount,
            activeFsmCount: activeCount,
            inactiveFsmCount: totalCount - activeCount,
            transitioningFsmCount: transitioningCount,
        };
    }
}

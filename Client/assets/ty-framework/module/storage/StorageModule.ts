import {Module} from "../Module";
import {StorageEx} from "./StorageEx";

export class StorageModule extends Module {
    private _storage: StorageEx;

    constructor() {
        super();
        this._storage = new StorageEx();
    }
    public onCreate(): void {

    }

    public onDestroy(): void {
        this._storage.clearCache();
    }
    
    get ex(): StorageEx {
        return this._storage;
    }

    public set(key: string, value: unknown): boolean {
        return this._storage.set(key, value);
    }

    public get<T = any>(key: string, defaultValue?: T): T | null | undefined {
        if (arguments.length >= 2) {
            return this._storage.get(key, defaultValue);
        }
        return this._storage.get<T>(key);
    }

    public remove(key: string): boolean {
        return this._storage.remove(key);
    }

    public clear(): boolean {
        return this._storage.clear();
    }

    public has(key: string): boolean {
        return this._storage.has(key);
    }

    public add(key: string, value: number = 1): number | false {
        return this._storage.add(key, value);
    }

    public setDay(key: string, value: unknown, cb?: (oldValue: unknown, newValue: unknown) => boolean): boolean {
        return this._storage.setDay(key, value, cb);
    }

    public getDay<T = any>(key: string): T | null | undefined {
        return this._storage.getDay<T>(key);
    }

    public setWeek(key: string, value: unknown, cb?: (oldValue: unknown, newValue: unknown) => boolean): boolean {
        return this._storage.setWeek(key, value, cb);
    }

    public getWeek<T = any>(key: string): T | null | undefined {
        return this._storage.getWeek<T>(key);
    }

    public clearCache(key?: string): void {
        this._storage.clearCache(key);
    }
}

import {error, js, log, sys} from 'cc';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function encode(text: string, key: string) {
    key = key || chars;
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(charCode);
    }
    return encrypted;
}

function decode(encryptedText: string, key: string) {
    key = key || chars;
    let decrypted = '';
    for (let i = 0; i < encryptedText.length; i++) {
        const charCode = encryptedText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
}

interface StorageReadResult<T> {
    exists: boolean;
    value: T | null | undefined;
}

const weekOfYear = function (curDate?: Date) {
    /*
     date1是当前日期
     date2是当年第一天
     d是当前日期是今年第多少天
     用d + 当前年的第一天的周差距的和在除以7就是本年第几周
     */
    curDate = curDate || new Date();
    let a = curDate.getFullYear();
    let b = curDate.getMonth() + 1;
    let c = curDate.getDate();

    let date1 = new Date(a, b - 1, c), date2 = new Date(a, 0, 1),
        d = Math.round((date1.valueOf() - date2.valueOf()) / 86400000);
    return Math.ceil(
        (d + ((date2.getDay() + 1) - 1)) / 7
    );
};

const getWeekUpdateTime = function () {
    const date = new Date();
    const year = date.getFullYear();
    const week = weekOfYear(date);
    return year + '' + week;
};

const getDayUpdateTime = function (curDate?: Date) {
    curDate = curDate || new Date();
    return curDate.toLocaleDateString();
};

export class StorageEx {
    static setting: {
        /**
         * 加密密钥
         * - 如果需要加密内容，请设置密钥的值
         */
        secretKey: string
    } = {
        secretKey: ''
    };

    private _cache: Record<string, string> = {};

    /**
     * 返回值为false代表调用失败
     */
    set(key: string, value: unknown): boolean {
        if (typeof key === 'string' && typeof value !== 'undefined') {
            try {
                const data = JSON.stringify(value);
                if (typeof data === 'undefined') {
                    error('storage set stringify error');
                    return false;
                }
                if (StorageEx.setting.secretKey) {
                    sys.localStorage.setItem(key, encode(data, StorageEx.setting.secretKey));
                } else {
                    sys.localStorage.setItem(key, data);
                }
                // 设置缓存
                this._cache[key] = data;
                return true;
            } catch (err) { log(err); }
        } else {
            error('storage set error');
        }
        return false;
    }

    /**
     * 未传 defaultValue 时保持旧语义：缺失 key 返回 null，解析失败返回 undefined。
     */
    get<T = any>(key: string, defaultValue?: T): T | null | undefined {
        const result = this._read<T>(key);
        if (arguments.length >= 2 && (!result.exists || typeof result.value === 'undefined')) {
            return defaultValue;
        }
        return result.value;
    }

    /**
     * 返回值为false代表调用失败
     */
    add(key: string, value: number = 1): number | false {
        let result = this.get(key);
        if (result !== undefined) {
            result = result || 0;
            result += value;
            if (this.set(key, result)) {
                return result;
            }
        }
        return false;
    }

    /**
     * 返回值为false代表调用失败
     */
    remove(key: string): boolean {
        try {
            sys.localStorage.removeItem(key);
            delete this._cache[key];
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * 返回值为false代表调用失败
     */
    clear(): boolean {
        try {
            sys.localStorage.clear();
            js.clear(this._cache);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * 设置本周数据 [返回值为false代表调用失败]
     * @param {Function} cb 当已存在本周的数据时，会根据cb的返回决定是否存储，true代表存储
     */
    setWeek(key: string, value: unknown, cb?: (oldValue: unknown, newValue: unknown) => boolean): boolean {
        const updateTime = getWeekUpdateTime();

        if (cb) {
            const data = this.getWeek(key);
            if (data !== undefined) {
                if (data === null || cb(data, value)) {
                    return this.set(key, {
                        data: value,
                        updateTime: updateTime
                    });
                }
            }
        } else {
            return this.set(key, {
                data: value,
                updateTime: updateTime
            });
        }

        return false;
    }

    /**
     * 获取本周数据 [返回值为undefined代表调用失败]
     */
    getWeek<T = any>(key: string): T | null | undefined {
        const data = this.get(key);
        if (data && data.updateTime == getWeekUpdateTime()) {
            return data.data;
        }
        return data && null;
    }

    /**
     * 设置本天数据 [返回值为false代表调用失败]
     * @param {Function} cb 当已存在本天的数据时，会根据cb的返回决定是否存储，true代表存储
     */
    setDay(key: string, value: unknown, cb?: (oldValue: unknown, newValue: unknown) => boolean): boolean {
        const updateTime = getDayUpdateTime();

        if (cb) {
            const data = this.getDay(key);
            if (data !== undefined) {
                if (data === null || cb(data, value)) {
                    return this.set(key, {
                        data: value,
                        updateTime: updateTime
                    });
                }
            }
        } else {
            return this.set(key, {
                data: value,
                updateTime: updateTime
            });
        }

        return false;
    }

    /**
     * 获取本天数据 [返回值为undefined代表调用失败]
     * @param {*} key
     */
    getDay<T = any>(key: string): T | null | undefined {
        const data = this.get(key);
        if (data && data.updateTime == getDayUpdateTime()) {
            return data.data;
        }
        return data && null;
    }

    /**
     * 判断 key 是否存在于缓存或 localStorage。
     */
    has(key: string): boolean {
        if (this._hasCache(key)) {
            return true;
        }

        try {
            return sys.localStorage.getItem(key) !== null;
        } catch (err) {
            return false;
        }
    }

    /**
     * 清理内存缓存，不删除 localStorage 持久化数据。
     */
    clearCache(key?: string): void {
        if (typeof key === 'string') {
            delete this._cache[key];
            return;
        }
        js.clear(this._cache);
    }

    private _read<T>(key: string): StorageReadResult<T> {
        if (typeof key !== 'string') {
            return {exists: false, value: undefined};
        }

        if (this._hasCache(key)) {
            return {
                exists: true,
                value: this._parse<T>(key, this._cache[key])
            };
        }

        try {
            let data = sys.localStorage.getItem(key);
            if (data === null) {
                return {exists: false, value: null};
            }

            if (data === '') {
                return {exists: true, value: null};
            }

            if (StorageEx.setting.secretKey) {
                data = decode(data, StorageEx.setting.secretKey);
            }

            const value = this._parse<T>(key, data);
            if (typeof value !== 'undefined') {
                this._cache[key] = data;
            }
            return {exists: true, value};
        } catch (e) {
            delete this._cache[key];
            return {exists: true, value: undefined};
        }
    }

    private _parse<T>(key: string, data: string): T | undefined {
        try {
            return JSON.parse(data) as T;
        } catch (e) {
            delete this._cache[key];
            return undefined;
        }
    }

    private _hasCache(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this._cache, key);
    }
}

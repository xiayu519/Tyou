import {Component} from "cc";
import {GameEvent} from "../../core/GameEvent";

const TIMESTAMP_EPOCH_2025 = new Date('2025-01-01T00:00:00Z').getTime() / 1000; // 2025年1月1日的Unix时间戳（秒）
export class GameWorld extends Component {

    /** 服务器时间与本地时间同步 */
    private _serverTime: number = 0;
    private _timeScale: number = 1;

    private _dayTimezoneOffsetMinutes: number = 480;
    private _dayResetHour: number = 0;
    private _autoSaveIntervalSeconds: number = 5;
    private _autoSaveCount: number = 0;
    private _stamRecoverCount: number = 0;
    private _lastDayKey: number = 0;
    private _hasDayKey: boolean = false;
    private readonly _tickHandler = () => {
        this._onSecondTick();
    };
    
    protected start(): void {
        this.setServerTime(Date.now());
        this.schedule(this._tickHandler, 1);
    }

    protected onDestroy(): void {
        this.unschedule(this._tickHandler);
        this.unscheduleAllCallbacks();
    }

    setServerTime(val: number): void {
        const normalized = this.normalizeUnixSeconds(val);
        if (normalized === null) {
            console.warn('[GameWorld] setServerTime ignored invalid timestamp:', val);
            return;
        }

        this._serverTime = normalized;
        this._refreshDayKey(false);
    }

    getServerTime(): number {
        return this._serverTime;
    }

    getServerTimeMs(): number {
        return this._serverTime * 1000;
    }

    getLocalUnixTime(): number {
        return Math.floor(Date.now() / 1000);
    }

    setTimeScale(scale: number): void {
        if (!Number.isFinite(scale)) {
            console.warn('[GameWorld] setTimeScale ignored invalid scale:', scale);
            return;
        }

        this._timeScale = Math.max(0, scale);
    }

    getTimeScale(): number {
        return this._timeScale;
    }

    //当前真实时间戳
    ts2now(ts: number): number {
        return Math.floor(this.tsToUnixSeconds(ts) * 1000);
    }
    //储存时间戳
    ts(): number {
        return this.unixSecondsToTs(this._serverTime);
    }


    unixSecondsToTs(unixSeconds: number): number {
        return Math.floor(unixSeconds || 0) - TIMESTAMP_EPOCH_2025;
    }

    tsToUnixSeconds(ts: number): number {
        return Math.floor(ts || 0) + TIMESTAMP_EPOCH_2025;
    }

    normalizeUnixSeconds(timestamp: number): number | null {
        if (!Number.isFinite(timestamp)) {
            return null;
        }

        const value = Math.floor(timestamp);
        if (Math.abs(value) >= 100000000000) {
            return Math.floor(value / 1000);
        }
        return value;
    }

    //setDayBoundary(480, 5) 默认是0  如果凌晨5点就这么设置
    setDayBoundary(timezoneOffsetMinutes: number = 480, resetHour: number = 0): void {
        this._dayTimezoneOffsetMinutes = Number.isFinite(timezoneOffsetMinutes) ? Math.floor(timezoneOffsetMinutes) : 0;
        this._dayResetHour = Number.isFinite(resetHour) ? Math.max(0, Math.min(23, Math.floor(resetHour))) : 0;
        this._refreshDayKey(false);
    }

    checkIsSameDay(ts: number, nowTs?: number): boolean {
        const a = this.tsToUnixSeconds(ts);
        const b = this.tsToUnixSeconds(nowTs ?? this.ts());
        return this._getDayKeyByUnixSeconds(a) === this._getDayKeyByUnixSeconds(b);
    }

    checkIsNewDay(lastTs: number, nowTs?: number): boolean {
        return !this.checkIsSameDay(lastTs, nowTs);
    }

    getServerDayKey(): number {
        return this._getDayKeyByUnixSeconds(this._serverTime);
    }

    getDayKeyByTs(ts: number): number {
        return this._getDayKeyByUnixSeconds(this.tsToUnixSeconds(ts));
    }

    private _onSecondTick(): void {
        this._serverTime++;
        this._autoSaveCount++;
        this._stamRecoverCount++;
        if (this._stamRecoverCount >= 60) {
            this._stamRecoverCount = 0;
        }

        tyou.event.emit(GameEvent.TIME_UPDATE_SECOND);
        this._refreshDayKey(true);

        if (this._autoSaveCount >= this._autoSaveIntervalSeconds) {
            this._autoSaveCount = 0;
        }
    }

    private _refreshDayKey(emitEvent: boolean): void {
        const dayKey = this.getServerDayKey();
        if (!this._hasDayKey) {
            this._lastDayKey = dayKey;
            this._hasDayKey = true;
            return;
        }

        if (dayKey === this._lastDayKey) {
            return;
        }

        const previousDayKey = this._lastDayKey;
        this._lastDayKey = dayKey;
        if (emitEvent) {
            tyou.event.emit(GameEvent.TIME_UPDATE_NEW_DAY, dayKey, previousDayKey);
        }
    }

    private _getDayKeyByUnixSeconds(unixSeconds: number): number {
        const adj = Math.floor(unixSeconds) + this._dayTimezoneOffsetMinutes * 60 - this._dayResetHour * 3600;
        const d = new Date(adj * 1000);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        return y * 10000 + m * 100 + day;
    }

}

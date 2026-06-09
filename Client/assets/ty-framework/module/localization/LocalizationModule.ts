import {Module} from "../Module";
import {GameEvent} from "../../core/GameEvent";
import {TableLocalizationText} from "../../../scripts/proto/config/bin/schema";

type LocalizationRecord = TableLocalizationText & { [key: string]: any };

export class LocalizationModule extends Module {
    private _language: string = "zh_cn";
    private _fallbackLanguage: string = "zh_cn";
    private _textMap: Map<string, LocalizationRecord> = new Map();

    public onCreate(): void {
        this.reloadFromTable();
    }

    public onDestroy(): void {
        this._textMap.clear();
    }

    public reloadFromTable(): void {
        this._textMap.clear();
        const tables = tyou.table?.getConfig();
        const list = tables?.TbTableLocalizationText?.getDataList?.() || [];
        for (const item of list) {
            if (!item || !item.key) {
                continue;
            }
            this._textMap.set(item.key, item as LocalizationRecord);
        }
    }

    public switchLanguage(language: string): void {
        const next = this.normalizeLanguage(language);
        const previous = this._language;
        this._language = next;
        tyou.event.emit(GameEvent.LANGUAGE_CHANGED, next, previous);
    }

    public getLanguage(): string {
        return this._language;
    }

    public setFallbackLanguage(language: string): void {
        this._fallbackLanguage = this.normalizeLanguage(language);
    }

    public hasKey(key: string): boolean {
        return this._textMap.has(key);
    }

    public get(key: string, ...args: any[]): string {
        const record = this._textMap.get(key);
        if (!record) {
            return `#${key}#`;
        }

        const text = this.readLanguageValue(record, this._language)
            || this.readLanguageValue(record, this._fallbackLanguage)
            || key;
        return this.format(text, args);
    }

    public normalizeLanguage(language: string): string {
        return (language || this._fallbackLanguage).replace(/-/g, "_").toLowerCase();
    }

    private readLanguageValue(record: LocalizationRecord, language: string): string {
        const field = this.languageToField(language);
        const value = record[field];
        return typeof value === "string" ? value : "";
    }

    private languageToField(language: string): string {
        const normalized = this.normalizeLanguage(language);
        return normalized.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
    }

    private format(text: string, args: any[]): string {
        if (!args || args.length === 0) {
            return text;
        }
        return text.replace(/\{(\d+)\}/g, (match, index) => {
            const value = args[Number(index)];
            return value === undefined || value === null ? match : String(value);
        });
    }
}

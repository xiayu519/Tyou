import {BufferAsset} from "cc";
import {LoadingUI} from "../../../asset-art/ui/LoadingUI";
import {Tables} from "../../../scripts/proto/config/bin/schema";
import ByteBuf from "../../../scripts/proto/config/luban/ByteBuf";
import {Module} from "../Module";

export class TableModule extends Module {
    private _dataMap = new Map<string, any>();
    private _tables: Tables = null;
    
    async onCreate() {
        this._dataMap.clear();
        let cfgs = await tyou.res.loadDirAsync({
            path: "game", bundle: "config", type: BufferAsset, onProgress: (finish, total, item) => {
                LoadingUI.Instance.updateProgress(2, finish, total, "开始加载表格...");
            }
        });
        cfgs.forEach(cfg => {
            this._dataMap.set(cfg.name, new Uint8Array(cfg.buffer().slice(0, cfg.buffer().byteLength)));
            tyou.res.decRef(cfg);
        })
        this._tables = new Tables((file_name: string) => new ByteBuf(this._dataMap.get(file_name)));
        tyou.i18n?.onCreate();
    }

    public getConfig() {
        return this._tables;
    }

    onDestroy(): void {
    }

}

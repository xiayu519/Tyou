import {_decorator, Component, director, Node} from 'cc';
import {LoadingUI} from "../asset-art/ui/LoadingUI";
import {SceneEnum} from "../ty-framework/module/scene/Scene";
import {UIName} from "./logic/ui/UIName";
import {registerAllUI} from "./logic/ui/UIImportAll";


const {ccclass, property} = _decorator;

@ccclass('Main')
export class Main extends Component {
    @property({type: Node})
    uiCanavas: Node;

    override onLoad() {
        tyou.onLoad();
        tyou.ui.setUIRegistrar(registerAllUI);
    }

    async start() {
        await tyou.onCreate();
        director.addPersistRootNode(this.uiCanavas);
        director.addPersistRootNode(this.node);

        LoadingUI.Instance.updateProgress(0, 1, 1, "初始化中...");

        // 直接进入游戏（不等待 bundle）
        this.appStart();

        // 后台静默加载所有 bundle（不阻塞，按需加载时如果已加载就直接用）
        this.loadBundlesInBackground();

        // 后台预加载常用资源（不阻塞）
        this.preloadInBackground();
    }

    /**
     * 后台静默加载所有 bundle
     * 不阻塞游戏，与按需加载不冲突
     */
    private loadBundlesInBackground(): void {
        const bundles = tyou.res.getBundlesFromAssetIndex();
        console.log(`[Main] 后台静默加载 bundle: [${bundles.join(', ')}]`);

        let loadedCount = 0;
        for (const bundle of bundles) {
            tyou.res.loadBundle({
                bundle: bundle,
                onComplete: () => {
                    loadedCount++;
                    console.log(`[Main] 后台加载完成: ${bundle} (${loadedCount}/${bundles.length})`);
                }
            });
        }
    }

    /**
     * 后台预加载常用资源（不阻塞）
     */
    private preloadInBackground(): void {
        const preloadList = tyou.res.getPreloadListFromAssetIndex();
        if (preloadList.length > 0) {
            console.log("[Main] 开始后台预加载:", preloadList);
            preloadList.forEach(path => {
                tyou.res.preload(path);
            });
        }
    }

    async appStart() {
        LoadingUI.Instance.updateProgress(0, 1, 1, "加载中...");
        tyou.audio.playBGM("BGM_Main");
        await tyou.table.onCreate();
        await tyou.scene.loadSceneAsync(SceneEnum.Login)
       // await tyou.ui.showUIAsync(UIName.LoginUI);
        await tyou.ui.showUIAsync(UIName.TestUI);
        LoadingUI.Instance.finishProgress();
    }

    override update(deltaTime: number) {
        tyou.onUpdate(deltaTime);
    }

    override onDestroy() {
        tyou.onDestroy();
    }

}



import {find} from "cc";
import {ECSRootSystem} from "./core/ecs/ECSSystem";
import {AudioModule} from "./module/audio/AudioModule";
import {EventModule} from "./module/event/EventModule";
import {FSMModule} from "./module/fsm/FSMModule";
import {HttpModule} from "./module/http/HttpModule";
import {ResourceModule} from "./module/loader/ResourceModule";
import {PoolModule} from "./module/pool/PoolModule";
import {SceneModule} from "./module/scene/SceneModule";
import {StorageModule} from "./module/storage/StorageModule";
import {TableModule} from "./module/table/TableModule";
import {TimerModule} from "./module/timer/TimerModule";
import {UIModule} from "./module/ui/UIModule";
import {UpdateModule} from "./module/update/UpdateModule";
import {GameWorld} from "./module/world/GameWorld";
import {ecs} from "./core/ecs/ECS";

/** 框架版本号 */
export var version: string = "1.0.2";

class Tyou {
    res: ResourceModule = new ResourceModule();
    event: EventModule = new EventModule();
    timer: TimerModule = new TimerModule();
    fsm: FSMModule = new FSMModule();
    storage: StorageModule = new StorageModule();
    http: HttpModule = new HttpModule();
    ecs: ECSRootSystem = new ecs.RootSystem();
    //除非用到component里面的特性 只需要一个update话 没必要继承它
    update: UpdateModule = new UpdateModule();
    pool: PoolModule;
    audio: AudioModule;
    scene: SceneModule;
    ui: UIModule;
    table: TableModule;
    game: GameWorld;


    //依赖其他模块的后加载 避免循环依赖
    public onLoad(): void {
        this.pool = new PoolModule();
        this.audio = new AudioModule();
        this.scene = new SceneModule();
        this.ui = new UIModule();
        this.table = new TableModule();
        this.game = find("GameRoot").addComponent(GameWorld);
    }

    public async onCreate() {
        this.pool.onCreate();
        await this.res.onCreate();
        this.audio.onCreate();
        this.scene.onCreate();
        this.storage.onCreate();
        await this.ui.onCreate();
    }

    public onUpdate(dt: number): void {
        this.timer.onUpdate(dt);
        this.pool.onUpdate(dt);
        this.fsm.onUpdate(dt);
        this.ui.onUpdate(dt);
        this.ecs.execute(dt);
        this.update.onUpdate(dt);
        this.audio.onUpdate(dt);
        this.res.onUpdate(dt);
    }

    public onDestroy(): void {
        this.res.onDestroy();
        this.event.onDestroy();
        this.timer.onDestroy();
        this.pool.onDestroy();
        this.audio.onDestroy();
        this.scene.onDestroy();
        this.fsm.onDestroy();
        this.ui.onDestroy();
        this.storage.onDestroy();
        this.table.onDestroy();
        this.update.onDestroy();
    }
}

declare global {
    var tyou: Tyou;
}

(function () {
    globalThis.tyou = new Tyou();
})();



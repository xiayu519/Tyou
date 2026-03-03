# Tyou

CocosCreator 3.8.7 基础框架，比较适合 Unity 初转型 CCC 的使用者。参考了 Unity 开源框架 **TEngine** 和 **YouYouFrameWork** 以及 CocosCreator 一些开源框架。（如果对你有帮助，给个star就好了。）

## 特性概览

- **全局单例架构** — 所有模块通过 `tyou.*` 全局访问，无需频繁 `getComponent`
- **UI 模块** — 栈式管理 + 层级系统 + 模糊背景 + 右键一键生成 UI 代码
- **资源模块** — 资源索引 + 自动引用计数 + 延迟释放 + Bundle 分级加载
- **对象池** — Node 池 & Class 池，内置 Vec3/Vec2/Color 等常用类型池
- **事件系统** — 优先级事件、`async/await` 等待事件、批量绑定
- **计时器** — 基于最小堆的高性能计时器
- **有限状态机** — 支持异步状态切换
- **ECS** — 经典 Entity-Component-System，bitmask 匹配 + 对象池回收
- **网络模块** — 多通道 WebSocket，心跳、断线重连、Protobuf/JSON/Pako 协议
- **音频模块** — 对象池 + 优先级抢占
- **配置表** — Luban 二进制格式，工具一键生成

## 快速开始

### 环境要求

- CocosCreator **3.8.7**
- Node.js (用于扩展插件)

### 安装

1. Clone 项目
2. 用 CocosCreator 3.8.7 打开 `Client` 目录
3. 在 `Client` 目录下执行 `install_npm_packages.bat` 安装依赖

### 全局访问

框架初始化后通过全局变量 `tyou` 访问所有模块：

```typescript
tyou.ui       // UI模块
tyou.res      // 资源模块
tyou.event    // 事件模块
tyou.timer    // 计时器模块
tyou.audio    // 音频模块
tyou.pool     // 对象池模块
tyou.scene    // 场景模块
tyou.fsm      // 状态机模块
tyou.ecs      // ECS系统
tyou.http     // HTTP模块
tyou.storage  // 持久化存储
tyou.table    // 配置表模块
tyou.update   // Update回调管理
tyou.game     // GameWorld（服务器时间同步等）
```

---

## UI 模块（重点）

UI 模块是框架的核心功能之一，提供了 **栈式窗口管理**、**层级系统**、**模糊背景**、**自动节点绑定** 等能力。

### 防循环依赖 & 防 Tree Shaking 机制

UI 模块采用 **UIName 枚举 + UIImportAll 集中注册 + 回调注入** 模式，同时解决两个问题：
1. **循环依赖** — UI 类之间通过枚举名互相引用，无需 import 目标 UI 类
2. **Tree Shaking** — 所有 UI 类在 `UIImportAll.ts` 中集中 import 并注册，被 `Main.ts` 显式引用，确保微信小游戏等平台构建时不会被裁剪

关键文件：

| 文件 | 职责 | import 规则 |
|-----|------|------------|
| `UIName.ts` | 纯字符串枚举 | 无任何 import（叶子） |
| `UIRegistry.ts` | name → constructor 映射表 | 无框架 import（叶子） |
| `UIImportAll.ts` | 集中 import 所有UI类 + 注册 | **自动生成**，业务层文件 |
| `UIModule.ts` | UI 管理器 | 通过 UIRegistry 查找构造函数，不 import 任何UI类 |

```
依赖方向（单向，无环，无框架→业务反向依赖）：

UIName.ts ← 无 import（叶子）
UIRegistry.ts ← 无 import（叶子）
    ↑ 被 import
    ├── UIModule.ts（通过 UIRegistry.get() 查找构造函数）
    └── UIImportAll.ts（集中 import 所有UI类 + 调 UIRegistry.register）
            ↑ 被 import
            └── Main.ts（业务入口，通过 setUIRegistrar 注入给 UIModule）
```

#### 注册流程

```typescript
// Main.ts — 业务入口
import {registerAllUI} from "./logic/ui/UIImportAll";

onLoad() {
    tyou.onLoad();
    tyou.ui.setUIRegistrar(registerAllUI);  // 注入注册函数
}

async start() {
    await tyou.onCreate();  // UIModule.onCreate() 内部调用注册函数
}
```

> **为什么不在模块顶层直接注册？**
> 微信小游戏构建可能导致 bundle 分块加载、模块执行顺序不可控。包装成函数由 `UIModule.onCreate()` 显式调用，保证时序可控。
> 框架层 (`ty-framework`) 不直接 import 业务代码，保持框架的可复用性。

### 一键生成 UI 代码（编辑器扩展）

框架内置了 `uitscreate` 编辑器扩展，可以通过 **右键预制体节点** 直接生成对应的 UI TypeScript 类。

#### 节点命名规范

在预制体中按规范命名子节点，扩展会自动识别并生成对应的属性绑定和事件注册：

| 前缀 | 组件类型 | 示例节点名 |
|------|---------|-----------|
| `m_go` | Node | `m_goPanel` |
| `m_tf` | UITransform | `m_tfContent` |
| `m_text` | Label | `m_textTitle` |
| `m_btn` | Node (Button) | `m_btnConfirm` |
| `m_img` | Sprite | `m_imgAvatar` |
| `m_grid` | Layout | `m_gridItems` |
| `m_list` | ListView | `m_listRank` |
| `m_scroll` | ScrollView | `m_scrollContent` |
| `m_toggle` | Toggle | `m_toggleSound` |
| `m_slider` | Slider | `m_sliderVolume` |
| `m_progress` | ProgressBar | `m_progressHP` |
| `m_eb` | EditBox | `m_ebNickname` |
| `m_rt` | RichText | `m_rtDesc` |

#### 使用方式

1. 在预制体中按命名规范命名节点
2. 在 **层级管理器** 中右键点击预制体根节点
3. 选择生成 UI 脚本
4. 自动生成带有属性绑定、事件注册的 TypeScript 文件到 `scripts/logic/ui` 目录
5. **自动更新 `UIName.ts` 枚举**（追加新条目）
6. **自动更新 `UIImportAll.ts`**（追加 import + register）

生成的代码结构：

```typescript
import {Label, Layout, Node, Sprite} from "cc";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {IWindowAttribute, UILayer} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

export class TestUI extends UIWindow {
    //#region UI组件引用
    private _btnEnter: Node;

    static get WINDOW_NAME(): string {
        return UIName.TestUI;
    }

    override bindMemberProperty() {
        this._btnEnter = this.get("m_btnEnter");
    }

    override registerEvent() {
        this.onRegisterEvent(this._btnEnter, this.onBtnEnterClick)
    }
    //#endregion

    private async onBtnEnterClick(btn: Node, param: any) {
        // 按钮点击逻辑
    }

    protected get customAttributeOverride(): Partial<IWindowAttribute> {
        return { };
    }

    override onCreate() { }
    override onRefresh() { }
    override onClosed() { }
}
// 注册由 UIImportAll.ts 统一管理，无需在此文件中手动注册
```

> 命名规范和输出路径可在 `assets/editor/ui-component-config.json` 中自定义配置，模板可在 `assets/editor/ui-template.txt` 中修改。

### UIName 枚举

所有 UI 名称统一在 `scripts/logic/ui/UIName.ts` 中管理，右键生成新 UI 时自动追加：

```typescript
export enum UIName {
    TestUI = "TestUI",
    MessageBoxUI = "MessageBoxUI",
    TestUI1 = "TestUI1",
    // ... 右键生成时自动追加
}
```

### UIImportAll — 集中注册（自动生成）

`scripts/logic/ui/UIImportAll.ts` 由编辑器扩展自动生成，集中 import 所有 UI 类并注册：

```typescript
import {UIRegistry} from "../../../ty-framework/module/ui/UIRegistry";
import {UIName} from "./UIName";
import {TestUI} from "./TestUI";
import {MessageBoxUI} from "./MessageBoxUI";
import {TestUI1} from "./TestUI1";

export function registerAllUI(): void {
    UIRegistry.register(UIName.TestUI, TestUI);
    UIRegistry.register(UIName.MessageBoxUI, MessageBoxUI);
    UIRegistry.register(UIName.TestUI1, TestUI1);
}
```

> 每次右键生成新 UI 脚本时，此文件会自动重新生成，无需手动维护。

### customAttributeOverride — 窗口属性配置

每个 UIWindow 子类都可以通过重写 `customAttributeOverride` getter 来自定义窗口行为：

```typescript
protected get customAttributeOverride(): Partial<IWindowAttribute> {
    return {
        layer: UILayer.Tips,       // 窗口层级
        fullScreen: false,          // 是否全屏（全屏窗口会遮挡下层窗口）
        bgClose: true,              // 点击背景是否关闭（非全屏窗口生效）
        hideTimeToClose: 5,         // 隐藏后自动关闭时间（秒），0 不自动关闭
    };
}
```

#### 层级说明（UILayer）

| 层级 | 值 | 用途 |
|-----|---|------|
| `Bottom` | 0 | 底层背景 |
| `UI` | 1 | 普通 UI 窗口（默认） |
| `Top` | 2 | 顶层弹窗 |
| `Tips` | 3 | Toast 提示 |
| `System` | 4 | 系统级（加载界面、网络异常等） |

#### 全屏与非全屏

- **全屏窗口**（`fullScreen: true`）：会自动隐藏其下方的窗口，节省渲染开销
- **非全屏窗口**（`fullScreen: false`）：弹出时自动显示模糊背景遮罩，可配合 `bgClose` 实现点击背景关闭

### 打开 / 关闭 / 隐藏窗口

通过 `UIName` 枚举引用窗口，无需 import 目标 UI 类，彻底避免循环依赖：

```typescript
// 打开窗口（通过枚举名，推荐方式）
await tyou.ui.showUIAsync(UIName.TestUI, arg1, arg2);

// 在 TestUI 内打开 TestUI2，无需 import TestUI2 类
await tyou.ui.showUIAsync(UIName.TestUI2);

// 在窗口内部关闭自身
this.close();

// 在窗口内部隐藏自身（进入 hideTimeToClose 倒计时）
this.hide();

// 从外部关闭指定窗口
tyou.ui.closeWindow(UIName.TestUI);

// 从外部隐藏指定窗口
tyou.ui.hideWindow(UIName.TestUI);

// 关闭所有窗口
tyou.ui.closeAll();

// 查询窗口
tyou.ui.hasWindow(UIName.TestUI);          // 是否存在
tyou.ui.getWindow(UIName.TestUI);          // 获取实例
tyou.ui.getTopWindow();                     // 获取最顶层窗口名
tyou.ui.getTopWindow(UILayer.UI);           // 获取指定层级最顶层窗口名
```

> 也支持直接传入类构造函数（向后兼容）：`tyou.ui.showUIAsync(TestUI)`，但推荐使用枚举方式。

### UIWindow 生命周期

```
baseLoad → scriptGenerator → bindMemberProperty → registerEvent → onCreate → onRefresh
                                                                            ↓
                                                                       onUpdate (每帧)
                                                                            ↓
                                                                       onClosed → onRelease
```

- `bindMemberProperty()` — 绑定节点引用（通过 `this.get("m_xxx")` 获取节点）
- `registerEvent()` — 注册按钮点击等事件
- `onCreate()` — 窗口首次创建时调用（只调一次）
- `onRefresh()` — 每次显示窗口时调用（创建和再次显示都会调用）
- `onUpdate()` — 每帧更新
- `onClosed()` — 窗口关闭时调用

### 动态加载图片资源（自动引用计数释放）

```typescript
// 在 UIBase/UIWindow 内加载精灵帧，窗口关闭时自动释放
const sprite = await this.getSprite("icon_gold");

// 从图集加载
const frame = await this.getSpriteFromAtlas("common_atlas", "icon_gem");
```

### Tip 提示 & MessageBox

```typescript
// 飘字提示
tyou.ui.tip("操作成功！");

// 确认弹窗（单按钮）
tyou.ui.message({ title: "提示", content: "操作完成" });

// 选择弹窗（双按钮）
tyou.ui.select({ title: "提示", content: "是否确定退出？" });
```

---

## 资源模块（重点）

### 资源索引系统

框架采用 **资源索引（Asset Index）** 机制，加载资源时只需传入逻辑名称，无需关心 Bundle 名和路径。

#### 一键生成资源索引（编辑器扩展）

框架内置 `assetool` 编辑器扩展：

1. 在 `assets/editor/asset-index-config.json` 中配置扫描规则：

```json
{
  "scanConfigs": [
    { "dir": "asset-raw/ui", "extensions": ["prefab"] },
    { "dir": "asset-raw/audio", "extensions": ["mp3", "wav", "ogg"] },
    { "dir": "asset-raw/spine", "extensions": ["skel", "json"] },
    { "dir": "asset-raw/effect", "extensions": ["prefab"] }
  ],
  "outputPath": "resources/asset-index.json",
  "resourceTypeMap": {
    "prefab": "Prefab",
    "png": "SpriteFrame",
    "mp3": "AudioClip",
    "plist": "SpriteAtlas",
    "skel": "sp.SkeletonData"
  },
  "specialMarks": {
    "preload": ["P_", "p_"]
  }
}
```

2. 在 CocosCreator 菜单栏点击 **Tools → Generate Asset Index**
3. 自动扫描配置目录并生成 `asset-index.json`

> 文件名以 `P_` 或 `p_` 开头的资源会自动标记为 `preload`，可在启动时预加载。

#### 资源索引支持特性

- **Bundle 分级**：支持 `core`（登录必需）和 `game`（进入游戏后加载）分级加载
- **特殊标记**：通过 `specialMarks` 配置自动标记资源（如 preload）
- **目录索引**：自动记录 Bundle 目录结构

### 资源加载

所有加载 API 基于资源索引，只需传逻辑名称：

```typescript
// 加载并实例化预制体（自动 addRef，销毁时自动 decRef）
const node = await tyou.res.loadGameObjectAsync("TestUI", parentNode);

// 加载精灵帧
const sprite = await tyou.res.loadSprite("icon_gold");

// 加载图集
const atlas = await tyou.res.loadAtlas("common_atlas");

// 从图集中获取精灵帧
const frame = await tyou.res.loadSpriteFromAtlas("common_atlas", "icon_gem");

// 加载 Spine 动画
await tyou.res.loadSpineAsync(spineComponent, "hero_spine");

// 加载 Spine 特效（播完自动释放）
await tyou.res.loadSpineEffectAsync(spineComponent, "skill_effect");

// 通用资源加载
const asset = await tyou.res.loadAssetAsync("config_data");

// 预加载
tyou.res.preload("hero_prefab");

// Bundle 操作
await tyou.res.loadBundleAsync({ bundle: "game-assets" });
tyou.res.releaseAll("game-assets");
tyou.res.removeBundle("game-assets");
```

### 引用计数与延迟释放

- `loadGameObjectAsync` 加载的预制体自带 `ResourceHolder` 组件，节点销毁时自动 `decRef`
- UI 窗口内 `getSprite` / `getSpriteFromAtlas` 加载的资源，窗口关闭时自动释放
- `decRef` 后资源进入延迟释放队列，等待 Cocos 内部引用清理后再真正释放
- 延迟释放参数可配置：`tyou.res.setReleaseConfig(检查间隔, 延迟时间)`

---

## 其他模块

### 事件模块

```typescript
// 注册/注销事件
tyou.event.on("LEVEL_UP", this.onLevelUp, this);
tyou.event.off("LEVEL_UP", this.onLevelUp, this);

// 一次性监听
tyou.event.once("LOGIN_SUCCESS", this.onLogin, this);

// 触发事件
tyou.event.emit("LEVEL_UP", newLevel);

// 优先级监听（数值越大越先执行）
tyou.event.onWithPriority("DAMAGE", this.onDamage, this, EventPriority.HIGHEST);

// async/await 等待事件
const args = await tyou.event.waitFor("LOGIN_RESULT", 5000); // 超时5秒

// 批量绑定/解绑
const bindId = tyou.event.bindEvents(this, {
    "LEVEL_UP": this.onLevelUp,
    "GOLD_CHANGE": this.onGoldChange,
});
tyou.event.unbindEvents(bindId);
```

### 计时器模块

基于最小堆实现，O(log n) 性能：

```typescript
// 延迟执行
const id = tyou.timer.addTimer(() => {
    console.log("3秒后执行");
}, 3);

// 循环计时器
const loopId = tyou.timer.addTimer(() => {
    console.log("每秒执行");
}, 1, true);

// 暂停 / 恢复 / 重启
tyou.timer.stop(id);
tyou.timer.resume(id);
tyou.timer.restart(id);

// 移除计时器
tyou.timer.removeTimer(id);

// 获取剩余时间
const left = tyou.timer.getLeftTime(id);
```

### 对象池模块

```typescript
// Node 池 — 加载预制体并池化
const node = await tyou.pool.instantiateAsync("bullet_prefab", parentNode);
tyou.pool.releaseNode(node); // 回收

// Class 池 — 借用-使用-归还模式（自动归还）
tyou.pool.useVec3((v) => {
    v.set(1, 2, 3);
    // 使用完自动归还池
});

// 手动借还
const v = tyou.pool.getVec3();
// ... 使用 v ...
tyou.pool.releaseVec3(v);

// 自定义 Class 池
const obj = tyou.pool.getClass("MyClass", MyClass);
tyou.pool.releaseClass("MyClass", obj);
```

### 场景模块

```typescript
// 异步切换场景
await tyou.scene.loadSceneAsync(SceneEnum.Game, { level: 1 });

// 场景内加载的资源可绑定到场景，离开时自动释放
tyou.scene.addAutoReleaseAsset(asset);
```

### 音频模块

```typescript
// 背景音乐
tyou.audio.playBGM("bgm_main");

// 音效（支持优先级抢占）
tyou.audio.playEffect("btn_click");

// 音量控制
tyou.audio.setBGMVolume(0.8);
tyou.audio.setEffectVolume(0.5);

// 暂停/恢复
tyou.audio.pauseAll();
tyou.audio.resumeAll();

// 预加载
tyou.audio.preloadAudios(["btn_click", "coin_get", "level_up"]);
```

### 有限状态机

```typescript
// 创建 FSM
const fsm = tyou.fsm.createFSM(this);

// 注册状态
fsm.registerStates({
    "idle": new IdleState(),
    "run": new RunState(),
    "attack": new AttackState(),
});

// 切换状态（支持 async/await）
await fsm.changeState("run", { speed: 5 });

// 查询
fsm.getCurrentState();  // "run"
fsm.isInState("idle");  // false
```

状态需实现 `IFSMState<T>` 接口：

```typescript
class IdleState implements IFSMState<MyEntity> {
    onEnter(prevState: string, data?: any) { }
    onExit(nextState: string) { }
    onUpdate(dt: number) { }
}
```

### ECS 系统

```typescript
// 定义组件
@ecs.register('MoveComp')
class MoveComp extends ecs.Comp {
    speed: number = 0;
    reset() { this.speed = 0; }
}

// 定义实体
@ecs.register('Player', false)
class Player extends ecs.Entity {
    move: MoveComp;
}

// 创建实体
const player = ecs.getEntity(Player);
player.add(MoveComp);

// 定义系统
class MoveSystem extends ecs.ComblockSystem implements ISystemUpdate {
    init() { this.setFilter(ecs.allOf(MoveComp)); }
    update(entities: ecs.Entity[]) {
        for (const e of entities) {
            // 移动逻辑
        }
    }
}

// 单例组件
ecs.addSingleton(new GameState());
const state = ecs.getSingleton(GameState);
```

### 网络模块

支持多通道 WebSocket 通信：

```typescript
// 连接
NetManager.instance.connect({
    url: "ws://localhost:8080",
    protocol: new NetProtocolJson(),  // 或 NetProtocolProtobuf / NetProtocolPako
    heartbeat: { interval: 5 },
    reconnect: { maxRetry: 3 },
});

// 发送
NetManager.instance.send(data);

// 请求-响应模式
NetManager.instance.request(protocol, responseHandler);
```

### 持久化存储

```typescript
tyou.storage.set("userId", 12345);
const id = tyou.storage.get("userId");
tyou.storage.remove("userId");
tyou.storage.clear();
```

### HTTP 模块

```typescript
tyou.http.server = "https://api.example.com";

// GET
tyou.http.get("/user/info", (data) => { }, (err) => { });

// POST
tyou.http.post("/login", { username: "test" }, (data) => { });

// 带参数 GET
tyou.http.getWithParams("/search", { keyword: "test" }, (data) => { });
```

### 配置表（Luban）

使用 Luban 工具链生成二进制配置：

1. 在 `Design/tools/Defines` 中定义数据结构
2. 运行 `Design/tools/genBin.bat` 生成 TypeScript 类型代码和二进制数据
3. 代码中访问：

```typescript
const tables = tyou.table.getConfig();
const itemConfig = tables.TbItem.get(1001);
```

### Update 回调管理

不需要继承 Component 也能获得每帧更新：

```typescript
tyou.update.addUpdate(this, (dt) => {
    // 每帧逻辑
});

tyou.update.removeUpdate(this);
```

### GameWorld（服务器时间）

```typescript
// 同步服务器时间
tyou.game.setServerTime(serverTimestamp);

// 获取服务器时间
const now = tyou.game.getServerTime();

// 配置每日重置（如每天凌晨5点）
tyou.game.setDayBoundary(8, 5); // 东八区，5点重置

// 跨天检测
tyou.game.checkIsNewDay(lastLoginTs);
```

---

## 项目结构

```
Client/
├── assets/
│   ├── ty-framework/              # 框架核心
│   │   ├── core/                  # 基础设施
│   │   │   ├── ecs/               # ECS 系统
│   │   │   ├── collections/       # 数据结构（List, Dictionary）
│   │   │   ├── util/              # 工具类
│   │   │   ├── animator/          # 动画控制器
│   │   │   └── log/               # 日志系统
│   │   ├── module/                # 功能模块
│   │   │   ├── ui/                # UI 模块
│   │   │   ├── loader/            # 资源模块
│   │   │   ├── audio/             # 音频模块
│   │   │   ├── event/             # 事件模块
│   │   │   ├── timer/             # 计时器模块
│   │   │   ├── pool/              # 对象池模块
│   │   │   ├── scene/             # 场景模块
│   │   │   ├── fsm/               # 状态机模块
│   │   │   ├── network/           # 网络模块
│   │   │   ├── http/              # HTTP 模块
│   │   │   ├── storage/           # 存储模块
│   │   │   ├── table/             # 配置表模块
│   │   │   ├── update/            # Update 管理
│   │   │   └── world/             # GameWorld
│   │   └── Tyou.ts                # 框架入口 & 全局单例
│   ├── editor/                     # 编辑器配置
│   │   ├── ui-component-config.json   # UI 组件命名规范配置
│   │   ├── ui-template.txt            # UI 代码生成模板
│   │   └── asset-index-config.json    # 资源索引扫描配置
│   ├── asset-raw/                  # 原始资源（按 Bundle 组织）
│   ├── scripts/                    # 业务逻辑代码
│   │   ├── Main.ts                    # 入口组件
│   │   └── logic/ui/
│   │       ├── UIName.ts              # UI名称枚举（自动生成）
│   │       ├── UIImportAll.ts         # UI集中注册（自动生成）
│   │       ├── TestUI.ts              # 具体UI类
│   │       └── ...
│   └── resources/                  # resources 目录（asset-index.json）
├── extensions/
│   ├── uitscreate/                # UI 代码生成插件
│   └── assetool/                  # 资源索引生成插件
Design/
├── tools/
│   ├── genBin.bat                 # Luban 配置表生成脚本
│   ├── luban.conf                 # Luban 配置
│   └── Defines/                   # 数据结构定义
```

## License

MIT

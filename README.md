# Tyou

CocosCreator 3.8.7 基础框架，比较适合 Unity 初转型 CCC 的使用者。参考了 **TEngine** 等开源框架。
（如果对你有帮助，给个star就好了。）
（有问题反馈 qq 499793702  TEngine技术群 862987645）

## 特性概览

- **PSD → UI 全流程** — PSD 切图导出 → 生成节点树 → 前缀命名 → 自动检查组件 → 一键生成代码
- **全局单例架构** — 所有模块通过 `tyou.*` 全局访问，无需频繁 `getComponent`
- **UI 模块** — 栈式管理 + 层级系统 + 模糊背景 + 右键一键生成 UI 代码
- **资源模块** — 资源索引 + 自动引用计数 + 延迟释放 + Bundle 自动发现
- **对象池** — Node 池 & Class 池，内置 Vec3/Vec2/Color 等常用类型池
- **事件系统** — 完全自实现优先级事件（不依赖 Cocos EventTarget）、`async/await` 等待事件、批量绑定
- **日志系统** — 分类日志（Net/Model/Business/View/Config/Trace）、颜色区分、位运算开关
- **计时器** — 基于最小堆的高性能计时器
- **有限状态机** — 支持异步状态切换
- **ECS** — 经典 Entity-Component-System，bitmask 匹配 + 对象池回收
- **网络模块** — 多通道 WebSocket，心跳、断线重连、Protobuf/JSON/Pako 协议
- **音频模块** — 对象池 + 优先级抢占
- **调试工具** — 运行时性能面板（FPS/内存/池/DrawCall），统一开关，默认关闭零开销
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

此外还有全局日志工具（无需通过 `tyou` 访问）：

```typescript
Log           // 全局日志（globalThis.Log）
Unitask       // 全局异步工具（globalThis.Unitask）
```

---

## PSD → UI 全流程产线 

为了防止美术和策划再因为psd工作流增加多余工作量而扯皮，框架提供了一套完整的仅供程序使用的减轻拼UI工作量的 **从 PSD 设计稿到可运行 UI 代码** 的自动化流水线，中间只需人工介入“调键点/改前缀”一步（暂不支持九宫格切割等细微优化也需要手工调整一下）：

```
PSD 设计稿
  │  ① 在 Photoshop 中打开 PSD，运行 Psd2CCC-Digest.jsx 脚本
  │     → 自动切图导出 PNG + 生成节点结构 JSON
  ▼
导入 Cocos Creator
  │  ② 在资源管理器中右键 JSON 文件 → 「📐 PSD生成UI」
  │     → 自动在 Canvas 下生成完整节点树（位置/尺寸/精灵帧自动绑定）
  ▼
手动调整
  │  ③ 调整键点、布局、按命名规范改前缀（m_btn、m_text、m_img 等）
  ▼
检查前缀组件
  │  ④ 在层级管理器中右键根节点 → 「🔍 检查前缀组件」
  │     → 自动检查所有子节点，移除互斥组件，添加正确组件
  ▼
生成 UI 代码
  │  ⑤ 右键根节点 → 「🎯 生成UI脚本」
  │     → 自动生成 TypeScript 类（属性绑定 + 事件注册）
  │     → 自动更新 UIName.ts 和 UIImportAll.ts
  ▼
✅ 可运行的 UI 界面
```

---

### PSD 切图导出（Psd2CCC-Digest）

#### 脚本位置

Photoshop 脚本位于项目中：

```
Client/tools/psd/Psd2CCC-Digest.jsx
```

使用前需将此文件 **复制到 Photoshop 的 Scripts 目录**，便于通过菜单快速调用：

| 系统 | Photoshop Scripts 目录 |
|------|-------------------------|
| Windows | `C:\Program Files\Adobe\Adobe Photoshop <版本>\Presets\Scripts\` |
| macOS | `/Applications/Adobe Photoshop <版本>/Presets/Scripts/` |

复制后重启 Photoshop，即可在菜单栏 `文件 → 脚本` 中看到 `Psd2CCC-Digest`。

> 也可不复制，直接通过 `文件 → 脚本 → 浏览` 手动选择项目中的 `.jsx` 文件运行。

#### 环境要求

- Adobe Photoshop **CC 2018+**
- PSD 文件放在 `Client/assets/asset-art/psd/` 目录下

#### 使用步骤

1. 在 Photoshop 中打开位于 `assets/asset-art/psd/` 目录下的 PSD 文件
2. 运行脚本：`文件 → 脚本 → Psd2CCC-Digest`（或浏览选择 `.jsx`）
3. 脚本自动执行以下操作：
   - **栈格化**智能对象/形状/填充层（自动恢复，不修改 PSD）
   - **导出 PNG** → `Client/assets/asset-art/atlas/{psdName}/`
   - **生成结构 JSON** → `Client/assets/asset-art/psd/tool/{psdName}/{psdName}-structure.json`
   - 文字层自动识别为 `text` 节点（保留字体/字号/颜色）
   - 重复图层自动去重（相同像素只导出一次，多个节点共用引用）
   - 中文图层名自动转拼音首字母（避免文件名乱码）
4. 导出完成后显示统计信息（PNG 数量、文字数量、去重数量、输出路径）

#### 输出目录说明

| 输出内容 | 路径 | 说明 |
|---------|------|------|
| 切图 PNG | `assets/asset-art/atlas/{psdName}/` | 按 PSD 名称分目录，Cocos 可直接使用 |
| 结构 JSON | `assets/asset-art/psd/tool/{psdName}/{psdName}-structure.json` | 记录节点树结构、位置、尺寸、类型 |

#### PSD 图层规范

- **可见图层** 才会被导出，隐藏图层自动跳过
- **组（LayerSet）** 会生成对应的父节点，保留层级结构
- **文字层** 自动识别为 text 节点，保留字体、字号、颜色信息
- **调整层**（亮度/对比度等）自动跳过

---

### 导入 Cocos Creator（psd2ccc 扩展）

PSD 切图完成后，在 CocosCreator 中通过 `psd2ccc` 编辑器扩展将 JSON 结构生成为场景节点树：

1. 在 Cocos Creator 的 **资源管理器** 中找到生成的 `{psdName}-structure.json` 文件
2. **右键** 该 JSON 文件
3. 点击 **「📐 PSD生成UI」**
4. 扩展自动执行：
   - 解析 JSON 中的节点树结构
   - 找到场景中的 Canvas 节点
   - 在 Canvas 下创建 UI 根节点（带 Widget 全屏适配）
   - 递归创建所有子节点，自动设置：
     - UITransform（尺寸）
     - 位置（PSD 绝对坐标 → Cocos 相对坐标自动转换）
     - Sprite 组件 + SpriteFrame 引用（图片层）
     - Label 组件 + 文字内容/字号/颜色（文字层）
   - PSD 图层顺序自动映射为 Cocos 渲染顺序
5. 完成后弹出统计信息

> 坐标转换说明：PSD 原点在左上角、Y 轴向下；Cocos 原点在父节点锚点（默认中心）、Y 轴向上。扩展自动完成转换。

---

### 检查前缀组件（自动修正）

节点命名前缀确定后，通过 **「🔍 检查前缀组件」** 右键菜单自动检查并修正所有子节点的组件：

#### 使用方式

1. 在层级管理器中右键点击 UI 根节点
2. 选择 **「🔍 检查前缀组件」**
3. 扩展自动扫描所有子节点，按前缀规则执行：

#### 检查规则

| 前缀 | 检查规则 | 互斥处理 |
|------|---------|----------|
| `m_go` | 只要是 Node 即可，无需额外组件 | 无 |
| `m_tf` | 必须包含 `UITransform`，没有则自动添加 | 无 |
| `m_text` | 必须包含 `Label`，先移除互斥渲染器（如 Sprite）再添加 | Sprite、RichText、EditBox 等渲染器 |
| `m_btn` | 必须包含 `Button` 组件，没有则自动添加 | 无（Button 不与渲染器互斥） |
| `m_img` | 必须包含 `Sprite`，先移除互斥渲染器（如 Label）再添加 | Label、RichText、EditBox 等渲染器 |
| `m_grid` | 必须包含 `Layout`，没有则自动添加 | 无 |
| `m_list` | 必须包含 `ScrollView`（ListView 基于它） | 无 |
| `m_scroll` | 必须包含 `ScrollView` | 无 |
| `m_toggle` | 必须包含 `Toggle`，先移除互斥交互组件再添加 | Slider、ProgressBar |
| `m_slider` | 必须包含 `Slider`，先移除互斥交互组件再添加 | Toggle、ProgressBar |
| `m_progress` | 必须包含 `ProgressBar`，先移除互斥交互组件再添加 | Toggle、Slider |
| `m_eb` | 必须包含 `EditBox`，先移除互斥渲染器再添加 | Sprite、Label、RichText 等渲染器 |
| `m_rt` | 必须包含 `RichText`，先移除互斥渲染器再添加 | Sprite、Label、EditBox 等渲染器 |

#### 互斥组件组（Cocos Creator 引擎限制）

同一个节点上不能同时存在同组的组件：

| 组别 | 互斥组件 | 说明 |
|------|---------|------|
| 渲染器组 | Sprite、Label、RichText、EditBox、Graphics、Mask | 每个节点只能有一个渲染器（继承自 UIRenderer） |
| 交互组件组 | Toggle、Slider、ProgressBar | 互相排斥的交互组件 |

#### 两阶段执行机制

由于 Cocos Creator 引擎中移除组件后需要等待一帧刷新才能添加同组互斥组件，检查器采用两阶段执行：

1. **阶段 1**：扫描所有节点，移除互斥组件，直接添加无冲突组件
2. **等待刷新**：等待引擎 tick 完成组件销毁
3. **阶段 2**：添加因互斥而推迟的组件（失败自动重试）

> 典型场景：节点名称为 `m_textTitle` 但上面是 Sprite 组件（PSD 导入时图片层生成的），检查器会自动移除 Sprite，等引擎刷新后添加 Label。

---

## UI 模块（重点）

UI 模块是框架的核心功能之一，提供了 **栈式窗口管理**、**层级系统**、**模糊背景**、**自动节点绑定** 等能力。

### 防循环依赖 & 防 Tree Shaking 机制

UI 模块采用 **UIDecorator 装饰器 + UIImportAll 副作用导入** 模式，同时解决两个问题：
1. **循环依赖** — UI 类之间通过枚举名互相引用，无需 import 目标 UI 类
2. **Tree Shaking** — 所有 UI 类在 `UIImportAll.ts` 中通过副作用导入，被 `Main.ts` 显式引用，确保微信小游戏等平台构建时不会被裁剪

关键文件：

| 文件 | 职责 | import 规则 |
|-----|------|------------|
| `UIName.ts` | 纯字符串枚举 | 无任何 import（叶子） |
| `UIRegistry.ts` | name → constructor 映射表 | 无框架 import（叶子） |
| `UIDecorator.ts` | 类装饰器，自动注册 + 属性配置 | 只 import UIRegistry 和 WindowAttribute（叶子） |
| `UIImportAll.ts` | 副作用导入所有 UI 类 | **自动生成**，业务层文件 |
| `UIModule.ts` | UI 管理器 | 通过 UIRegistry 查找构造函数，不 import 任何UI类 |

```
依赖方向（单向，无环，无框架→业务反向依赖）：

UIName.ts ← 无 import（叶子）
UIRegistry.ts ← 无 import（叶子）
    ↑ 被 import
    ├── UIModule.ts（通过 UIRegistry.get() 查找构造函数）
    ├── UIDecorator.ts（装饰器，import UIRegistry + WindowAttribute）
    │       ↑ 被 import
    │       └── 各 UI 类（@UIDecorator 装饰器在 import 时自动注册）
    └── UIImportAll.ts（副作用导入所有 UI 类，触发装饰器执行）
            ↑ 被 import
            └── Main.ts（业务入口，副作用导入 UIImportAll）
```

#### 注册流程

```typescript
// Main.ts — 业务入口
import "./logic/ui/UIImportAll";  // 副作用导入，触发所有 UI 装饰器注册

onLoad() {
    tyou.onLoad();
}

async start() {
    await tyou.onCreate();
}
```

每个 UI 类通过 `@UIDecorator` 装饰器在 import 时自动完成注册，无需手动调用。装饰器会：
1. 在类上存储 `__uiName` 和 `__uiAttributes` 元数据
2. 调用 `UIRegistry.register()` 完成注册

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
6. **自动更新 `UIImportAll.ts`**（追加副作用导入）

生成的代码结构：

```typescript
import {Label, Layout, Node, Sprite} from "cc";
import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";
import {UIDecorator} from "../../../ty-framework/module/ui/UIDecorator";
import {UILayer} from "../../../ty-framework/module/ui/WindowAttribute";
import {UIName} from "./UIName";

@UIDecorator({ name: UIName.TestUI })
export class TestUI extends UIWindow {
    //#region UI组件引用
    private _btnEnter: Node;

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

    override onCreate() { }
    override onRefresh() { }
    override onClosed() { }
}
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

### UIImportAll — 副作用导入（自动生成）

`scripts/logic/ui/UIImportAll.ts` 由编辑器扩展自动生成，通过副作用导入触发所有 UI 类的装饰器注册：

```typescript
import "./TestUI";
import "./MessageBoxUI";
import "./TestUI1";
```

> 每次右键生成新 UI 脚本时，此文件会自动重新生成，无需手动维护。

#### 为什么 UIName 和 UIImportAll 必须分开？

UIName.ts 是纯数据枚举（无任何 import），UIImportAll.ts 是副作用导入文件。两者不能合并的根本原因是 **ES Module 循环引用**：

- 如果合并为一个文件，该文件会同时 `export enum UIName` 并 `import "./TestUI"`
- 每个 UI 类又会 `import { UIName } from "./UIName"` → 形成循环引用
- ES Module 的 `import` 声明会被提升（hoisted），导致 UI 类的 `@UIDecorator({ name: UIName.xxx })` 执行时 UIName 枚举尚未初始化，值为 `undefined`
- 分成两个文件后，UIName.ts 无任何 import，保证它始终是叶子节点，不参与任何依赖环

### @UIDecorator — 窗口注册与属性配置

每个 UIWindow 子类通过 `@UIDecorator` 装饰器同时完成注册和窗口属性配置。

**最简用法 — 只需提供 `name`，其余属性使用内置默认值：**

```typescript
@UIDecorator({ name: UIName.TestUI })
export class TestUI extends UIWindow { ... }
```

装饰器内部默认值：`layer: UILayer.UI, fullScreen: true, bgClose: false, hideTimeToClose: 3`。

**需要覆盖默认属性时，添加对应参数即可：**

```typescript
import {UILayer} from "../../../ty-framework/module/ui/WindowAttribute";

@UIDecorator({
    name: UIName.MessageBoxUI,
    layer: UILayer.Tips,           // 覆盖层级为 Tips
    fullScreen: false,             // 非全屏弹窗
    hideTimeToClose: 60,           // 隐藏后 60 秒再销毁
})
export class MessageBoxUI extends UIWindow { ... }
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | **必填** | UI 名称，推荐使用 `UIName` 枚举 |
| `layer` | `UILayer` | `UILayer.UI` | 窗口层级 |
| `fullScreen` | `boolean` | `true` | 全屏窗口会遮挡下层窗口 |
| `bgClose` | `boolean` | `false` | 点击背景关闭（非全屏窗口生效） |
| `hideTimeToClose` | `number` | `3` | 隐藏后自动关闭时间（秒） |

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

框架内置 `assetool` 编辑器扩展，**自动扫描项目中所有 Bundle** 并生成资源索引：

1. 在 `assets/editor/asset-index-config.json` 中配置生成规则：

```json
{
  "imagePrefixFilter": "l_",
  "directoryBundles": ["config"],
  "excludeBundles": ["resources", "asset-catalog"],
  "outputBundleName": "asset-catalog",
  "outputFileName": "asset-index",
  "resourceTypeMap": {
    "prefab": "Prefab",
    "png": "SpriteFrame",
    "mp3": "AudioClip",
    "plist": "SpriteAtlas",
    "skel": "sp.SkeletonData",
    "bin": "BufferAsset",
    "text": "TextAsset"
  },
  "specialMarks": {
    "preload": ["P_", "p_"]
  }
}
```

2. 在 CocosCreator 菜单栏点击 **Tools → Generate Asset Index**
3. 自动扫描所有 `.meta` 文件中 `isBundle: true` 的文件夹，生成 `asset-index.json` 到 `asset-catalog` Bundle

#### Bundle 自动发现规则

- 扫描 `assets/` 下所有文件夹的 `.meta` 文件，查找 `userData.isBundle === true`
- Bundle 名称优先使用 `userData.bundleName`，未设定时使用文件夹名
- `excludeBundles` 中的 Bundle（如 `resources`、`asset-catalog`）不会被扫描
- `directoryBundles` 中的 Bundle 只索引第一级子目录（适合配置表等纯目录加载场景）

#### 图片前缀过滤

图片资源（png/jpg/jpeg/bmp/webp/gif）只有文件名以 `imagePrefixFilter`（默认 `l_`）开头时才会被收录到索引中。这样可以避免大量美术碎图污染索引。

> 文件名以 `P_` 或 `p_` 开头的资源会自动标记为 `preload`，可在启动时预加载。

#### 二进制文件（.bin）、文本文件（.text）与 JSON 文件（.json）索引

`resourceTypeMap` 中配置了以下特殊文件类型的映射：

| 扩展名 | Cocos 类型 | 用途 |
|--------|-----------|------|
| `.bin` | `BufferAsset` | 自定义二进制数据（协议、加密数据等） |
| `.text` | `TextAsset` | 纯文本数据文件（配置、模板、脚本等） |
| `.json` | `JsonAsset` | JSON 结构化数据 |

**Luban 生成的配置文件不会被索引：** `config` Bundle 配置在 `directoryBundles` 中，只索引一级子目录名称，不扫描其中的具体文件。Luban 配置表的加载由 `TableModule` 统一处理，无需经过资源索引。

> 如果需要在其他 Bundle 中放置自定义 `.bin`、`.text` 或 `.json` 文件，确保该 Bundle 不在 `directoryBundles` 中，即可被自动索引。

#### 索引输出位置

`asset-index.json` 生成在独立的 `asset-catalog` Bundle 中（位于 `asset-raw/asset-catalog/`），而非 `resources` 目录。这样避免索引文件随资源增长而影响游戏初始加载速度。运行时通过 `assetManager.loadBundle("asset-catalog")` 按需加载。

#### 资源索引支持特性

- **Bundle 自动发现**：自动扫描 `.meta` 文件发现所有 Bundle，无需手动配置扫描目录
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

## 事件模块

完全自实现的优先级事件系统（**不依赖 Cocos EventTarget**），基于 **观察者模式**，提供 **统一优先级排序**、**异步等待**、**批量绑定** 等能力。

所有监听器统一管理在同一个 Map 中，`on()` / `once()` 默认优先级为 `NORMAL(50)`，也可通过第四个参数指定优先级。`emit()` 时严格按优先级降序执行，每个监听器独立 try/catch，单个回调异常不影响其他监听器。

### 优先级

| 级别 | 值 | 说明 |
|------|---|------|
| `LOWEST` | 0 | 最低优先级 |
| `LOW` | 25 | 低优先级 |
| `NORMAL` | 50 | 默认 |
| `HIGH` | 75 | 高优先级 |
| `HIGHEST` | 100 | 最高优先级，最先执行 |

### API

```typescript
// 注册/注销事件（默认 NORMAL 优先级）
tyou.event.on("LEVEL_UP", this.onLevelUp, this);
tyou.event.off("LEVEL_UP", this.onLevelUp, this);

// 带优先级注册（第四个参数）
tyou.event.on("DAMAGE", this.onDamage, this, EventPriority.HIGHEST);

// 一次性监听
tyou.event.once("LOGIN_SUCCESS", this.onLogin, this);

// 触发事件（最多传 5 个参数）
tyou.event.emit("LEVEL_UP", newLevel);

// async/await 等待事件（超时返回 null）
const args = await tyou.event.waitFor("LOGIN_RESULT", 5000); // 超时5秒

// 批量绑定/解绑（返回 bindId）
const bindId = tyou.event.bindEvents(this, {
    "LEVEL_UP": this.onLevelUp,
    "GOLD_CHANGE": this.onGoldChange,
});
tyou.event.unbindEvents(bindId);

// 移除目标上的所有监听
tyou.event.targetOff(this);

// 查询
tyou.event.hasEventListener("LEVEL_UP");
tyou.event.getListenerCount("LEVEL_UP");
```

> `onWithPriority()` / `onceWithPriority()` 仍可使用（已标记 `@deprecated`），推荐直接使用 `on()` / `once()` 的第四个参数。

---

## 计时器模块

基于 **最小堆（Min-Heap）** 实现的高性能计时器。插入/移除 O(log n)，获取最近到期 O(1)。内部使用 **对象池** 复用 Timer 实例，避免 GC 压力。

每帧批量处理到期计时器，设有安全上限（1000 次/帧）防止死循环。支持暂停、恢复、重启、剩余时间查询。

### API

```typescript
// 延迟执行（单位：秒）
const id = tyou.timer.addTimer(() => {
    console.log("3秒后执行");
}, 3);

// 循环计时器
const loopId = tyou.timer.addTimer(() => {
    console.log("每秒执行");
}, 1, true);

// 带参数的计时器
tyou.timer.addTimer((args) => {
    console.log(args[0]); // "hello"
}, 2, false, "hello");

// 暂停 / 恢复 / 重启
tyou.timer.stop(id);
tyou.timer.resume(id);
tyou.timer.restart(id);

// 重设时间和回调
tyou.timer.resetTimer(id, newCallback, 5, true);
tyou.timer.resetTimerEx(id, 10, false); // 仅重设时间，保留回调

// 移除
tyou.timer.removeTimer(id);
tyou.timer.removeAllTimer();

// 查询
tyou.timer.getLeftTime(id);    // 剩余秒数
tyou.timer.isRunning(id);      // 是否运行中
tyou.timer.getTimerCount();    // 活跃计时器数量
```

---

## 对象池模块

双池架构：**Node 池**（Cocos 预制体实例化）和 **Class 池**（纯 TypeScript 对象）。支持 **RAII 自动归还**、**帧分布实例化**、**过期清理** 等高级特性。

### Node 池

基于 `WeakMap` 跟踪节点归属。支持 `maxInstancesPerFrame` 避免帧峰值、`expireTime` 自动回收空闲节点、`minReserveCount` 保留最低缓存。

```typescript
// 自动创建池 + 实例化（设置父节点和位置）
const node = await tyou.pool.instantiateAsync("bullet_prefab", parentNode, new Vec3(0, 0, 0));
tyou.pool.releaseNode(node); // 回收到池

// 手动配置池
await tyou.pool.getOrCreateNodePool({
    assetPath: "bullet_prefab",
    maxCapacity: 50,
    preloadCount: 10,
    expireTime: 60,            // 空闲 60s 后回收
    minReserveCount: 5,        // 最少保留 5 个
    maxInstancesPerFrame: 3    // 每帧最多实例化 3 个
});

// 销毁池
tyou.pool.destroyNodePool("bullet_prefab");
```

### Class 池

支持 **RAII 模式**（`useClass` / `useVec3` 等）：回调执行完自动归还，避免忘记释放。

```typescript
// RAII 模式 — 用完自动归还
tyou.pool.useVec3((v) => {
    v.set(1, 2, 3);
    return v.length(); // 返回值透传
});

tyou.pool.useVec2((v) => { v.set(10, 20); });
tyou.pool.useColor((c) => { c.set(255, 0, 0, 255); });
tyou.pool.useQuat((q) => { /* ... */ });

// 手动借还
const v = tyou.pool.getVec3();
// ... 使用 ...
tyou.pool.releaseVec3(v);
tyou.pool.releaseVec3List([v1, v2, v3]); // 批量归还

// 自定义 Class 池
const obj = tyou.pool.getClass("MyClass", MyClass);
tyou.pool.releaseClass("MyClass", obj);

// RAII 自定义 Class — 回调执行完自动归还
const result = tyou.pool.useClass("MyClass", MyClass, (obj) => {
    obj.doSomething();
    return obj.result;
});
```

---

## 音频模块

基于 **AudioSource 对象池** + **优先级抢占** 机制。池满时低优先级音频会被高优先级音频抢占。AudioClip 采用 **引用计数缓存**，引用归零时自动释放。

### 音频优先级

| 优先级 | 值 | 说明 |
|--------|---|------|
| `BGM` | 0 | 背景音乐（最高）|
| `VOICE` | 1 | 语音 |
| `UI` | 2 | UI 音效 |
| `EFFECT` | 3 | 游戏音效 |
| `LOWEST` | 4 | 最低优先级 |

AudioSource 池默认上限 10 个（适配微信小游戏限制）。`onUpdate()` 每帧检测播放完毕的非循环音频并自动回收到池。

### API

```typescript
// 背景音乐
tyou.audio.playBGM("bgm_main");
tyou.audio.playBGM("bgm_battle", false); // 不循环

// 音效（带优先级）
tyou.audio.playEffect("btn_click");
tyou.audio.playEffect("skill_cast", false, AudioPriority.UI);

// 音量控制（0-1）
tyou.audio.setBGMVolume(0.8);
tyou.audio.setEffectVolume(0.5);
tyou.audio.setVolume(0.6); // 全局音量

// 暂停/恢复
tyou.audio.pauseAll();
tyou.audio.resumeAll();

// 停止
tyou.audio.stopAll();
tyou.audio.stopByType(AudioType.EFFECT);
tyou.audio.stopAndReturnByPath("btn_click");
tyou.audio.stopAndReturnAllLoop(); // 停所有循环音频

// 预加载
tyou.audio.preloadAudios(["btn_click", "coin_get", "level_up"]);

// 查询
tyou.audio.getActiveAudioCount();
tyou.audio.getPoolSize();
tyou.audio.getCacheSize();
tyou.audio.getAudioSourcesByPath("btn_click");

// 强制释放（无视引用计数）
tyou.audio.forceReleaseAudio("old_bgm");
```

---

## 场景模块

提供 **异步场景切换**、**过渡回调**、**场景缓存**、**资源自动释放** 等能力。内部使用 `director.runSceneImmediate()` 实现异步加载后立即切换，防止重复/并发加载。加载失败时自动恢复 `_isSwitching` 状态，不会卡死。

场景的资源释放遵循 Cocos 底层，框架不干预场景 bundle 的释放。

场景生命周期：`onBeforeSwitch()` → `onLeave()` → 加载资源 → `onInit()` → `onEnter(data)` → `onAfterSwitch()`

### 场景注册

框架在 `SceneModule.onCreate()` 中默认注册了 `LoginScene` 和 `GameScene`。如需自定义行为，继承 `SceneBase` 后通过 `registerScene()` 覆盖：

```typescript
// 覆盖默认场景（用自定义子类替换）
tyou.scene.registerScene(new MyGameScene(SceneEnum.Game));
```

### API

```typescript
// 异步切换场景（传递数据到目标场景，返回是否成功）
const success = await tyou.scene.loadSceneAsync("game", { level: 1 });

// 过渡回调（可用于显示/隐藏 loading 画面）
tyou.scene.onBeforeSwitch = (from, to) => { /* 显示 loading */ };
tyou.scene.onAfterSwitch  = (from, to) => { /* 隐藏 loading */ };

// 绑定资源到场景，离开时自动释放
tyou.scene.addAutoReleaseAsset(asset);

// 查询
tyou.scene.getCurrentScene();   // 当前场景实例
tyou.scene.isSwitching();       // 是否正在切换

// 场景注册/注销
tyou.scene.registerScene(myScene);
tyou.scene.unregisterScene("GameScene");
tyou.scene.getScene("GameScene");
tyou.scene.getAllSceneNames();
```

### 自定义场景

继承 `SceneBase` 实现场景逻辑：

```typescript
class GameScene extends SceneBase {
    onInit(sceneAsset: Asset) { super.onInit(sceneAsset); /* 初始化 */ }
    onEnter(data?: any) { /* 进入场景 */ }
    onLeave() { super.onLeave(); /* 离开清理，super.onLeave() 会自动释放动态资源 */ }
}
```

---

## 有限状态机模块

支持 **异步状态切换**（`onEnter`/`onExit` 返回 `Promise`），安全处理并发切换。通过 `FSMModule` 统一管理所有 FSM 实例，支持按 Owner 批量销毁。

### API

```typescript
// 创建 FSM（关联 owner）
const fsm = tyou.fsm.createFSM(this);

// 注册状态
fsm.registerState("idle", new IdleState());
fsm.registerStates({
    "idle": new IdleState(),
    "run": new RunState(),
    "attack": new AttackState(),
});

// 异步切换状态（等待 exit + enter 完成）
await fsm.changeState("run", { speed: 5 });

// 查询
fsm.getCurrentState();   // "run"
fsm.getPreviousState();  // "idle"
fsm.isInState("idle");   // false
fsm.getAllStates();       // ["idle", "run", "attack"]

// 控制
fsm.setActive(false);    // 暂停
fsm.reset("idle");       // 重置到指定状态
fsm.destroy();           // 销毁

// 模块级管理
tyou.fsm.getFSM(fsmId);
tyou.fsm.destroyFSM(fsm);
tyou.fsm.destroyAllFSMByOwner(this); // 批量销毁
tyou.fsm.getStats();     // 统计信息
```

### 状态接口

状态需实现 `IFSMState<T>` 接口，`onEnter` / `onExit` 支持 async：

```typescript
class IdleState implements IFSMState<MyEntity> {
    async onEnter(prevState: string, data?: any) {
        // 异步操作（如播放异步动画）
    }
    async onExit(nextState: string) {
        // 异步清理
    }
    onUpdate(dt: number) {
        // 每帧更新
    }
}
```

---

## ECS 系统

经典 **Entity-Component-System** 架构，采用 **Bitmask 匹配**（`Uint32Array`）实现 O(1) 组件判断，**对象池** 自动回收实体和组件，**装饰器注册** 简化使用。

### 核心概念

| 概念 | 说明 |
|------|------|
| **Entity** | 实体，组件容器。支持 `add`/`remove`/`get`/`has` 组件操作，支持父子层级 |
| **Comp** | 组件，纯数据。必须实现 `reset()` 方法用于对象池回收时清理数据 |
| **System** | 系统，处理逻辑。通过 `Matcher` 过滤匹配实体，响应实体进入/移除/每帧更新 |
| **Matcher** | 匹配器。支持 `allOf`/`anyOf`/`onlyOf`/`excludeOf` 组合规则 |

### 定义组件

```typescript
@ecs.register('MoveComp')
class MoveComp extends ecs.Comp {
    speed: number = 0;
    direction: Vec3 = new Vec3();
    reset() {
        this.speed = 0;
        this.direction.set(0, 0, 0);
    }
}

@ecs.register('HealthComp')
class HealthComp extends ecs.Comp {
    hp: number = 100;
    maxHp: number = 100;
    reset() { this.hp = this.maxHp = 100; }
}
```

### 定义实体

```typescript
// canNew=false 适用于 Cocos Creator 组件场景
@ecs.register('Player', false)
class Player extends ecs.Entity {
    move: MoveComp;     // 通过属性名直接访问组件
    health: HealthComp;
}
```

### 定义系统

```typescript
class MoveSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    init() {
        // allOf: 必须同时拥有 MoveComp 和 HealthComp
        this.setFilter(ecs.allOf(MoveComp, HealthComp));
    }
    update(entities: Player[]) {
        for (const e of entities) {
            e.move.direction.multiplyScalar(e.move.speed);
        }
    }
}

// 实体进入/移除系统时的回调
class SpawnSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem, ecs.IEntityRemoveSystem {
    init() { this.setFilter(ecs.allOf(MoveComp)); }
    entityEnter(entities: Player[]) { /* 新匹配的实体 */ }
    entityRemove(entities: Player[]) { /* 不再匹配的实体 */ }
}
```

### 使用

```typescript
// 创建实体（从对象池获取）
const player = ecs.getEntity(Player);
player.add(MoveComp);
player.add(HealthComp);
// 或批量添加
player.addComponents(MoveComp, HealthComp);

// 访问组件（通过属性名直接访问）
player.move.speed = 10;
player.health.hp -= 20;

// 移除组件
player.remove(MoveComp);              // 回收到池
player.remove(MoveComp, false);       // 保留缓存数据，重新 add 时不会 reset

// 销毁实体（回收到池）
player.destroy();

// 匹配器组合
ecs.allOf(MoveComp, HealthComp);                    // 必须拥有全部
ecs.anyOf(MoveComp, HealthComp);                    // 拥有任一
ecs.onlyOf(MoveComp);                               // 仅拥有此组件
ecs.allOf(MoveComp).excludeOf(HealthComp);           // 有 Move 但无 Health

// 动态查询
const movers = ecs.query(ecs.allOf(MoveComp));

// 单例组件（全局共享数据）
ecs.addSingleton(new GameState());
const state = ecs.getSingleton(GameState);

// 查询
ecs.activeEntityCount();
ecs.getEntityByEid(entityId);
```

---

## 网络模块

**多通道 WebSocket** 架构，支持 **心跳检测**、**断线重连**、**请求-响应匹配**、**请求去重**。通过 **策略模式** 支持 3 种协议：JSON、Protobuf、Pako（压缩）。

### 架构

| 类 | 职责 |
|----|------|
| `NetManager` | 单例管理器，维护多个 `NetNode` 通道 |
| `NetNode` | 网络节点，处理连接、收发、心跳、重连 |
| `WebSock` | WebSocket 封装，实现 `ISocket` 接口 |
| `NetProtocolJson` | JSON 协议处理器 |
| `NetProtocolProtobuf` | Protobuf 协议处理器 |
| `NetProtocolPako` | Pako 压缩协议处理器 |

### 特性

- **多通道**：多个 `NetNode` 实例通过 channelId 隔离
- **缓冲发送**：连接中/检查中的消息自动缓冲，连接建立后批量发送
- **请求去重**：`requestUnique()` 相同指令只保留一个请求
- **心跳**：默认 10s 间隔，超时 100s 未收到响应自动重连
- **自动重连**：可配置最大重试次数（-1 为无限重连）
- **服务器时间同步**：收到消息时自动同步到 `tyou.game`
- **网络提示**：`INetworkTips` 接口支持自定义 UI 提示（连接中/重连中/请求中）

### API

```typescript
// 初始化网络节点
const node = new NetNode();
node.init(
    new WebSock(),                    // Socket 实现
    new NetProtocolJson(),            // 协议（或 NetProtocolProtobuf / NetProtocolPako）
    new MyNetworkTips()               // 可选：网络提示 UI
);
NetManager.getInstance().setNetNode(node, "main");

// 连接
NetManager.getInstance().connect({ url: "ws://localhost:8080" }, "main");

// 发送原始数据
NetManager.getInstance().send(data, false, "main");

// 请求-响应模式
NetManager.getInstance().request(
    { c: "user", m: "login", data: { token: "xxx" } },
    { callback: (data) => { console.log("登录结果", data); } }
);

// 去重请求（相同 c+m 只保留一个）
NetManager.getInstance().requestUnique(reqProtocol, rspHandler);

// 监听服务器推送
node.setResponeHandler("chat.message", { callback: this.onChatMsg, target: this });

// 关闭
NetManager.getInstance().close(1000, "normal", "main");
```

---

## HTTP 模块

轻量级 HTTP 请求封装，支持 **GET/POST**、**请求去重**（同一 URL 不会重复发起）、**超时控制**、**arraybuffer 响应**。

### API

```typescript
// 配置
tyou.http.server = "https://api.example.com";
tyou.http.timeout = 15000; // 超时 15s

// 或通过 onInit
tyou.http.onInit("https://api.example.com", 15000);

// GET
tyou.http.get("/user/info", (data) => {
    console.log(data);
}, (err) => {
    console.error(err);
});

// GET 带参数（自动序列化为 query string）
tyou.http.getWithParams("/search", { keyword: "test", page: 1 }, (data) => { });

// GET 二进制数据
tyou.http.getByArraybuffer("/assets/config.bin", (buffer) => { });
tyou.http.getWithParamsByArraybuffer("/download", { id: 123 }, (buffer) => { });

// POST（自动 JSON 序列化）
tyou.http.post("/login", { username: "test", password: "123" }, (data) => { });

// 取消请求
tyou.http.abort("/user/info");
```

> 响应自动 JSON 解析。如果返回的 `data.code` 存在，会作为错误码处理。同一 URL+参数 的请求进行中时，重复调用会被忽略。

---

## 持久化存储模块

基于 `sys.localStorage` 的存储封装，支持 **XOR 加密**、**内存缓存**、**时间作用域存储**（按天/按周自动过期）。

### 基础 API

```typescript
tyou.storage.set("userId", 12345);
const id = tyou.storage.get("userId");
tyou.storage.remove("userId");
tyou.storage.clear();
```

### 扩展 API（StorageEx）

```typescript
const ex = tyou.storage.ex;

// 数值累加
ex.add("loginCount");        // +1
ex.add("gold", 100);         // +100

// 按天存储（跨天自动失效）
ex.setDay("dailyReward", { claimed: true });
const reward = ex.getDay("dailyReward"); // 隔天返回 null

// 按周存储（跨周自动失效）
ex.setWeek("weeklyTask", { progress: 3 });
const task = ex.getWeek("weeklyTask");

// 条件写入回调
ex.setDay("firstLogin", true, (oldValue) => {
    // 仅当 oldValue 不存在时才写入
});
```

### 加密配置

通过 `StorageEx.setting.secretKey` 设置 XOR 加密密钥，所有数据自动加密存储。

---

## 配置表模块（Luban）

使用 **Luban** 工具链生成二进制配置，运行时通过 `ByteBuf` 高性能反序列化。配置数据从 `config` Bundle 加载 `BufferAsset`。

### 工作流

1. 在 `Design/tools/Defines` 中定义 Excel 数据结构
2. 运行 `Design/tools/genBin.bat` 生成 TypeScript 类型代码 + 二进制数据文件
3. 二进制文件放入 `config` Bundle
4. `tyou.table.onCreate()` 自动加载并解析所有配置

### API

```typescript
// 获取配置表（onCreate 完成后可用）
const tables = tyou.table.getConfig();

// 查询单条
const itemConfig = tables.TbItem.get(1001);
console.log(itemConfig.name, itemConfig.price);

// 遍历
tables.TbItem.getDataList().forEach(item => {
    console.log(item.id, item.name);
});
```

---

## Update 回调管理模块

不需要继承 `Component` 也能获得每帧更新回调。适用于纯逻辑类需要帧驱动的场景，避免 Component 开销。

每个 target 只允许一个回调（重复注册自动替换）。遍历期间的移除操作会 **延迟执行**，确保迭代安全。每个回调独立 try/catch。

### API

```typescript
// 注册每帧回调
tyou.update.addUpdate(this, (dt: number) => {
    // dt 为帧间隔秒数
});

// 移除
tyou.update.removeUpdate(this);

// 查询
tyou.update.hasUpdate(this);
tyou.update.getUpdateCount();

// 清除所有
tyou.update.clearAll();
```

---

## GameWorld 模块（服务器时间）

挂载在 `GameRoot` 节点上的 `Component`，提供 **服务器时间同步**、**跨天检测**、**时间缩放**、**紧凑时间戳** 等能力。

内部以 `2025-01-01` 为纪元（`TIMESTAMP_EPOCH_2025`），存储时间戳更紧凑。每秒 `schedule` 驱动 `TIME_UPDATE_SECOND` 事件。

### API

```typescript
// 同步服务器时间（毫秒级时间戳）
tyou.game.setServerTime(serverTimestamp);

// 获取服务器时间（秒）
const now = tyou.game.getServerTime();

// 时间缩放
tyou.game.setTimeScale(2.0);
tyou.game.getTimeScale();

// 紧凑存储时间戳（相对 2025 纪元）
const ts = tyou.game.ts();
const realMs = tyou.game.ts2now(ts); // 还原为真实毫秒

// 配置每日重置边界
tyou.game.setDayBoundary(480, 5); // 东八区（UTC+8 = 480分钟），5点重置

// 跨天检测
tyou.game.checkIsSameDay(lastTs);     // 是否同一天
tyou.game.checkIsNewDay(lastLoginTs); // 是否跨天
```

---

## 日志模块（Logger）

全局日志管理器，通过 `globalThis.Log` 访问（无需 import）。支持 **分类日志**（6 种类型）、**颜色区分**、**位运算开关**、**调用栈追踪**、**计时工具**。微信小游戏环境下自动禁用（避免性能影响）。

### 日志类型

| 类型 | 位值 | 颜色 | 方法 |
|------|------|------|------|
| `Net` | 1 | 橙色 | `Log.net(msg, describe?)` |
| `Model` | 2 | 紫色 | `Log.model(msg, describe?)` |
| `Business` | 4 | 蓝色 | `Log.business(msg, describe?)` |
| `View` | 8 | 绿色 | `Log.view(msg, describe?)` |
| `Config` | 16 | 灰色 | `Log.config(msg, describe?)` |
| `Trace` | 32 | 默认 | `Log.info(...msg)` |

### API

```typescript
// 标准日志
Log.info("hello", "world");

// 分类日志（带颜色和调用栈）
Log.net(responseData, "服务器响应");
Log.model({ id: 1, name: "test" }, "玩家数据");
Log.business("任务完成");
Log.view("界面刷新");
Log.config(configObj, "配置加载");

// 错误日志（始终输出，不受开关控制）
Log.error("严重错误", errorObj);

// 表格输出
Log.table({ uid: 1000, name: "player" });

// 计时工具
Log.start("加载耗时");
// ... 执行代码 ...
Log.end("加载耗时");  // 输出耗时

// 控制日志开关（位运算组合）
Log.setTags(LogType.Net | LogType.Business); // 只显示网络和业务日志
Log.setTags(LogType.Net | LogType.Model | LogType.Business | LogType.View | LogType.Config | LogType.Trace); // 全部开启
```

> 日志输出格式：`[HH:MM:SS:ms][类型][文件名->方法名]:内容`。微信小游戏环境自动禁用所有分类日志，`Log.error()` 不受开关影响始终输出。

---

## 调试/性能监控模块（Debug）

运行时性能监控面板，通过 `tyou.debug` 访问。面板纯代码构建（不依赖预制体），挂载在 Canvas 最高层级（`setSiblingIndex(9999)`），不遮挡点击事件。

### 如何开启

```typescript
// 方式 1：代码中直接调用
tyou.debug.enable();

// 方式 2：切换开关（enable/disable 互切）
tyou.debug.toggle();

// 方式 3：在 Tyou.onCreate() 里默认开启（当前默认行为）
// 正式发布时删除或注释掉 this.debug.enable() 即可关闭

// 关闭
tyou.debug.disable();

// 查询当前状态
if (tyou.debug.isEnabled) { ... }
```

**推荐上线策略**：不要在正式包中调用 `enable()`。可通过以下方式实现「线上隐藏开关」：
- 连续点击版本号 N 次触发 `toggle()`
- URL 参数 `?debug=1` 启动时检测
- 后台下发开关字段
- 摇一摇 / 特定手势触发

**性能影响**：关闭时 `onUpdate()` 第一行 `if (!this._enabled) return;`，零采集零渲染。开启时每 0.5 秒刷新一次 Label 文本，对帧率影响可忽略（< 0.1ms/次）。

### 采集指标详解

| 指标 | 面板显示示例 | 含义 | 关注阈值 / 注意事项 |
|------|-------------|------|---------------------|
| **FPS** | `FPS: 58` | 过去 0.5 秒的平均帧率 | 低于 **30** 需排查性能瓶颈；微信小游戏目标 ≥ 50 |
| **MEM** | `MEM: 87MB / 512MB` | JS 堆已用 / 上限（`performance.memory`） | 持续增长不回落 = 内存泄漏；接近上限会触发 GC 卡顿。**仅 Chrome 系内核可用**，微信开发者工具可用，真机 iOS 不可用 |
| **Timer** | `Timer: 12` | `TimerModule` 中活跃计时器数量 | 数量只增不减 = 忘记 `removeTimer`，存在计时器泄漏 |
| **Event** | `Event: 8 types, 23 listeners` | 已注册事件类型数 / 监听器总数 | 监听器只增不减 = 忘记 `off()` 或 `targetOff()`，常见于 UI 关闭后未解绑 |
| **UI** | `UI: 3 windows (top: MessageBoxUI)` | 当前打开的窗口数 / 最顶层窗口名 | 窗口数异常多 = 窗口未正确关闭，叠加堆积 |
| **ECS** | `ECS: 156 entities` | ECS 系统中活跃实体数 | 持续增长 = 实体未 `destroy()`，对象池无法回收 |
| **Pool** | `Pool: 4 pools (avail: 25, active: 12)` | Node 池数量 / 池中可用节点数 / 正在使用的节点数 | `avail` 过高 = 预创建过多浪费内存；`active` 只增不减 = 节点未归还 |
| **Res Pending** | `Res Pending: 5` | 等待延迟释放的资源数量 | 通常在场景切换后短暂升高然后回落；**持续走高 = 资源引用计数异常，decRef 未正确调用** |
| **DrawCall** | `DrawCall: 42` | 当前渲染批次（通过引擎内部 pipeline.stats 获取） | 微信小游戏建议 **< 100**；过高需优化合批（图集合并、减少材质切换）。**部分平台/引擎版本不可用** |

### 常见排查场景

| 现象 | 观察指标 | 可能原因 |
|------|---------|---------|
| 长时间游玩后卡顿 | FPS 降低 + MEM 持续增长 | 内存泄漏（资源/节点未释放） |
| 场景切换后卡顿 | Res Pending 不回落 | `decRef` 未调用或 `addAutoReleaseAsset` 遗漏 |
| 打开多个弹窗后变慢 | UI 窗口数异常 | 窗口未 `close()`，hideTimeToClose 过长 |
| 战斗后期掉帧 | ECS 实体数只增不减 | 实体未 `destroy()`，死亡逻辑遗漏 |
| 事件回调越来越多 | Event listeners 只增 | UI/组件销毁时未 `off()` / `targetOff()` |
| 子弹等频繁对象卡顿 | Pool active 只增 | `releaseNode` 未调用，或 node 被 destroy 了（无法回池） |

### API

```typescript
tyou.debug.enable();    // 开启面板
tyou.debug.disable();   // 关闭面板（停止采集，零开销）
tyou.debug.toggle();    // 切换开关
tyou.debug.isEnabled;   // 查询状态（boolean）
```

### 技术细节

- **刷新频率**：每 0.5 秒刷新一次（非逐帧），FPS 取 0.5 秒窗口的平均值
- **面板构建**：纯代码创建 `Node` + `Label` + `UITransform` + `Widget`，不依赖任何预制体或资源
- **层级**：挂载在 Canvas 下，`setSiblingIndex(9999)` 保证在最上层，使用系统字体
- **容错**：每个指标采集独立 `try/catch`，单个模块异常不影响其他指标显示
- **生命周期**：`enable()` 创建面板节点，`disable()` 销毁面板节点，`onDestroy()` 自动清理

---

## 框架生命周期

所有模块由 `Tyou` 全局单例统一管理，生命周期如下：

### 初始化阶段

```
Tyou 构造函数 → 创建 res, event, timer, fsm, storage, http, ecs, update
    ↓
onLoad() → 创建 pool, audio, scene, ui, table; 挂载 GameWorld 组件
    ↓
onCreate() → 依次调用 pool, res, audio, scene, storage, ui 的 onCreate()
```

### 每帧更新顺序

```
onUpdate(dt) → timer → pool → fsm → ui → ecs → update → audio → res
```

> 更新顺序经过精心设计：计时器最先（驱动延迟回调）、资源最后（处理延迟释放）。

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
│   ├── asset-art/
│   │   └── psd/                       # PSD 设计稿目录
│   │       ├── *.psd                  # PSD 源文件
│   │       └── tool/
│   │           └── {psdName}/         # 每个 PSD 生成的 JSON 目录
│   ├── asset-raw/
│   │   └── ui-raw/atlas/{psdName}/    # PSD 导出的切图 PNG
│   ├── editor/                     # 编辑器配置
│   │   ├── ui-component-config.json   # UI 组件命名规范 + 前缀检查配置
│   │   ├── ui-template.txt            # UI 代码生成模板
│   │   └── asset-index-config.json    # 资源索引扫描配置
│   ├── scripts/                    # 业务逻辑代码
│   │   ├── Main.ts                    # 入口组件
│   │   └── logic/ui/
│   │       ├── UIName.ts              # UI名称枚举（自动生成）
│   │       ├── UIImportAll.ts         # UI副作用导入（自动生成）
│   │       ├── TestUI.ts              # 具体UI类（@UIDecorator）
│   │       └── ...
│   └── resources/                  # resources 目录
├── tools/
│   └── psd/
│       └── Psd2CCC-Digest.jsx    # PS 切图脚本（复制到 PS Scripts 目录使用）
├── extensions/
│   ├── psd2ccc/                   # PSD → Cocos 节点树生成插件
│   ├── uitscreate/                # UI 代码生成 + 前缀检查插件
│   └── assetool/                  # 资源索引生成插件
Design/
├── tools/
│   ├── genBin.bat                 # Luban 配置表生成脚本
│   ├── luban.conf                 # Luban 配置
│   └── Defines/                   # 数据结构定义
```

## License

MIT

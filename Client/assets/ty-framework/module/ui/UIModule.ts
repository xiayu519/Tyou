import {Camera, find, Node, Widget} from "cc";
import List from "../../core/collections/List";
import {GameEvent} from "../../core/GameEvent";
import {Module} from "../Module";
import {UIBlurBackground} from "./blur/UIBlurBackground";
import {TipManager} from "./TipManager";
import {UIRegistry} from "./UIRegistry";
import {UIWindow} from "./UIWindow";
import {IWindowAttribute, UILayer} from "./WindowAttribute";

/**
 * UI模块
 */
export class UIModule extends Module {
    private _uiRoot: Node | null = null;
    private _uiContent: Node | null = null;
    private _uiCamera: Camera = null;
    private _uiStack: List<UIWindow> = new List<UIWindow>();
    private _layerNodes: Map<number, Node> = new Map();
    private _blurBg: UIBlurBackground | null = null;
    private _blurBgTopKey: string = "";

    // 窗口实例映射（窗口名 -> UIWindow实例）
    private _windowInstances: Map<string, UIWindow> = new Map();

    private static readonly LAYER_DEEP: number = 2000;
    private static readonly WINDOW_DEEP: number = 100;

    /** 默认窗口配置 */
    private readonly _defaultWindowConfig: Omit<IWindowAttribute, 'name' | 'prefabPath'> = {
        layer: UILayer.UI,
        fullScreen: false,
        bgClose: false,
        hideTimeToClose: 0
    };

    /** 初始化 */
    public async onCreate() {

        // 初始化层级节点（如果需要在启动时创建）
        this._uiRoot = find("UICanvas");
        this._uiCamera = find("UICamera", this._uiRoot).getComponent(Camera);
        this.createUILayers();
        this._tipManager = new TipManager();
        await this._tipManager.onCreate();

        this._blurBg = new UIBlurBackground();
        this._blurBg.init(this._uiRoot);
        this._blurBg.setOnClick(() => {
            this.tryCloseTopWindowByBg();
        });
    }

    public get UICamera() {
        return this._uiCamera;
    }

    /** 获取层级节点 */
    public getLayerNode(layer: number): Node | null {
        return this._layerNodes.get(layer) || null;
    }

    /** 创建层级节点 */
    private createUILayers(): void {
        if (!this._uiRoot) {
            return;
        }

        let uiContent = find("UIContent", this._uiRoot) as Node;
        if (!uiContent || !uiContent.isValid) {
            uiContent = new Node("UIContent");
            this._uiRoot.addChild(uiContent);
            const widget = uiContent.addComponent(Widget);
            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            widget.isAlignTop = true;
            widget.isAlignBottom = true;
            widget.left = 0;
            widget.right = 0;
            widget.top = 0;
            widget.bottom = 0;
        }
        this._uiContent = uiContent;

        this._layerNodes.clear();
        for (const layerName in UILayer) {
            if (isNaN(Number(layerName))) {
                const layerValue = UILayer[layerName as keyof typeof UILayer];
                this._layerNodes.set(layerValue, uiContent);
            }
        }
    }

    /** 释放资源 */
    public release(): void {
        this.closeAll(true);
        // 移除常驻节点等操作
    }

    /**
     * 解析窗口名称，返回 [窗口名, 构造函数]
     */
    private resolveWindowRef(wnd: string): [string, new () => UIWindow] | null {
        const ctor = UIRegistry.get(wnd) as (new () => UIWindow) | undefined;
        if (!ctor) {
            console.error(`[UIModule] UI "${wnd}" not found in UIRegistry. Did you forget @UIDecorator({ name: "${wnd}" })?`);
            return null;
        }
        return [wnd, ctor];
    }

    /** 显示UI窗口（异步） */
    public async showUIAsync(wnd: string, ...args: any[]): Promise<UIWindow | null> {
        const resolved = this.resolveWindowRef(wnd);
        console.log(`[UIModule] showUIAsync called with wnd=${wnd}, resolved=${resolved ? resolved[0] : 'null'}`);
        if (!resolved) return null;
        const [type, wndClass] = resolved;

        // 检查是否已存在
        let window = this._windowInstances.get(type);
        if (window) {
            // 如果窗口已存在，移动到栈顶并刷新
            this.popWindow(window);
            this.pushWindow(window);
            window.tryInvoke(this.onWindowPrepare.bind(this), ...args);
            return window;
        }

        window = new wndClass();
        const windowName = type;
        window.init(
            windowName,
            window.customAttribute.layer,
            window.customAttribute.fullScreen,
            window.customAttribute.bgClose,
            window.customAttribute.path,
            window.customAttribute.hideTimeToClose,
        );
        this.pushWindow(window);
        this._windowInstances.set(type, window);
        await window.baseLoad(windowName, this.onWindowPrepare.bind(this), ...args);
        return window;
    }

    /** 关闭窗口 */
    public closeWindow(wnd: string): void {
        const window = this._windowInstances.get(wnd);
        if (window) {
            window.baseDestroy();
            this.popWindow(window);
            this._windowInstances.delete(wnd);
            this.onSortWindowDepth(window.windowLayer);
            this.onSetWindowVisible();
            this.refreshBlurBg().then();
        }
    }

    /** 隐藏窗口 */
    public hideWindow(wnd: string): void {
        const window = this._windowInstances.get(wnd);
        if (!window) return;

        if (window.hideTimeToClose <= 0) {
            this.closeWindow(wnd);
            return;
        }

        window.cancelHideToCloseTimer();
        window.visible = false;
        window.isHide = true;

        // 设置隐藏计时器
        window.hideTimerId = tyou.timer.addTimer(() => {
            this.closeWindow(wnd);
        }, window.hideTimeToClose);

        if (window.fullScreen) {
            this.onSetWindowVisible();
        }
        this.refreshBlurBg().then();
    }

    /** 关闭所有窗口 */
    public closeAll(isShutdown: boolean = false): void {
        this._uiStack.forEach(window => {
            window.baseDestroy(isShutdown);
            this._windowInstances.delete(window.windowName);
        });
        this._uiStack.clear();
        this.refreshBlurBg().then();
    }

    /** 获取窗口实例 */
    public getWindow(wnd: string): UIWindow | null {
        return this._windowInstances.get(wnd) || null;
    }

    /** 检查窗口是否存在 */
    public hasWindow(wnd: string): boolean {
        return this._windowInstances.has(wnd);
    }

    /** 获取最顶层窗口 */
    public getTopWindow(layer?: number): string {
        if (this._uiStack.isEmpty()) {
            return '';
        }

        // 使用forEachReverse从后往前查找
        let topWindow: UIWindow | null = null;
        this._uiStack.forEachReverse((window) => {
            if (layer !== undefined) {
                if (window.windowLayer === layer && !window.isHide) {
                    topWindow = window;
                    return false; // 停止遍历
                }
            } else {
                if (!window.isHide) {
                    topWindow = window;
                    return false; // 停止遍历
                }
            }
        });

        return topWindow ? topWindow.windowName : '';
    }

    /** 是否有任意窗口正在加载 */
    public isAnyLoading(): boolean {
        let isLoading = false;
        this._uiStack.forEach((window) => {
            if (!window.isLoadDone) {
                isLoading = true;
                return false; // 停止遍历
            }
        });
        return isLoading;
    }

    /** 更新方法 */
    public onUpdate(dt: number): void {
        this._tipManager?.onUpdate(dt);
        if (this._uiStack.isEmpty()) {
            return;
        }

        this._uiStack.forEachReverse((window) => {
            if (!window.baseUpdate()) {
                //this._uiStack.remove(window);
            }
        });
    }

    /** 弹出窗口 */
    private popWindow(window: UIWindow): void {
        this._uiStack.remove(window);
    }

    /** 压入窗口 */
    private pushWindow(window: UIWindow): void {
        // 检查是否已存在
        if (this._uiStack.contains(window)) {
            console.error(`Window ${window.windowName} is already exist.`);
            return;
        }

        // 找到插入位置（按层级排序）
        let insertIndex = -1;
        for (let i = 0; i < this._uiStack.size(); i++) {
            const currentWindow = this._uiStack.index(i);
            if (window.windowLayer === currentWindow.windowLayer) {
                insertIndex = i + 1;
            }
        }

        // 如果没有找到同层级的，找到相邻层级
        if (insertIndex === -1) {
            for (let i = 0; i < this._uiStack.size(); i++) {
                const currentWindow = this._uiStack.index(i);
                if (window.windowLayer > currentWindow.windowLayer) {
                    insertIndex = i + 1;
                }
            }
        }

        // 如果为空栈或没有找到插入位置
        if (insertIndex === -1) {
            insertIndex = 0;
        }

        // 使用List的insert方法

        this._uiStack.insert(window, insertIndex);
    }

    /** 窗口准备回调 */
    private onWindowPrepare(window: UIWindow): void {
        this.onSortWindowDepth(window.windowLayer);
        window.baseCreate();
        window.baseRefresh();
        this.onSetWindowVisible();
        this.refreshBlurBg().then();
    }

    /** 排序窗口深度 */
    private onSortWindowDepth(layer: number): void {
        let depth = layer * UIModule.LAYER_DEEP;
        this._uiStack.forEach((window) => {
            if (window.windowLayer === layer) {
                window.depth = depth;
                depth += UIModule.WINDOW_DEEP;
            }
        });
        this._syncWindowSiblingIndex();
    }

    /** 设置窗口可见性 */
    private onSetWindowVisible(): void {
        let isHideNext = false;

        // 使用forEachReverse从后往前遍历
        this._uiStack.forEachReverse((window) => {
            if (!isHideNext) {
                if (window.isHide) {
                    return; // 继续遍历
                }
                window.visible = true;
                if (window.isPrepare && window.fullScreen) {
                    isHideNext = true;
                }
            } else {
                window.visible = false;
            }
        });
    }

    onDestroy() {
        // 清理资源
        this.closeAll(true);
        this._tipManager.onDestroy();
        this._blurBg?.destroy();
        this._blurBg = null;
    }

    private _tipManager: TipManager;

    tip(msg: string) {
        this._tipManager.showTip(msg);
    }

    message(params?) {
        const _params = params || {title: "提示", content: "是否确定"};
        this.showUIAsync("MessageBoxUI", 0 /* MessageBoxType.One */, _params)
    }

    select(params?) {
        const _params = params || {title: "提示", content: "是否确定"};
        this.showUIAsync("MessageBoxUI", 1 /* MessageBoxType.Two */, _params)
    }

    private getTopNonFullScreenWindowInstance(): UIWindow | null {
        if (this._uiStack.isEmpty()) {
            return null;
        }
        let top: UIWindow | null = null;
        this._uiStack.forEachReverse((w) => {
            if (w && !w.isHide && w.isPrepare && !w.fullScreen && w.node && w.node.isValid) {
                top = w;
                return false;
            }
        });
        return top;
    }

    private async refreshBlurBg(): Promise<void> {
        if (!this._blurBg) {
            return;
        }
        const top = this.getTopNonFullScreenWindowInstance();
        if (!top) {
            this._blurBg.hide();
            this._blurBgTopKey = "";
            return;
        }
        const key = `${top.windowLayer}_${top.windowName}`;
        if (key !== this._blurBgTopKey) {
            this._blurBgTopKey = key;
            await this._blurBg.showBehindWindow(top);
        } else {
            await this._blurBg.showBehindWindow(top);
        }
    }

    private _syncWindowSiblingIndex(): void {
        if (!this._uiContent || !this._uiContent.isValid) {
            return;
        }
        let idx = 0;
        this._uiStack.forEach((w) => {
            if (!w || !w.node || !w.node.isValid) {
                return;
            }
            if (w.node.parent !== this._uiContent) {
                w.node.setParent(this._uiContent);
            }
            if (w.node.getSiblingIndex() !== idx) {
                w.node.setSiblingIndex(idx);
            }
            idx++;
        });
    }

    private tryCloseTopWindowByBg(): void {
        const top = this.getTopNonFullScreenWindowInstance();
        if (!top || !top.node || !top.node.isValid) {
            return;
        }
        if (!top.bgClose) {
            //允许弹窗做一些个性化定义关闭逻辑
            tyou.event.emit(GameEvent.POP_BG_CLICK, top.windowName)
            return;
        }
        top.close();
    }


}

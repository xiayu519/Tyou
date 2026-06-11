import {ISocket, MessageFunc, NetData, SocketFunc} from "./NetInterface";

interface IPlatformSocketAdapter {
    name: string;
    api: any;
}

/**
 * WebSocket 封装
 * 1. 连接/断开相关接口
 * 2. 网络异常回调
 * 3. 数据发送与接收
 */
export class WebSock implements ISocket {
    private _socket: any = null;
    private _isPlatformSocket: boolean = false;
    private _isOpen: boolean = false;
    private _connectVersion: number = 0;
    private readonly _platformNames: string[] = ["wx", "tt", "qq", "my", "swan", "qg", "ks", "jd", "hbs"];

    /** 网络连接成功事件 */
    onConnected: SocketFunc | null = null;
    /** 接受到网络数据事件 */
    onMessage: MessageFunc | null = null;
    /** 网络错误事件 */
    onError: SocketFunc | null = null;
    /** 网络断开事件 */
    onClosed: SocketFunc | null = null;

    /** 请求连接 */
    connect(options: any) {
        if (this.isConnectingOrOpen()) {
            Log.net("websocket connecting or open, wait for a moment...");
            return false;
        }

        const url = this.getUrl(options);
        if (!url) {
            console.error("[WebSock] connect url is empty");
            return false;
        }

        const adapter = this.getPlatformSocketAdapter();
        if (adapter) {
            return this.connectPlatform(adapter, url, options);
        }

        if (typeof WebSocket !== "undefined") {
            return this.connectBrowser(url, options);
        }

        console.error("[WebSock] No WebSocket adapter available");
        return false;
    }

    /**
     * 发送数据
     * @param buffer 网络数据
     */
    send(buffer: NetData): number {
        if (!this._socket) {
            return -1;
        }

        if (this._isPlatformSocket) {
            if (!this._isOpen || typeof this._socket.send !== "function") {
                return -1;
            }
            try {
                this._socket.send({data: buffer});
                return 1;
            } catch (e) {
                console.warn("[WebSock] platform socket send failed", e);
                return -1;
            }
        }

        if (this._socket.readyState === WebSocket.OPEN) {
            this._socket.send(buffer);
            return 1;
        }
        return -1;
    }

    /**
     * 网络断开
     * @param code      关闭码
     * @param reason    关闭原因
     */
    close(code?: number, reason?: string) {
        const socket = this._socket;
        if (!socket) {
            this.cleanupSocket(socket);
            return;
        }

        this._connectVersion++;
        const isPlatformSocket = this._isPlatformSocket;
        this.cleanupSocket(socket);

        try {
            if (isPlatformSocket && typeof socket.close === "function") {
                socket.close({code, reason});
            } else if (typeof socket.close === "function") {
                socket.close(code, reason);
            }
        } catch (e) {
            console.warn("[WebSock] socket close failed", e);
        }
    }

    private connectPlatform(adapter: IPlatformSocketAdapter, url: string, options: any): boolean {
        const version = ++this._connectVersion;
        try {
            const socket = adapter.api.connectSocket({
                url,
                protocols: options?.protocols,
                header: options?.header,
                tcpNoDelay: options?.tcpNoDelay
            });

            if (!socket) {
                console.error(`[WebSock] ${adapter.name}.connectSocket returned null`);
                return false;
            }

            this._socket = socket;
            this._isPlatformSocket = true;
            this._isOpen = false;

            this.bindPlatformEvent(socket, adapter.api, "onOpen", "onSocketOpen", (event: any) => {
                if (version !== this._connectVersion) return;
                this._isOpen = true;
                this.onConnected?.(event);
            });
            this.bindPlatformEvent(socket, adapter.api, "onMessage", "onSocketMessage", (event: any) => {
                if (version !== this._connectVersion) return;
                this.onMessage?.(event?.data);
            });
            this.bindPlatformEvent(socket, adapter.api, "onError", "onSocketError", (event: any) => {
                if (version !== this._connectVersion) return;
                this.onError?.(event);
            });
            this.bindPlatformEvent(socket, adapter.api, "onClose", "onSocketClose", (event: any) => {
                if (version !== this._connectVersion) return;
                this._isOpen = false;
                this.onClosed?.(event);
                this.cleanupSocket(socket);
            });

            return true;
        } catch (e) {
            console.error("[WebSock] connect platform socket failed", e);
            this.cleanupSocket(this._socket);
            return false;
        }
    }

    private connectBrowser(url: string, options: any): boolean {
        const version = ++this._connectVersion;
        try {
            const socket = new WebSocket(url);
            if (options?.binaryType) {
                socket.binaryType = options.binaryType;
            }

            this._socket = socket;
            this._isPlatformSocket = false;
            this._isOpen = false;

            socket.onopen = (event) => {
                if (version !== this._connectVersion) return;
                this._isOpen = true;
                this.onConnected?.(event);
            };
            socket.onmessage = (event) => {
                if (version !== this._connectVersion) return;
                this.onMessage?.(event.data);
            };
            socket.onerror = (event) => {
                if (version !== this._connectVersion) return;
                this.onError?.(event);
            };
            socket.onclose = (event) => {
                if (version !== this._connectVersion) return;
                this._isOpen = false;
                this.onClosed?.(event);
                this.cleanupSocket(socket);
            };
            return true;
        } catch (e) {
            console.error("[WebSock] connect browser socket failed", e);
            this.cleanupSocket(this._socket);
            return false;
        }
    }

    private getUrl(options: any): string {
        if (options?.url) {
            return options.url;
        }

        const ip = options?.ip;
        const port = options?.port;
        const protocol = options?.protocol || "ws";
        if (!ip || !port) {
            return "";
        }
        return `${protocol}://${ip}:${port}`;
    }

    private getPlatformSocketAdapter(): IPlatformSocketAdapter | null {
        const root = globalThis as any;
        for (const name of this._platformNames) {
            const api = root[name];
            if (api && typeof api.connectSocket === "function") {
                return {name, api};
            }
        }
        return null;
    }

    private bindPlatformEvent(socket: any,
                              api: any,
                              taskEventName: string,
                              globalEventName: string,
                              handler: (event: any) => void): void {
        if (socket && typeof socket[taskEventName] === "function") {
            socket[taskEventName](handler);
            return;
        }
        if (api && typeof api[globalEventName] === "function") {
            api[globalEventName](handler);
        }
    }

    private cleanupSocket(socket: any): void {
        if (socket && !this._isPlatformSocket) {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onerror = null;
            socket.onclose = null;
        } else if (socket) {
            this.unbindPlatformEvent(socket, "offOpen");
            this.unbindPlatformEvent(socket, "offMessage");
            this.unbindPlatformEvent(socket, "offError");
            this.unbindPlatformEvent(socket, "offClose");
        }

        if (this._socket === socket || !socket) {
            this._socket = null;
            this._isOpen = false;
            this._isPlatformSocket = false;
        }
    }

    private unbindPlatformEvent(socket: any, eventName: string): void {
        try {
            if (socket && typeof socket[eventName] === "function") {
                socket[eventName]();
            }
        } catch (e) {
            console.warn(`[WebSock] ${eventName} failed`, e);
        }
    }

    private isConnectingOrOpen(): boolean {
        if (!this._socket) {
            return false;
        }

        if (this._isPlatformSocket) {
            return true;
        }

        return this._socket.readyState === WebSocket.CONNECTING || this._socket.readyState === WebSocket.OPEN;
    }
}

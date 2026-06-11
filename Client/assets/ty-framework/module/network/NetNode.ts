import { error, warn } from "cc";
import { CallbackObject, INetworkTips, IProtocolHelper, IRequestProtocol, ISocket, NetCallFunc, NetData, RequestObject } from "./NetInterface";

/*
*   CocosCreator网络节点基类，以及网络相关接口定义
*   1. 网络连接、断开、请求发送、数据接收等基础功能
*   2. 心跳机制
*   3. 断线重连 + 请求重发
*   4. 调用网络屏蔽层
*/

type ExecuterFunc = (callback: CallbackObject, buffer: NetData) => void;
type CheckFunc = (checkedFunc: VoidFunc) => void;
type VoidFunc = () => void;
type BoolFunc = () => boolean;

var NetNodeStateStrs = ["已关闭", "连接中", "验证中", "可传输数据"];

/** 网络提示类型枚举 */
export enum NetTipsType {
    Connecting,
    ReConnecting,
    Requesting,
}

/** 网络状态枚举 */
export enum NetNodeState {
    Closed,                     // 已关闭
    Connecting,                 // 连接中
    Checking,                   // 验证中
    Working,                    // 可传输数据
}

/** 网络连接参数 */
export interface NetConnectOptions {
    host?: string,              // 地址
    port?: number,              // 端口
    url?: string,               // url，与地址+端口二选一
    autoReconnect?: number,     // -1 永久重连，0不自动重连，其他正整数为自动重试次数
}

/** 网络节点 */
export class NetNode {
    protected _connectOptions: NetConnectOptions | null = null;
    protected _autoReconnect: number = 0;
    protected _isSocketInit: boolean = false;                               // Socket是否初始化过
    protected _isSocketOpen: boolean = false;                               // Socket是否连接成功过
    protected _state: NetNodeState = NetNodeState.Closed;                   // 节点当前状态
    protected _socket: ISocket | null = null;                               // Socket对象（可能是原生socket、websocket、wx.socket...)

    protected _networkTips: INetworkTips | null = null;                     // 网络提示ui对象（请求提示、断线重连提示等）
    protected _protocolHelper: IProtocolHelper | null = null;               // 包解析对象
    protected _connectedCallback: CheckFunc | null = null;                  // 连接完成回调
    protected _disconnectCallback: BoolFunc | null = null;                  // 断线回调
    protected _callbackExecuter: ExecuterFunc | null = null;                // 回调执行

    protected _keepAliveTimer: number = 0;                                  // 心跳定时器
    protected _receiveMsgTimer: number = 0;                                 // 接收数据定时器
    protected _reconnectTimer: number = 0;                                  // 重连定时器
    protected _heartTime: number = 10000;                                   // 心跳间隔
    protected _receiveTime: number = 100000;                               // 多久没收到数据断开
    protected _reconnetTimeOut: number = 5000;                           // 重连间隔
    protected _requests: RequestObject[] = Array<RequestObject>();          // 请求列表
    protected _listener: { [key: string]: CallbackObject[] | null } = {}    // 监听者列表
    protected _isClosedByUser: boolean = false;

    /********************** 网络相关处理 *********************/
    init(socket: ISocket, protocol: IProtocolHelper, networkTips: INetworkTips | null = null, execFunc: ExecuterFunc | null = null, checkFunc: CheckFunc | null = null) {
        Log.net(`网络初始化`);
        this._socket = socket;
        this._protocolHelper = protocol;
        this._networkTips = networkTips;
        this._callbackExecuter = execFunc ? execFunc : (callback: CallbackObject, buffer: NetData) => {
            callback.callback.call(callback.target, buffer);
        }
    }

    /**
     * 请求连接服务器
     * @param options 连接参数
     */
    connect(options: NetConnectOptions): boolean {
        if (this._socket && this._state == NetNodeState.Closed) {
            if (!this._isSocketInit) {
                this.initSocket();
            }
            this._isClosedByUser = false;
            this._state = NetNodeState.Connecting;
            if (!this._socket.connect(options)) {
                this._state = NetNodeState.Closed;
                this.updateNetTips(NetTipsType.Connecting, false);
                return false;
            }
            if (typeof options.autoReconnect == "number") {
                this._autoReconnect = options.autoReconnect;
            }
            this._connectOptions = options;
            this.updateNetTips(NetTipsType.Connecting, true);
            return true;
        }
        return false;
    }

    protected initSocket() {
        if (this._socket) {
            this._socket.onConnected = (event) => { this.onConnected(event) };
            this._socket.onMessage = (msg) => { this.onMessage(msg) };
            this._socket.onError = (event) => { this.onError(event) };
            this._socket.onClosed = (event) => { this.onClosed(event) };
            this._isSocketInit = true;
        }
    }

    protected updateNetTips(tipsType: NetTipsType, isShow: boolean) {
        if (this._networkTips) {
            if (tipsType == NetTipsType.Requesting) {
                this._networkTips.requestTips(isShow);
            }
            else if (tipsType == NetTipsType.Connecting) {
                this._networkTips.connectTips(isShow);
            }
            else if (tipsType == NetTipsType.ReConnecting) {
                this._networkTips.reconnectTips(isShow);
            }
        }
    }

    /** 网络连接成功 */
    protected onConnected(event: any) {
        if (this._isClosedByUser) {
            return;
        }

        Log.net("网络已连接")
        this._isSocketOpen = true;
        // 如果设置了鉴权回调，在连接完成后进入鉴权阶段，等待鉴权结束
        if (this._connectedCallback !== null) {
            this._state = NetNodeState.Checking;
            this._connectedCallback(() => { this.onChecked();});
        }
        else {
            this.onChecked();
        }
        Log.net(`网络已连接当前状态为【${NetNodeStateStrs[this._state]}】`);
    }

    /** 连接验证成功，进入工作状态 */
    protected onChecked() {
        Log.net("连接验证成功，进入工作状态");
        this._state = NetNodeState.Working;
        // 关闭连接或重连中的状态显示
        this.updateNetTips(NetTipsType.Connecting, false);
        this.updateNetTips(NetTipsType.ReConnecting, false);

        // 重发待发送信息
        var requests = this._requests.concat();
        if (requests.length > 0) {
            Log.net(`请求【${this._requests.length}】个待发送的信息`);

            for (var i = 0; i < requests.length;) {
                let req = requests[i];
                this._socket!.send(req.buffer);
                if (req.rspObject == null || req.rspCmd != "") {
                    requests.splice(i, 1);
                }
                else {
                    ++i;
                }
            }
            // 如果还有等待返回的请求，启动网络请求层
            this.updateNetTips(NetTipsType.Requesting, this._requests.length > 0);
        }
    }

    /** 接收到一个完整的消息包 */
    protected onMessage(msg: any): void {
        if (this._state === NetNodeState.Closed || this._isClosedByUser) {
            return;
        }

        // Log.net(`接受消息状态为【${NetNodeStateStrs[this._state]}】`);

        var callback = (json: any)=>{
            // 进行头部的校验（实际包长与头部长度是否匹配）
            if (!this._protocolHelper!.checkResponsePackage(json)) {
                console.error(`校验接受消息数据异常`);
                return;
            }

            // 处理相应包数据
            if (!this._protocolHelper!.handlerResponsePackage(json)) {
                if (this._networkTips){
                    this._networkTips.responseErrorCode(json.data.errmsg);
                }
            }
            
            tyou.game.setServerTime(json.data.curtime);

            // 接受到数据，重新定时收数据计时器
            this.resetReceiveMsgTimer();
            // 重置心跳包发送器
            this.resetHearbeatTimer();
            // 触发消息执行
            let rspCmd = this._protocolHelper!.getPackageId(json);

            Log.net(`接受到命令【${rspCmd}】的消息`);
            Log.net(json);
            // 优先触发request队列
            if (this._requests.length > 0) {
                for (let reqIdx in this._requests) {
                    let req = this._requests[reqIdx];
                    if (req.rspCmd == rspCmd && req.rspObject) {
                        if(!json.data.errmsg){
                            Log.net(`触发请求命令【${rspCmd}】的回调`);
                            this._callbackExecuter!(req.rspObject, json.data);
                        }
                        this._requests.splice(parseInt(reqIdx), 1);
                        break;
                    }
                }

                if (this._requests.length == 0) {
                    this.updateNetTips(NetTipsType.Requesting, false);
                }
                else {
                    Log.net(`请求队列中还有【${this._requests.length}】个请求在等待`);
                }
            }

            let listeners = this._listener[rspCmd];
            if (null != listeners) {
                for (const rsp of listeners) {
                    Log.net(`触发监听命令【${rspCmd}】的回调`);
                    this._callbackExecuter!(rsp, json.data);
                }
            }
        }
        try {
            callback(this.decodePacket(msg));
        } catch (e) {
            error("[NetNode] parse socket message failed", e);
        }
    }

    protected onError(event: any) {
        if (this._state === NetNodeState.Closed && this._isClosedByUser) {
            return;
        }
        error(event);
    }

    protected onClosed(event: any) {
        console.warn("socket onClosed");
        this.clearTimer();
        this._isSocketOpen = false;

        if (this._state === NetNodeState.Closed && this._isClosedByUser) {
            return;
        }

        // 执行断线回调，返回false表示不进行重连
        if (this._disconnectCallback && !this._disconnectCallback()) {
            Log.net(`断开连接`);
            this._state = NetNodeState.Closed;
            return;
        }

        // 自动重连
        if (!this._isClosedByUser && this.isAutoReconnect()) {
            this.updateNetTips(NetTipsType.ReConnecting, true);
            this._reconnectTimer = this.addNetworkTimer(() => {
                if (this._isClosedByUser || this._state === NetNodeState.Working) {
                    return;
                }
                this._socket!.close();
                this._state = NetNodeState.Closed;
                //断线重连清空缓存区
                this._requests = [];
                this.connect(this._connectOptions!);
                if (this._autoReconnect > 0) {
                    this._autoReconnect -= 1;
                }
            }, this._reconnetTimeOut);
        }
        else {
            this._state = NetNodeState.Closed;
        }
    }

    /**
     * 断开网络
     * @param code      关闭码
     * @param reason    关闭原因
     */
    close(code?: number, reason?: string) {
        this._isClosedByUser = true;
        this._autoReconnect = 0;
        this._state = NetNodeState.Closed;
        this._isSocketOpen = false;
        this.clearTimer();
        this._listener = {};
        this._requests.length = 0;
        if (this._networkTips) {
            this._networkTips.connectTips(false);
            this._networkTips.reconnectTips(false);
            this._networkTips.requestTips(false);
        }
        if (this._socket) {
            this._socket.close(code, reason);
        }
    }

    /**
     * 只是关闭Socket套接字（仍然重用缓存与当前状态）
     * @param code      关闭码
     * @param reason    关闭原因
     */
    closeSocket(code?: number, reason?: string) {
        if (this._socket) {
            this._socket.close(code, reason);
        }
    }

    /**
     * 发起请求，如果当前处于重连中，进入缓存列表等待重连完成后发送
     * @param buf       网络数据
     * @param force     是否强制发送
     */
    send(buf: NetData, force: boolean = false): number {
        if (this._state == NetNodeState.Working || force) {
            return this._socket!.send(buf);
        }
        else if (this._state == NetNodeState.Checking ||
            this._state == NetNodeState.Connecting) {
            this._requests.push({
                buffer: buf,
                rspCmd: "",
                rspObject: null
            });
            Log.net(`当前状态为【${NetNodeStateStrs[this._state]}】,繁忙并缓冲发送数据`);
            return 0;
        }
        else {
            error(`当前状态为【${NetNodeStateStrs[this._state]}】,请求错误`);
            return -1;
        }
    }

    /**
     * 发起请求，并进入缓存列表
     * @param reqProtocol 请求协议
     * @param rspObject   回调对象
     * @param showTips    是否触发请求提示
     * @param force       是否强制发送
     * @param channelId   通道编号
     */
    request(reqProtocol: IRequestProtocol, rspObject: CallbackObject, showTips: boolean = true, force: boolean = false) {
        var rspCmd = this._protocolHelper!.handlerRequestPackage(reqProtocol);
        this.base_request(reqProtocol, rspCmd, rspObject, showTips, force);
    }

    /**
     * 唯一request，确保没有同一响应的请求（避免一个请求重复发送，netTips界面的屏蔽也是一个好的方法）
     * @param reqProtocol 请求协议
     * @param rspObject   回调对象
     * @param showTips    是否触发请求提示
     * @param force       是否强制发送
     * @param channelId   通道编号
     */
    requestUnique(reqProtocol: IRequestProtocol, rspObject: CallbackObject, showTips: boolean = true, force: boolean = false): boolean {
        var rspCmd = this._protocolHelper!.handlerRequestPackage(reqProtocol);

        for (let i = 0; i < this._requests.length; ++i) {
            if (this._requests[i].rspCmd == rspCmd) {
                Log.net(`命令【${rspCmd}】重复请求`);
                return false;
            }
        }

        this.base_request(reqProtocol, rspCmd, rspObject, showTips, force);
        return true;
    }

    private base_request(reqProtocol: IRequestProtocol, rspCmd: string, rspObject: CallbackObject, showTips: boolean = true, force: boolean = false) {
        var buf = JSON.stringify(reqProtocol);

        if (this._state == NetNodeState.Working || force) {
            this._socket!.send(buf);
        }

        Log.net(`队列命令为【${rspCmd}】的请求，等待请求数据的回调`);
        Log.net(buf, "发送的数据");

        // 进入发送缓存列表
        this._requests.push({
            buffer: buf, rspCmd, rspObject
        });
        // 启动网络请求层
        if (showTips) {
            this.updateNetTips(NetTipsType.Requesting, true);
        }
    }

    /********************** 回调相关处理 *********************/
    /**
     * 设置一个唯一的服务器推送监听
     * @param cmd       命令字串
     * @param callback  回调方法
     * @param target    目标对象
     */
    setResponeHandler(cmd: string, callback: NetCallFunc, target?: any): boolean {
        if (callback == null) {
            error(`命令为【${cmd}】设置响应处理程序错误`);
            return false;
        }
        this._listener[cmd] = [{ target, callback }];
        return true;
    }

    /**
     * 可添加多个同类返回消息的监听
     * @param cmd       命令字串
     * @param callback  回调方法
     * @param target    目标对象
     * @returns 
     */
    addResponeHandler(cmd: string, callback: NetCallFunc, target?: any): boolean {
        if (callback == null) {
            error(`命令为【${cmd}】添加响应处理程序错误`);
            return false;
        }
        let rspObject = { target, callback };
        if (null == this._listener[cmd]) {
            this._listener[cmd] = [rspObject];
        }
        else {
            let index = this.getNetListenersIndex(cmd, rspObject);
            if (-1 == index) {
                this._listener[cmd]!.push(rspObject);
            }
        }
        return true;
    }

    /**
     * 删除一个监听中指定子回调
     * @param cmd       命令字串
     * @param callback  回调方法
     * @param target    目标对象
     */
    removeResponeHandler(cmd: string, callback: NetCallFunc, target?: any) {
        if (null != this._listener[cmd] && callback != null) {
            let index = this.getNetListenersIndex(cmd, { target, callback });
            if (-1 != index) {
                this._listener[cmd]!.splice(index, 1);
            }
        }
    }

    /**
     * 清除所有监听或指定命令的监听
     * @param cmd  命令字串（默认不填为清除所有）
     */
    cleanListeners(cmd: string = "") {
        if (cmd == "") {
            this._listener = {}
        }
        else {
            delete this._listener[cmd];
        }
    }

    protected getNetListenersIndex(cmd: string, rspObject: CallbackObject): number {
        let index = -1;
        for (let i = 0; i < this._listener[cmd]!.length; i++) {
            let iterator = this._listener[cmd]![i];
            if (iterator.callback == rspObject.callback
                && iterator.target == rspObject.target) {
                index = i;
                break;
            }
        }
        return index;
    }

    /********************** 心跳、超时相关处理 *********************/
    protected resetReceiveMsgTimer() {
        this.removeNetworkTimer(this._receiveMsgTimer);

        this._receiveMsgTimer = this.addNetworkTimer(() => {
            if (this._state === NetNodeState.Closed || this._isClosedByUser) {
                return;
            }
            warn("接收消息定时器关闭网络连接");
            this._socket!.close();
        }, this._receiveTime);
    }

    protected resetHearbeatTimer() {
        this.removeNetworkTimer(this._keepAliveTimer);

        this._keepAliveTimer = this.addNetworkTimer(() => {
            if (this._state !== NetNodeState.Working || this._isClosedByUser) {
                return;
            }
            Log.net("网络节点保持活跃发送心跳信息");
            this.send(this._protocolHelper!.getHearbeat());
        }, this._heartTime);
    }

    protected clearTimer() {
        this.removeNetworkTimer(this._receiveMsgTimer);
        this.removeNetworkTimer(this._keepAliveTimer);
        this.removeNetworkTimer(this._reconnectTimer);
        this._receiveMsgTimer = 0;
        this._keepAliveTimer = 0;
        this._reconnectTimer = 0;
    }

    /** 是否自动重连接 */
    isAutoReconnect() {
        return this._autoReconnect != 0;
    }

    /** 拒绝重新连接 */
    rejectReconnect() {
        this._autoReconnect = 0;
        this.clearTimer();
    }

    private addNetworkTimer(callback: () => void, milliseconds: number): number {
        return tyou.timer.addTimer(callback, Math.max(0, milliseconds) / 1000);
    }

    private removeNetworkTimer(timerId: number): void {
        if (timerId > 0) {
            tyou.timer.removeTimer(timerId);
        }
    }

    private decodePacket(msg: any): any {
        if (typeof msg === "string") {
            return JSON.parse(msg);
        }

        const bytes = this.getMessageBytes(msg);
        const decoderCtor = (globalThis as any).TextDecoder;
        if (decoderCtor) {
            return JSON.parse(new decoderCtor("utf-8").decode(bytes));
        }

        return JSON.parse(this.Utf8ArrayToStr(bytes));
    }

    private getMessageBytes(msg: any): Uint8Array {
        if (msg instanceof ArrayBuffer) {
            return new Uint8Array(msg);
        }
        if (ArrayBuffer.isView(msg)) {
            return new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength);
        }
        if (msg?.data instanceof ArrayBuffer) {
            return new Uint8Array(msg.data);
        }
        if (msg?.buffer instanceof ArrayBuffer) {
            return new Uint8Array(msg.buffer);
        }
        throw new Error("Unsupported socket message data");
    }

    private Utf8ArrayToStr(array: any) {
        var out, i, len, c;
        var char2, char3;

        out = "";
        len = array.length;
        i = 0;
        while (i < len) {
            c = array[i++];
            switch (c >> 4) {
                case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                    // 0xxxxxxx
                    out += String.fromCharCode(c);
                    break;
                case 12: case 13:
                    // 110x xxxx   10xx xxxx
                    char2 = array[i++];
                    out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                    break;
                case 14:
                    // 1110 xxxx  10xx xxxx  10xx xxxx
                    char2 = array[i++];
                    char3 = array[i++];
                    out += String.fromCharCode(((c & 0x0F) << 12) |
                        ((char2 & 0x3F) << 6) |
                        ((char3 & 0x3F) << 0));
                    break;
            }
        }

        return out;
    }

    private arrayBufferToString(arr: any) {
        if (typeof arr === 'string') {
            return arr;
        }
        var dataview = new DataView(arr.data);
        var ints = new Uint8Array(arr.data.byteLength);
        for (var i = 0; i < ints.length; i++) {
            ints[i] = dataview.getUint8(i);
        }
        arr = ints;
        var str = '',
            _arr = arr;
        for (var i = 0; i < _arr.length; i++) {
            var one = _arr[i].toString(2),
                v = one.match(/^1+?(?=0)/);
            if (v && one.length == 8) {
                var bytesLength = v[0].length;
                var store = _arr[i].toString(2).slice(7 - bytesLength);
                for (var st = 1; st < bytesLength; st++) {
                    store += _arr[st + i].toString(2).slice(2);
                }
                str += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            } else {
                str += String.fromCharCode(_arr[i]);
            }
        }
        return str;
    }
}

import {error, warn} from "cc";

type HttpMethod = "GET" | "POST";
type HttpResponseType = "" | "arraybuffer";
type HttpCallback = Function | undefined;

interface IHttpRequestRecord {
    key: string;
    name: string;
    url: string;
    finalUrl: string;
    method: HttpMethod;
    params: any;
    responseType: HttpResponseType;
    abort?: () => void;
    settled: boolean;
}

interface IPlatformRequestAdapter {
    name: string;
    api: any;
}

/** 请求事件 */
export enum HttpEvent {
    /** 断网 */
    NO_NETWORK = "http_request_no_network",
    /** 未知错误 */
    UNKNOWN_ERROR = "http_request_unknown_error",
    /** 请求超时 */
    TIMEOUT = "http_request_timout",
    /** 请求取消 */
    ABORT = "http_request_abort",
    /** HTTP状态码错误 */
    HTTP_ERROR = "http_request_http_error",
    /** 响应解析错误 */
    PARSE_ERROR = "http_request_parse_error"
}

/** HTTP请求 */
export class HttpModule {
    /** 服务器地址 */
    server: string = "http://127.0.0.1/";
    /** 请求超时时间 */
    timeout: number = 10000;

    private readonly _requests: Map<string, IHttpRequestRecord> = new Map();
    private readonly _platformNames: string[] = ["wx", "tt", "qq", "my", "swan", "qg", "ks", "jd", "hbs"];

    /**
     * HTTP GET请求
     * @param name                  协议名
     * @param completeCallback      请求完整回调方法
     * @param errorCallback         请求失败回调方法
     */
    get(name: string, completeCallback: Function, errorCallback: Function) {
        this.sendRequest(name, null, false, completeCallback, errorCallback);
    }

    /**
     * HTTP GET请求
     * @param name                  协议名
     * @param params                查询参数
     * @param completeCallback      请求完整回调方法
     * @param errorCallback         请求失败回调方法
     */
    getWithParams(name: string, params: any, completeCallback: Function, errorCallback: Function) {
        this.sendRequest(name, params, false, completeCallback, errorCallback);
    }

    /**
     * HTTP GET请求非文本格式数据
     * @param name                  协议名
     * @param completeCallback      请求完整回调方法
     * @param errorCallback         请求失败回调方法
     */
    getByArraybuffer(name: string, completeCallback: Function, errorCallback: Function) {
        this.sendRequest(name, null, false, completeCallback, errorCallback, "arraybuffer", false);
    }

    /**
     * HTTP GET请求非文本格式数据
     * @param name                  协议名
     * @param params                查询参数
     * @param completeCallback      请求完整回调方法
     * @param errorCallback         请求失败回调方法
     */
    getWithParamsByArraybuffer(name: string, params: any, completeCallback: Function, errorCallback: Function) {
        this.sendRequest(name, params, false, completeCallback, errorCallback, "arraybuffer", false);
    }

    /**
     * HTTP POST请求
     * @param name                  协议名
     * @param params                查询参数
     * @param completeCallback      请求完整回调方法
     * @param errorCallback         请求失败回调方法
     */
    post(name: string, params: any, completeCallback?: Function, errorCallback?: Function) {
        this.sendRequest(name, params, true, completeCallback, errorCallback);
    }

    /** 取消请求中的请求 */
    abort(name: string) {
        const resolvedUrl = this.resolveUrl(name);
        for (const record of Array.from(this._requests.values())) {
            if (record.name === name || record.url === resolvedUrl || record.finalUrl === resolvedUrl || record.finalUrl.startsWith(`${resolvedUrl}?`)) {
                this.abortRecord(record);
            }
        }
    }

    onDestroy(): void {
        for (const record of Array.from(this._requests.values())) {
            this.abortRecord(record);
        }
        this._requests.clear();
    }

    onInit(server: string, timeout: number): void {
        this.server = server;
        this.timeout = timeout;
    }

    /**
     * 获得字符串形式的参数
     */
    private getParamString(params: any): string {
        if (params == null || params === "") {
            return "";
        }

        if (typeof params === "string") {
            return params;
        }

        const pairs: string[] = [];
        const append = (key: string, value: any) => {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(value == null ? "" : String(value));
            pairs.push(`${encodedKey}=${encodedValue}`);
        };

        for (const name in params) {
            if (!Object.prototype.hasOwnProperty.call(params, name)) {
                continue;
            }

            const data = params[name];
            if (data !== null && typeof data === "object" && !Array.isArray(data)) {
                for (const key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        append(key, data[key]);
                    }
                }
            } else {
                append(name, data);
            }
        }

        return pairs.join("&");
    }

    /**
     * Http请求
     * @param name(string)              请求地址
     * @param params(JSON)              请求参数
     * @param isPost(boolen)            是否为POST方式
     * @param callback(function)        请求成功回调
     * @param errorCallback(function)   请求失败回调
     * @param responseType(string)      响应类型
     */
    private sendRequest(name: string,
                        params: any,
                        isPost: boolean,
                        completeCallback?: Function,
                        errorCallback?: Function,
                        responseType: HttpResponseType = "",
                        isOpenTimeout = true,
                        timeout: number = this.timeout) {
        if (name == null || name === "") {
            error("请求地址不能为空");
            return;
        }

        const method: HttpMethod = isPost ? "POST" : "GET";
        const url = this.resolveUrl(name);
        const query = method === "GET" ? this.getParamString(params) : "";
        const finalUrl = this.appendQuery(url, query);
        const body = method === "POST" ? this.serializeBody(params) : undefined;
        const key = this.makeRequestKey(method, finalUrl, body, responseType);

        if (this._requests.has(key)) {
            warn(`地址【${finalUrl}】已正在请求中，不能重复请求`);
            return;
        }

        const record: IHttpRequestRecord = {
            key,
            name,
            url,
            finalUrl,
            method,
            params,
            responseType,
            settled: false
        };
        this._requests.set(key, record);

        const adapter = this.getPlatformRequestAdapter();
        if (adapter) {
            this.sendByPlatform(adapter, record, body, completeCallback, errorCallback, isOpenTimeout ? timeout : 0);
            return;
        }

        if (typeof XMLHttpRequest !== "undefined") {
            this.sendByXHR(record, body, completeCallback, errorCallback, isOpenTimeout ? timeout : 0);
            return;
        }

        this.failRequest(record, errorCallback, HttpEvent.UNKNOWN_ERROR, {message: "No HTTP request adapter available"});
    }

    private resolveUrl(name: string): string {
        const lowerName = name.toLowerCase();
        if (lowerName.indexOf("http://") === 0 || lowerName.indexOf("https://") === 0) {
            return name;
        }

        if (this.server.endsWith("/") && name.startsWith("/")) {
            return this.server + name.substring(1);
        }
        if (!this.server.endsWith("/") && !name.startsWith("/")) {
            return `${this.server}/${name}`;
        }
        return this.server + name;
    }

    private appendQuery(url: string, query: string): string {
        if (!query) {
            return url;
        }
        return url.indexOf("?") > -1 ? `${url}&${query}` : `${url}?${query}`;
    }

    private serializeBody(params: any): any {
        if (params == null || params === "") {
            return undefined;
        }
        if (typeof params === "string" || params instanceof ArrayBuffer) {
            return params;
        }
        return JSON.stringify(params);
    }

    private makeRequestKey(method: HttpMethod, finalUrl: string, body: any, responseType: HttpResponseType): string {
        return `${method}|${finalUrl}|${responseType}|${this.getBodySignature(body)}`;
    }

    private getBodySignature(body: any): string {
        if (body == null) {
            return "";
        }
        if (typeof body === "string") {
            return body;
        }
        if (body instanceof ArrayBuffer) {
            return `arraybuffer:${body.byteLength}`;
        }
        return String(body);
    }

    private getPlatformRequestAdapter(): IPlatformRequestAdapter | null {
        const root = globalThis as any;
        for (const name of this._platformNames) {
            const api = root[name];
            if (api && typeof api.request === "function") {
                return {name, api};
            }
        }
        return null;
    }

    private sendByPlatform(adapter: IPlatformRequestAdapter,
                           record: IHttpRequestRecord,
                           body: any,
                           completeCallback: HttpCallback,
                           errorCallback: HttpCallback,
                           timeout: number): void {
        let settled = false;
        const settleSuccess = (res: any) => {
            if (settled) return;
            settled = true;
            const statusCode = this.getStatusCode(res);
            if (this.isHttpSuccess(statusCode)) {
                this.completeRequest(record, completeCallback, errorCallback, res?.data, statusCode);
            } else {
                this.failRequest(record, errorCallback, HttpEvent.HTTP_ERROR, res, statusCode);
            }
        };
        const settleFail = (err: any) => {
            if (settled) return;
            settled = true;
            this.failRequest(record, errorCallback, this.mapPlatformError(err), err);
        };

        try {
            const requestOptions: any = {
                url: record.method === "GET" ? record.finalUrl : record.url,
                method: record.method,
                data: record.method === "POST" ? body : undefined,
                header: {"Content-Type": "application/json; charset=utf-8"},
                headers: {"Content-Type": "application/json; charset=utf-8"},
                timeout: timeout > 0 ? timeout : undefined,
                responseType: record.responseType || undefined,
                success: settleSuccess,
                fail: settleFail,
                complete: (res: any) => {
                    if (!settled && res && (res.statusCode !== undefined || res.status !== undefined)) {
                        settleSuccess(res);
                    }
                }
            };

            const task = adapter.api.request(requestOptions);
            if (task && typeof task.abort === "function") {
                record.abort = () => task.abort();
            }
        } catch (e) {
            settleFail(e);
        }
    }

    private sendByXHR(record: IHttpRequestRecord,
                      body: any,
                      completeCallback: HttpCallback,
                      errorCallback: HttpCallback,
                      timeout: number): void {
        const xhr = new XMLHttpRequest();
        record.abort = () => xhr.abort();

        try {
            xhr.open(record.method, record.method === "GET" ? record.finalUrl : record.url, true);
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            if (record.responseType) {
                xhr.responseType = record.responseType;
            }
            if (timeout > 0) {
                xhr.timeout = timeout;
            }

            xhr.onload = () => {
                if (this.isHttpSuccess(xhr.status)) {
                    const response = record.responseType === "arraybuffer" ? xhr.response : (xhr.response || xhr.responseText);
                    this.completeRequest(record, completeCallback, errorCallback, response, xhr.status);
                } else {
                    this.failRequest(record, errorCallback, this.mapXHRError(xhr), xhr.response || xhr.responseText, xhr.status);
                }
            };
            xhr.onerror = () => this.failRequest(record, errorCallback, this.mapXHRError(xhr), xhr.response || xhr.responseText, xhr.status);
            xhr.ontimeout = () => this.failRequest(record, errorCallback, HttpEvent.TIMEOUT, xhr.response || xhr.responseText, xhr.status);
            xhr.onabort = () => this.finishRequest(record);
            xhr.send(body);
        } catch (e) {
            this.failRequest(record, errorCallback, HttpEvent.UNKNOWN_ERROR, e);
        }
    }

    private completeRequest(record: IHttpRequestRecord,
                            completeCallback: HttpCallback,
                            errorCallback: HttpCallback,
                            response: any,
                            statusCode?: number): void {
        this.finishRequest(record);

        if (record.responseType === "arraybuffer") {
            completeCallback?.(response);
            return;
        }

        let data: any;
        try {
            data = this.parseResponse(response);
        } catch (e) {
            this.invokeError(errorCallback, record, HttpEvent.PARSE_ERROR, e, statusCode);
            return;
        }

        if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "code")) {
            if (data.code === 0) {
                completeCallback?.(data.data);
            } else {
                this.invokeError(errorCallback, record, HttpEvent.UNKNOWN_ERROR, data, statusCode);
            }
            return;
        }

        completeCallback?.(data);
    }

    private failRequest(record: IHttpRequestRecord, errorCallback: HttpCallback, event: HttpEvent, raw?: any, statusCode?: number): void {
        this.finishRequest(record);
        this.invokeError(errorCallback, record, event, raw, statusCode);
    }

    private invokeError(errorCallback: HttpCallback,
                        record: IHttpRequestRecord,
                        event: HttpEvent,
                        raw?: any,
                        statusCode?: number): void {
        errorCallback?.({
            url: record.url,
            finalUrl: record.finalUrl,
            params: record.params,
            event,
            statusCode,
            raw
        });
    }

    private finishRequest(record: IHttpRequestRecord): void {
        if (record.settled) {
            return;
        }
        record.settled = true;
        this._requests.delete(record.key);
    }

    private abortRecord(record: IHttpRequestRecord): void {
        const abort = record.abort;
        this.finishRequest(record);
        try {
            abort?.();
        } catch (e) {
            warn("[HttpModule] abort request failed", e);
        }
    }

    private parseResponse(response: any): any {
        if (response == null || response === "") {
            return null;
        }
        if (typeof response === "string") {
            return JSON.parse(response);
        }
        return response;
    }

    private getStatusCode(res: any): number {
        if (!res) {
            return 0;
        }
        return Number(res.statusCode ?? res.status ?? 0);
    }

    private isHttpSuccess(statusCode: number): boolean {
        return (statusCode >= 200 && statusCode < 300) || statusCode === 304;
    }

    private mapXHRError(xhr: XMLHttpRequest): HttpEvent {
        if (xhr.readyState === 0 || xhr.readyState === 1 || xhr.status === 0) {
            return HttpEvent.NO_NETWORK;
        }
        return HttpEvent.HTTP_ERROR;
    }

    private mapPlatformError(err: any): HttpEvent {
        const message = String(err?.errMsg || err?.message || err || "").toLowerCase();
        if (message.indexOf("timeout") >= 0) {
            return HttpEvent.TIMEOUT;
        }
        if (message.indexOf("abort") >= 0 || message.indexOf("cancel") >= 0) {
            return HttpEvent.ABORT;
        }
        if (message.indexOf("network") >= 0 || message.indexOf("fail") >= 0) {
            return HttpEvent.NO_NETWORK;
        }
        return HttpEvent.UNKNOWN_ERROR;
    }
}

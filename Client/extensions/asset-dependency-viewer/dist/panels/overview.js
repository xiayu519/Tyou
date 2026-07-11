"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const overview_filter_1 = require("../overview-filter");
const scope_utils_1 = require("../scope-utils");
const ROW_HEIGHT = 32;
const OVERSCAN = 8;
let panelRoot = null;
let snapshot = null;
let filteredRows = [];
let searchText = '';
let renderQueued = false;
let activeMode = 'references';
let activeKind = 'resource';
let scopePath = '';
function escapeHtml(value) {
    return String(value !== null && value !== void 0 ? value : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function bindPanelRoot(panel) {
    var _a;
    const root = (_a = panel === null || panel === void 0 ? void 0 : panel.$) === null || _a === void 0 ? void 0 : _a.root;
    if (root)
        panelRoot = root;
}
function root() {
    if (panelRoot === null || panelRoot === void 0 ? void 0 : panelRoot.isConnected)
        return panelRoot;
    panelRoot = document.querySelector('#root');
    return panelRoot;
}
function query(selector) {
    var _a;
    return ((_a = root()) === null || _a === void 0 ? void 0 : _a.querySelector(selector)) || null;
}
function compactPath(path) {
    return path.replace(/^db:\/\/assets\/?/, 'assets/');
}
function scopedRows() {
    return (0, scope_utils_1.filterRowsByScope)((snapshot === null || snapshot === void 0 ? void 0 : snapshot.rows) || [], scopePath);
}
function renderScope() {
    const breadcrumb = query('#scope-breadcrumb');
    const clear = query('#clear-scope');
    if (!breadcrumb || !clear)
        return;
    const normalized = (0, scope_utils_1.normalizeScopePath)(scopePath);
    clear.disabled = !normalized;
    const parts = normalized
        ? normalized.replace(/^db:\/\/assets\/?/, '').split('/').filter(Boolean)
        : [];
    const crumbs = [
        '<button class="scope-crumb" data-scope="" title="显示整个项目 Assets">Assets</button>',
    ];
    let current = 'db://assets';
    for (const part of parts) {
        current += `/${part}`;
        crumbs.push('<span class="scope-separator">/</span>');
        crumbs.push(`<button class="scope-crumb" data-scope="${escapeHtml(current)}" title="切换到此目录">${escapeHtml(part)}</button>`);
    }
    breadcrumb.innerHTML = crumbs.join('');
}
function updateFilter(resetScroll = false) {
    const source = scopedRows();
    filteredRows = (0, overview_filter_1.filterOverviewRows)(source, activeMode, activeKind, searchText);
    const spacer = query('#list-spacer');
    if (spacer)
        spacer.style.height = `${filteredRows.length * ROW_HEIGHT}px`;
    if (resetScroll) {
        const viewport = query('#list-viewport');
        if (viewport)
            viewport.scrollTop = 0;
    }
    renderScope();
    updateToggles();
    renderVisibleRows();
    updateStatus();
}
function updateToggles() {
    var _a, _b;
    const counts = (0, overview_filter_1.getOverviewCounts)(scopedRows());
    const referenceTotal = counts.references.resource + counts.references.script;
    const redundantTotal = counts.redundant.resource + counts.redundant.script;
    for (const button of Array.from(((_a = root()) === null || _a === void 0 ? void 0 : _a.querySelectorAll('[data-mode]')) || [])) {
        button.classList.toggle('active', button.dataset.mode === activeMode);
    }
    for (const button of Array.from(((_b = root()) === null || _b === void 0 ? void 0 : _b.querySelectorAll('[data-kind]')) || [])) {
        button.classList.toggle('active', button.dataset.kind === activeKind);
    }
    const referenceCount = query('#references-count');
    const redundantCount = query('#redundant-count');
    const resourceCount = query('#resource-count');
    const scriptCount = query('#script-count');
    if (referenceCount)
        referenceCount.textContent = String(referenceTotal);
    if (redundantCount)
        redundantCount.textContent = String(redundantTotal);
    if (resourceCount)
        resourceCount.textContent = String(counts[activeMode].resource);
    if (scriptCount)
        scriptCount.textContent = String(counts[activeMode].script);
    const dependencyHeader = query('#dependency-header');
    const userHeader = query('#user-header');
    const locateHeader = query('#locate-header');
    if (dependencyHeader)
        dependencyHeader.hidden = activeMode === 'redundant';
    if (userHeader)
        userHeader.hidden = activeMode === 'redundant';
    if (locateHeader)
        locateHeader.hidden = activeMode !== 'redundant';
    const empty = query('#empty');
    if (empty) {
        const modeText = activeMode === 'redundant' ? '冗余' : '';
        const kindText = activeKind === 'script' ? '脚本' : '资源';
        empty.textContent = `没有匹配的${modeText}${kindText}`;
    }
}
function updateStatus() {
    const status = query('#status');
    const refreshButton = query('#refresh');
    const toggleButton = query('#toggle-enabled');
    if (!status)
        return;
    if (!snapshot) {
        status.textContent = '等待 AssetDB 数据';
        status.className = 'status';
        return;
    }
    if (refreshButton)
        refreshButton.disabled = !snapshot.enabled || snapshot.refreshing;
    if (toggleButton) {
        toggleButton.disabled = snapshot.refreshing;
        toggleButton.textContent = snapshot.enabled ? '关闭功能' : '开启功能';
        toggleButton.className = snapshot.enabled ? 'danger' : 'primary';
    }
    const visible = filteredRows.length;
    const counts = (0, overview_filter_1.getOverviewCounts)(scopedRows());
    const total = counts[activeMode][activeKind];
    const modeText = activeMode === 'redundant' ? '冗余资源' : '资源引用';
    const kindText = activeKind === 'script' ? '脚本' : '资源';
    const scopeText = scopePath ? compactPath(scopePath) : 'Assets 全项目';
    const time = snapshot.generatedAt
        ? new Date(snapshot.generatedAt).toLocaleTimeString()
        : '--:--:--';
    if (!snapshot.enabled) {
        status.textContent = '功能未开启：不会查询 AssetDB，也不会响应资源变化。';
        status.className = 'status disabled';
    }
    else if (snapshot.refreshing) {
        status.textContent = `正在刷新… ${scopeText} · ${modeText} / ${kindText} ${visible}/${total}`;
        status.className = 'status refreshing';
    }
    else if (snapshot.stale) {
        status.textContent = `数据可能不完整：${snapshot.error || 'AssetDB 查询失败'}`;
        status.className = 'status stale';
    }
    else {
        const source = snapshot.fromCache ? '缓存' : time;
        status.textContent = `${scopeText} · ${modeText} / ${kindText} · ${visible}/${total} · ${snapshot.edgeCount} 条全项目直接关系 · ${source}`;
        status.className = 'status';
    }
}
function queueRender() {
    if (renderQueued)
        return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderVisibleRows();
    });
}
function renderVisibleRows() {
    const viewport = query('#list-viewport');
    const rowsHost = query('#visible-rows');
    const empty = query('#empty');
    if (!viewport || !rowsHost || !empty)
        return;
    empty.hidden = filteredRows.length > 0;
    if (filteredRows.length === 0) {
        rowsHost.innerHTML = '';
        return;
    }
    const start = Math.max(0, Math.floor(viewport.scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(viewport.clientHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(filteredRows.length, start + visibleCount);
    rowsHost.style.transform = `translateY(${start * ROW_HEIGHT}px)`;
    rowsHost.innerHTML = filteredRows.slice(start, end).map((row, offset) => {
        const index = start + offset;
        const path = compactPath(row.path);
        const typeLabel = row.scriptRole === 'global' ? `${row.type} · Global` : row.type;
        if (activeMode === 'redundant') {
            return `
                <div class="asset-row redundant-row" data-index="${index}" data-uuid="${escapeHtml(row.uuid)}">
                    <button class="asset-path" title="${escapeHtml(row.file || row.path)}" data-action="reveal">
                        <span class="asset-name">${escapeHtml(row.name)}</span>
                        <span class="asset-url">${escapeHtml(path)}</span>
                    </button>
                    <span class="asset-type" title="${escapeHtml(typeLabel)}">${escapeHtml(typeLabel)}</span>
                    <button class="locate" data-action="reveal" title="在 Creator Assets 中定位">定位</button>
                </div>
            `;
        }
        return `
            <div class="asset-row" data-index="${index}" data-uuid="${escapeHtml(row.uuid)}">
                <button class="asset-path" title="${escapeHtml(row.file || row.path)}" data-action="reveal">
                    <span class="asset-name">${escapeHtml(row.name)}</span>
                    <span class="asset-url">${escapeHtml(path)}</span>
                </button>
                <span class="asset-type" title="${escapeHtml(typeLabel)}">${escapeHtml(typeLabel)}</span>
                <button class="count dependency" data-action="detail" title="直接引用 ${row.dependencyCount} 个资源">${row.dependencyCount}</button>
                <button class="count user" data-action="detail" title="被 ${row.userCount} 个资源直接引用">${row.userCount}</button>
            </div>
        `;
    }).join('');
}
function bindEvents() {
    var _a, _b;
    const viewport = query('#list-viewport');
    const search = query('#search');
    const refresh = query('#refresh');
    const toggle = query('#toggle-enabled');
    const rowsHost = query('#visible-rows');
    const useSelection = query('#use-selection');
    const clearScope = query('#clear-scope');
    const breadcrumb = query('#scope-breadcrumb');
    if (!viewport || !search || !refresh || !toggle || !rowsHost || !useSelection || !clearScope || !breadcrumb)
        return;
    viewport.addEventListener('scroll', queueRender, { passive: true });
    search.addEventListener('input', () => {
        searchText = search.value;
        updateFilter(true);
    });
    refresh.addEventListener('click', () => {
        if (!(snapshot === null || snapshot === void 0 ? void 0 : snapshot.enabled))
            return;
        refresh.disabled = true;
        void Editor.Message.request('asset-dependency-viewer', 'refresh')
            .catch((error) => {
            console.warn('[AssetDependencyViewer] manual refresh failed:', (error === null || error === void 0 ? void 0 : error.message) || error);
        });
    });
    toggle.addEventListener('click', () => {
        const message = (snapshot === null || snapshot === void 0 ? void 0 : snapshot.enabled) ? 'disable' : 'enable';
        toggle.disabled = true;
        void Editor.Message.request('asset-dependency-viewer', message)
            .then((value) => applySnapshot(value))
            .catch((error) => {
            toggle.disabled = false;
            console.warn(`[AssetDependencyViewer] ${message} failed:`, (error === null || error === void 0 ? void 0 : error.message) || error);
        });
    });
    useSelection.addEventListener('click', () => {
        useSelection.disabled = true;
        void Editor.Message.request('asset-dependency-viewer', 'use-current-selection')
            .then((value) => applyScope(value))
            .catch((error) => {
            console.warn('[AssetDependencyViewer] use current selection failed:', (error === null || error === void 0 ? void 0 : error.message) || error);
        })
            .finally(() => {
            useSelection.disabled = false;
        });
    });
    clearScope.addEventListener('click', () => {
        void Editor.Message.request('asset-dependency-viewer', 'set-scope', '')
            .then((value) => applyScope(value));
    });
    breadcrumb.addEventListener('click', (event) => {
        var _a;
        const button = (_a = event.target) === null || _a === void 0 ? void 0 : _a.closest('button[data-scope]');
        if (!button)
            return;
        void Editor.Message.request('asset-dependency-viewer', 'set-scope', button.dataset.scope || '')
            .then((value) => applyScope(value));
    });
    for (const button of Array.from(((_a = root()) === null || _a === void 0 ? void 0 : _a.querySelectorAll('[data-mode]')) || [])) {
        button.addEventListener('click', () => {
            activeMode = button.dataset.mode;
            updateFilter(true);
        });
    }
    for (const button of Array.from(((_b = root()) === null || _b === void 0 ? void 0 : _b.querySelectorAll('[data-kind]')) || [])) {
        button.addEventListener('click', () => {
            activeKind = button.dataset.kind;
            updateFilter(true);
        });
    }
    rowsHost.addEventListener('click', (event) => {
        const target = event.target;
        const button = target === null || target === void 0 ? void 0 : target.closest('button[data-action]');
        const rowElement = target === null || target === void 0 ? void 0 : target.closest('.asset-row');
        if (!rowElement)
            return;
        const row = filteredRows[Number(rowElement.dataset.index)];
        if (!row)
            return;
        const action = (0, overview_filter_1.resolveOverviewRowAction)(activeMode, (button === null || button === void 0 ? void 0 : button.dataset.action) === 'detail' ? 'detail' : 'reveal');
        if (action === 'reveal') {
            void Editor.Message.request('asset-dependency-viewer', 'reveal-asset', row.uuid);
            return;
        }
        if (!button)
            return;
        if (action === 'detail') {
            void Editor.Message.request('asset-dependency-viewer', 'show-detail', row.uuid);
        }
    });
}
function applySnapshot(value) {
    if (value)
        snapshot = value;
    updateFilter(false);
}
function applyScope(value) {
    scopePath = (0, scope_utils_1.normalizeScopePath)(value || '');
    updateFilter(true);
}
module.exports = Editor.Panel.define({
    template: `
        <section id="root">
            <header class="toolbar">
                <input id="search" type="search" placeholder="搜索资源路径或类型" spellcheck="false" />
                <button id="refresh" title="从 Creator AssetDB 重新读取" disabled>刷新</button>
                <button id="toggle-enabled" class="primary">开启功能</button>
            </header>
            <nav class="mode-toggles" aria-label="查看大类">
                <button data-mode="references" class="active">资源引用 <span id="references-count">0</span></button>
                <button data-mode="redundant">冗余资源 <span id="redundant-count">0</span></button>
            </nav>
            <nav class="kind-toggles" aria-label="资源类型">
                <button data-kind="resource" class="active">资源 <span id="resource-count">0</span></button>
                <button data-kind="script">脚本 <span id="script-count">0</span></button>
            </nav>
            <div class="scope-bar">
                <span class="scope-label">范围</span>
                <div id="scope-breadcrumb" class="scope-breadcrumb"></div>
                <button id="use-selection" title="文件夹使用自身；文件使用所在文件夹">使用 Assets 当前选择</button>
                <button id="clear-scope" disabled>清除范围</button>
            </div>
            <div id="status" class="status">等待 AssetDB 数据</div>
            <div class="list-header">
                <span>资源</span><span>类型</span>
                <span id="dependency-header" class="dependency">引用</span>
                <span id="user-header" class="user">被引用</span>
                <span id="locate-header" class="locate-header" hidden>定位</span>
            </div>
            <div id="list-viewport">
                <div id="list-spacer">
                    <div id="visible-rows"></div>
                </div>
                <div id="empty" hidden>没有匹配的项目资源</div>
            </div>
        </section>
    `,
    style: `
        :host { display: block; height: 100%; }
        * { box-sizing: border-box; }
        #root { height: 100%; display: flex; flex-direction: column; color: var(--color-normal-contrast); background: var(--color-normal-fill); }
        .toolbar { display: flex; gap: 8px; padding: 10px; border-bottom: 1px solid var(--color-normal-border); }
        #search { flex: 1; min-width: 0; height: 28px; padding: 0 9px; color: var(--color-normal-contrast); background: var(--color-normal-fill-emphasis); border: 1px solid var(--color-normal-border); border-radius: 4px; outline: none; }
        #search:focus { border-color: var(--color-focus-border); }
        button { font: inherit; }
        #refresh { min-width: 58px; color: var(--color-normal-contrast); background: var(--color-normal-fill-emphasis); border: 1px solid var(--color-normal-border); border-radius: 4px; cursor: pointer; }
        #refresh:hover:not(:disabled) { border-color: var(--color-focus-border); }
        #refresh:disabled { opacity: .5; cursor: default; }
        #toggle-enabled { min-width: 72px; color: white; border: 0; border-radius: 4px; cursor: pointer; }
        #toggle-enabled.primary { background: #3478c7; }
        #toggle-enabled.danger { background: #a84545; }
        #toggle-enabled:hover:not(:disabled) { filter: brightness(1.12); }
        #toggle-enabled:disabled { opacity: .5; cursor: default; }
        .mode-toggles, .kind-toggles { display: flex; align-items: stretch; padding: 0 10px; border-bottom: 1px solid var(--color-normal-border); background: var(--color-normal-fill); }
        .mode-toggles { min-height: 38px; gap: 4px; }
        .kind-toggles { min-height: 32px; gap: 2px; background: var(--color-normal-fill-emphasis); }
        .mode-toggles button, .kind-toggles button { position: relative; padding: 0 14px; color: var(--color-normal-contrast-emphasis); background: transparent; border: 0; cursor: pointer; }
        .mode-toggles button.active, .kind-toggles button.active { color: var(--color-normal-contrast); font-weight: 600; }
        .mode-toggles button.active::after, .kind-toggles button.active::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: 0; height: 2px; background: var(--color-focus-border); }
        .mode-toggles span, .kind-toggles span { display: inline-block; min-width: 22px; margin-left: 5px; padding: 1px 5px; color: var(--color-normal-contrast); background: var(--color-normal-fill-emphasis); border-radius: 9px; font-size: 10px; text-align: center; }
        .kind-toggles span { background: var(--color-normal-fill); }
        .scope-bar { min-height: 34px; display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-bottom: 1px solid var(--color-normal-border); background: var(--color-normal-fill-emphasis); }
        .scope-label { flex: 0 0 auto; color: var(--color-normal-contrast-emphasis); font-size: 11px; }
        .scope-breadcrumb { min-width: 0; flex: 1; display: flex; align-items: center; overflow-x: auto; white-space: nowrap; }
        .scope-crumb { flex: 0 0 auto; padding: 2px 4px; color: var(--color-focus-contrast); background: transparent; border: 0; cursor: pointer; }
        .scope-crumb:hover { text-decoration: underline; }
        .scope-separator { color: var(--color-normal-contrast-emphasis); }
        #use-selection, #clear-scope { flex: 0 0 auto; height: 24px; padding: 0 8px; color: var(--color-normal-contrast); background: var(--color-normal-fill); border: 1px solid var(--color-normal-border); border-radius: 3px; cursor: pointer; }
        #use-selection:hover:not(:disabled), #clear-scope:hover:not(:disabled) { border-color: var(--color-focus-border); }
        #use-selection:disabled, #clear-scope:disabled { opacity: .5; cursor: default; }
        .status { min-height: 27px; padding: 6px 10px; color: var(--color-normal-contrast-emphasis); font-size: 12px; border-bottom: 1px solid var(--color-normal-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status.refreshing { color: var(--color-focus-contrast); }
        .status.stale { color: #e6a23c; }
        .status.disabled { color: var(--color-normal-contrast-emphasis); }
        .list-header, .asset-row { display: grid; grid-template-columns: minmax(220px, 1fr) 120px 54px 54px; align-items: center; }
        .list-header { min-height: 28px; padding: 0 8px; color: var(--color-normal-contrast-emphasis); font-size: 12px; border-bottom: 1px solid var(--color-normal-border); background: var(--color-normal-fill-emphasis); }
        .list-header .dependency, .list-header .user { text-align: center; }
        .locate-header { grid-column: 3 / 5; text-align: center; }
        [hidden] { display: none !important; }
        #list-viewport { position: relative; flex: 1; min-height: 0; overflow: auto; }
        #list-spacer { position: relative; min-width: 500px; }
        #visible-rows { position: absolute; top: 0; left: 0; right: 0; }
        .asset-row { height: ${ROW_HEIGHT}px; padding: 0 8px; border-bottom: 1px solid color-mix(in srgb, var(--color-normal-border) 55%, transparent); }
        .asset-row:hover { background: var(--color-hover-fill); }
        .redundant-row { cursor: pointer; }
        .asset-path { min-width: 0; height: 100%; display: flex; align-items: center; gap: 8px; padding: 0; color: inherit; text-align: left; background: transparent; border: 0; cursor: pointer; overflow: hidden; }
        .asset-name { flex: 0 0 auto; max-width: 36%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .asset-url { min-width: 0; color: var(--color-normal-contrast-emphasis); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .asset-path:hover .asset-name { text-decoration: underline; }
        .asset-type { color: var(--color-normal-contrast-emphasis); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .count { justify-self: center; min-width: 32px; height: 22px; padding: 0 7px; color: white; border: 0; border-radius: 3px; cursor: pointer; font-weight: 600; }
        .count.dependency { background: #b84545; }
        .count.user { background: #3a8f57; }
        .count:hover { filter: brightness(1.16); }
        .locate { grid-column: 3 / 5; justify-self: center; min-width: 64px; height: 22px; color: var(--color-normal-contrast); background: var(--color-normal-fill-emphasis); border: 1px solid var(--color-normal-border); border-radius: 3px; cursor: pointer; }
        .locate:hover { border-color: var(--color-focus-border); }
        #empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--color-normal-contrast-emphasis); }
        #empty[hidden] { display: none; }
    `,
    $: {
        root: '#root',
    },
    ready() {
        bindPanelRoot(this);
        bindEvents();
        void Promise.all([
            Editor.Message.request('asset-dependency-viewer', 'request-snapshot'),
            Editor.Message.request('asset-dependency-viewer', 'request-scope'),
        ]).then(([value, currentScope]) => {
            scopePath = (0, scope_utils_1.normalizeScopePath)(currentScope || '');
            applySnapshot(value);
        }).catch((error) => {
            console.warn('[AssetDependencyViewer] request initial state failed:', (error === null || error === void 0 ? void 0 : error.message) || error);
        });
    },
    listeners: {
        resize() {
            queueRender();
        },
    },
    methods: {
        setSnapshot(value) {
            bindPanelRoot(this);
            applySnapshot(value);
        },
        setScope(value) {
            bindPanelRoot(this);
            applyScope(value);
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvcGFuZWxzL292ZXJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0RBTTRCO0FBQzVCLGdEQUF1RTtBQUl2RSxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBTW5CLElBQUksU0FBUyxHQUF1QixJQUFJLENBQUM7QUFDekMsSUFBSSxRQUFRLEdBQThCLElBQUksQ0FBQztBQUMvQyxJQUFJLFlBQVksR0FBeUIsRUFBRSxDQUFDO0FBQzVDLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUNwQixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7QUFDekIsSUFBSSxVQUFVLEdBQWlCLFlBQVksQ0FBQztBQUM1QyxJQUFJLFVBQVUsR0FBaUIsVUFBVSxDQUFDO0FBQzFDLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUVuQixTQUFTLFVBQVUsQ0FBQyxLQUFjO0lBQzlCLE9BQU8sTUFBTSxDQUFDLEtBQUssYUFBTCxLQUFLLGNBQUwsS0FBSyxHQUFJLEVBQUUsQ0FBQztTQUNyQixPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztTQUN0QixPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztTQUNyQixPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztTQUNyQixPQUFPLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztTQUN2QixPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUFxQjs7SUFDeEMsTUFBTSxJQUFJLEdBQUcsTUFBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsQ0FBQywwQ0FBRSxJQUFJLENBQUM7SUFDNUIsSUFBSSxJQUFJO1FBQUUsU0FBUyxHQUFHLElBQUksQ0FBQztBQUMvQixDQUFD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QUFDO1FBQ25HLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNELFNBQVMsRUFBRTtRQUNQLE1BQU07WUFDRixXQUFXLEVBQUUsQ0FBQztRQUNsQixDQUFDO0tBQ0o7SUFDRCxPQUFPLEVBQUU7UUFDTCxXQUFXLENBQXNCLEtBQXlCO1lBQ3RELGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUNELFFBQVEsQ0FBc0IsS0FBYTtZQUN2QyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEIsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RCLENBQUM7S0FDSjtDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFzc2V0RGVwZW5kZW5jeVJvdywgRGVwZW5kZW5jeVNuYXBzaG90IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtcbiAgICBmaWx0ZXJPdmVydmlld1Jvd3MsXG4gICAgZ2V0T3ZlcnZpZXdDb3VudHMsXG4gICAgT3ZlcnZpZXdLaW5kLFxuICAgIE92ZXJ2aWV3TW9kZSxcbiAgICByZXNvbHZlT3ZlcnZpZXdSb3dBY3Rpb24sXG59IGZyb20gJy4uL292ZXJ2aWV3LWZpbHRlcic7XG5pbXBvcnQgeyBmaWx0ZXJSb3dzQnlTY29wZSwgbm9ybWFsaXplU2NvcGVQYXRoIH0gZnJvbSAnLi4vc2NvcGUtdXRpbHMnO1xuXG5leHBvcnQge307XG5cbmNvbnN0IFJPV19IRUlHSFQgPSAzMjtcbmNvbnN0IE9WRVJTQ0FOID0gODtcblxudHlwZSBQYW5lbEluc3RhbmNlID0ge1xuICAgICQ/OiBSZWNvcmQ8c3RyaW5nLCBIVE1MRWxlbWVudCB8IG51bGw+O1xufTtcblxubGV0IHBhbmVsUm9vdDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbmxldCBzbmFwc2hvdDogRGVwZW5kZW5jeVNuYXBzaG90IHwgbnVsbCA9IG51bGw7XG5sZXQgZmlsdGVyZWRSb3dzOiBBc3NldERlcGVuZGVuY3lSb3dbXSA9IFtdO1xubGV0IHNlYXJjaFRleHQgPSAnJztcbmxldCByZW5kZXJRdWV1ZWQgPSBmYWxzZTtcbmxldCBhY3RpdmVNb2RlOiBPdmVydmlld01vZGUgPSAncmVmZXJlbmNlcyc7XG5sZXQgYWN0aXZlS2luZDogT3ZlcnZpZXdLaW5kID0gJ3Jlc291cmNlJztcbmxldCBzY29wZVBhdGggPSAnJztcblxuZnVuY3Rpb24gZXNjYXBlSHRtbCh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB7XG4gICAgcmV0dXJuIFN0cmluZyh2YWx1ZSA/PyAnJylcbiAgICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7Jyk7XG59XG5cbmZ1bmN0aW9uIGJpbmRQYW5lbFJvb3QocGFuZWw/OiBQYW5lbEluc3RhbmNlKTogdm9pZCB7XG4gICAgY29uc3Qgcm9vdCA9IHBhbmVsPy4kPy5yb290O1xuICAgIGlmIChyb290KSBwYW5lbFJvb3QgPSByb290O1xufVxuXG5mdW5jdGlvbiByb290KCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKHBhbmVsUm9vdD8uaXNDb25uZWN0ZWQpIHJldHVybiBwYW5lbFJvb3Q7XG4gICAgcGFuZWxSb290ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJyNyb290Jyk7XG4gICAgcmV0dXJuIHBhbmVsUm9vdDtcbn1cblxuZnVuY3Rpb24gcXVlcnk8VCBleHRlbmRzIEVsZW1lbnQ+KHNlbGVjdG9yOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gICAgcmV0dXJuIHJvb3QoKT8ucXVlcnlTZWxlY3RvcjxUPihzZWxlY3RvcikgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gY29tcGFjdFBhdGgocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9eZGI6XFwvXFwvYXNzZXRzXFwvPy8sICdhc3NldHMvJyk7XG59XG5cbmZ1bmN0aW9uIHNjb3BlZFJvd3MoKTogQXNzZXREZXBlbmRlbmN5Um93W10ge1xuICAgIHJldHVybiBmaWx0ZXJSb3dzQnlTY29wZShzbmFwc2hvdD8ucm93cyB8fCBbXSwgc2NvcGVQYXRoKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyU2NvcGUoKTogdm9pZCB7XG4gICAgY29uc3QgYnJlYWRjcnVtYiA9IHF1ZXJ5PEhUTUxFbGVtZW50PignI3Njb3BlLWJyZWFkY3J1bWInKTtcbiAgICBjb25zdCBjbGVhciA9IHF1ZXJ5PEhUTUxCdXR0b25FbGVtZW50PignI2NsZWFyLXNjb3BlJyk7XG4gICAgaWYgKCFicmVhZGNydW1iIHx8ICFjbGVhcikgcmV0dXJuO1xuXG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVNjb3BlUGF0aChzY29wZVBhdGgpO1xuICAgIGNsZWFyLmRpc2FibGVkID0gIW5vcm1hbGl6ZWQ7XG4gICAgY29uc3QgcGFydHMgPSBub3JtYWxpemVkXG4gICAgICAgID8gbm9ybWFsaXplZC5yZXBsYWNlKC9eZGI6XFwvXFwvYXNzZXRzXFwvPy8sICcnKS5zcGxpdCgnLycpLmZpbHRlcihCb29sZWFuKVxuICAgICAgICA6IFtdO1xuICAgIGNvbnN0IGNydW1icyA9IFtcbiAgICAgICAgJzxidXR0b24gY2xhc3M9XCJzY29wZS1jcnVtYlwiIGRhdGEtc2NvcGU9XCJcIiB0aXRsZT1cIuaYvuekuuaVtOS4qumhueebriBBc3NldHNcIj5Bc3NldHM8L2J1dHRvbj4nLFxuICAgIF07XG4gICAgbGV0IGN1cnJlbnQgPSAnZGI6Ly9hc3NldHMnO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0cykge1xuICAgICAgICBjdXJyZW50ICs9IGAvJHtwYXJ0fWA7XG4gICAgICAgIGNydW1icy5wdXNoKCc8c3BhbiBjbGFzcz1cInNjb3BlLXNlcGFyYXRvclwiPi88L3NwYW4+Jyk7XG4gICAgICAgIGNydW1icy5wdXNoKGA8YnV0dG9uIGNsYXNzPVwic2NvcGUtY3J1bWJcIiBkYXRhLXNjb3BlPVwiJHtlc2NhcGVIdG1sKGN1cnJlbnQpfVwiIHRpdGxlPVwi5YiH5o2i5Yiw5q2k55uu5b2VXCI+JHtlc2NhcGVIdG1sKHBhcnQpfTwvYnV0dG9uPmApO1xuICAgIH1cbiAgICBicmVhZGNydW1iLmlubmVySFRNTCA9IGNydW1icy5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlRmlsdGVyKHJlc2V0U2Nyb2xsID0gZmFsc2UpOiB2b2lkIHtcbiAgICBjb25zdCBzb3VyY2UgPSBzY29wZWRSb3dzKCk7XG4gICAgZmlsdGVyZWRSb3dzID0gZmlsdGVyT3ZlcnZpZXdSb3dzKHNvdXJjZSwgYWN0aXZlTW9kZSwgYWN0aXZlS2luZCwgc2VhcmNoVGV4dCk7XG5cbiAgICBjb25zdCBzcGFjZXIgPSBxdWVyeTxIVE1MRWxlbWVudD4oJyNsaXN0LXNwYWNlcicpO1xuICAgIGlmIChzcGFjZXIpIHNwYWNlci5zdHlsZS5oZWlnaHQgPSBgJHtmaWx0ZXJlZFJvd3MubGVuZ3RoICogUk9XX0hFSUdIVH1weGA7XG4gICAgaWYgKHJlc2V0U2Nyb2xsKSB7XG4gICAgICAgIGNvbnN0IHZpZXdwb3J0ID0gcXVlcnk8SFRNTEVsZW1lbnQ+KCcjbGlzdC12aWV3cG9ydCcpO1xuICAgICAgICBpZiAodmlld3BvcnQpIHZpZXdwb3J0LnNjcm9sbFRvcCA9IDA7XG4gICAgfVxuICAgIHJlbmRlclNjb3BlKCk7XG4gICAgdXBkYXRlVG9nZ2xlcygpO1xuICAgIHJlbmRlclZpc2libGVSb3dzKCk7XG4gICAgdXBkYXRlU3RhdHVzKCk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRvZ2dsZXMoKTogdm9pZCB7XG4gICAgY29uc3QgY291bnRzID0gZ2V0T3ZlcnZpZXdDb3VudHMoc2NvcGVkUm93cygpKTtcbiAgICBjb25zdCByZWZlcmVuY2VUb3RhbCA9IGNvdW50cy5yZWZlcmVuY2VzLnJlc291cmNlICsgY291bnRzLnJlZmVyZW5jZXMuc2NyaXB0O1xuICAgIGNvbnN0IHJlZHVuZGFudFRvdGFsID0gY291bnRzLnJlZHVuZGFudC5yZXNvdXJjZSArIGNvdW50cy5yZWR1bmRhbnQuc2NyaXB0O1xuXG4gICAgZm9yIChjb25zdCBidXR0b24gb2YgQXJyYXkuZnJvbShyb290KCk/LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCdbZGF0YS1tb2RlXScpIHx8IFtdKSkge1xuICAgICAgICBidXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgYnV0dG9uLmRhdGFzZXQubW9kZSA9PT0gYWN0aXZlTW9kZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYnV0dG9uIG9mIEFycmF5LmZyb20ocm9vdCgpPy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxCdXR0b25FbGVtZW50PignW2RhdGEta2luZF0nKSB8fCBbXSkpIHtcbiAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScsIGJ1dHRvbi5kYXRhc2V0LmtpbmQgPT09IGFjdGl2ZUtpbmQpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZmVyZW5jZUNvdW50ID0gcXVlcnk8SFRNTEVsZW1lbnQ+KCcjcmVmZXJlbmNlcy1jb3VudCcpO1xuICAgIGNvbnN0IHJlZHVuZGFudENvdW50ID0gcXVlcnk8SFRNTEVsZW1lbnQ+KCcjcmVkdW5kYW50LWNvdW50Jyk7XG4gICAgY29uc3QgcmVzb3VyY2VDb3VudCA9IHF1ZXJ5PEhUTUxFbGVtZW50PignI3Jlc291cmNlLWNvdW50Jyk7XG4gICAgY29uc3Qgc2NyaXB0Q291bnQgPSBxdWVyeTxIVE1MRWxlbWVudD4oJyNzY3JpcHQtY291bnQnKTtcbiAgICBpZiAocmVmZXJlbmNlQ291bnQpIHJlZmVyZW5jZUNvdW50LnRleHRDb250ZW50ID0gU3RyaW5nKHJlZmVyZW5jZVRvdGFsKTtcbiAgICBpZiAocmVkdW5kYW50Q291bnQpIHJlZHVuZGFudENvdW50LnRleHRDb250ZW50ID0gU3RyaW5nKHJlZHVuZGFudFRvdGFsKTtcbiAgICBpZiAocmVzb3VyY2VDb3VudCkgcmVzb3VyY2VDb3VudC50ZXh0Q29udGVudCA9IFN0cmluZyhjb3VudHNbYWN0aXZlTW9kZV0ucmVzb3VyY2UpO1xuICAgIGlmIChzY3JpcHRDb3VudCkgc2NyaXB0Q291bnQudGV4dENvbnRlbnQgPSBTdHJpbmcoY291bnRzW2FjdGl2ZU1vZGVdLnNjcmlwdCk7XG5cbiAgICBjb25zdCBkZXBlbmRlbmN5SGVhZGVyID0gcXVlcnk8SFRNTEVsZW1lbnQ+KCcjZGVwZW5kZW5jeS1oZWFkZXInKTtcbiAgICBjb25zdCB1c2VySGVhZGVyID0gcXVlcnk8SFRNTEVsZW1lbnQ+KCcjdXNlci1oZWFkZXInKTtcbiAgICBjb25zdCBsb2NhdGVIZWFkZXIgPSBxdWVyeTxIVE1MRWxlbWVudD4oJyNsb2NhdGUtaGVhZGVyJyk7XG4gICAgaWYgKGRlcGVuZGVuY3lIZWFkZXIpIGRlcGVuZGVuY3lIZWFkZXIuaGlkZGVuID0gYWN0aXZlTW9kZSA9PT0gJ3JlZHVuZGFudCc7XG4gICAgaWYgKHVzZXJIZWFkZXIpIHVzZXJIZWFkZXIuaGlkZGVuID0gYWN0aXZlTW9kZSA9PT0gJ3JlZHVuZGFudCc7XG4gICAgaWYgKGxvY2F0ZUhlYWRlcikgbG9jYXRlSGVhZGVyLmhpZGRlbiA9IGFjdGl2ZU1vZGUgIT09ICdyZWR1bmRhbnQnO1xuXG4gICAgY29uc3QgZW1wdHkgPSBxdWVyeTxIVE1MRWxlbWVudD4oJyNlbXB0eScpO1xuICAgIGlmIChlbXB0eSkge1xuICAgICAgICBjb25zdCBtb2RlVGV4dCA9IGFjdGl2ZU1vZGUgPT09ICdyZWR1bmRhbnQnID8gJ+WGl+S9mScgOiAnJztcbiAgICAgICAgY29uc3Qga2luZFRleHQgPSBhY3RpdmVLaW5kID09PSAnc2NyaXB0JyA/ICfohJrmnKwnIDogJ+i1hOa6kCc7XG4gICAgICAgIGVtcHR5LnRleHRDb250ZW50ID0gYOayoeacieWMuemFjeeahCR7bW9kZVRleHR9JHtraW5kVGV4dH1gO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlU3RhdHVzKCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXR1cyA9IHF1ZXJ5PEhUTUxFbGVtZW50PignI3N0YXR1cycpO1xuICAgIGNvbnN0IHJlZnJlc2hCdXR0b24gPSBxdWVyeTxIVE1MQnV0dG9uRWxlbWVudD4oJyNyZWZyZXNoJyk7XG4gICAgY29uc3QgdG9nZ2xlQnV0dG9uID0gcXVlcnk8SFRNTEJ1dHRvbkVsZW1lbnQ+KCcjdG9nZ2xlLWVuYWJsZWQnKTtcbiAgICBpZiAoIXN0YXR1cykgcmV0dXJuO1xuXG4gICAgaWYgKCFzbmFwc2hvdCkge1xuICAgICAgICBzdGF0dXMudGV4dENvbnRlbnQgPSAn562J5b6FIEFzc2V0REIg5pWw5o2uJztcbiAgICAgICAgc3RhdHVzLmNsYXNzTmFtZSA9ICdzdGF0dXMnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHJlZnJlc2hCdXR0b24pIHJlZnJlc2hCdXR0b24uZGlzYWJsZWQgPSAhc25hcHNob3QuZW5hYmxlZCB8fCBzbmFwc2hvdC5yZWZyZXNoaW5nO1xuICAgIGlmICh0b2dnbGVCdXR0b24pIHtcbiAgICAgICAgdG9nZ2xlQnV0dG9uLmRpc2FibGVkID0gc25hcHNob3QucmVmcmVzaGluZztcbiAgICAgICAgdG9nZ2xlQnV0dG9uLnRleHRDb250ZW50ID0gc25hcHNob3QuZW5hYmxlZCA/ICflhbPpl63lip/og70nIDogJ+W8gOWQr+WKn+iDvSc7XG4gICAgICAgIHRvZ2dsZUJ1dHRvbi5jbGFzc05hbWUgPSBzbmFwc2hvdC5lbmFibGVkID8gJ2RhbmdlcicgOiAncHJpbWFyeSc7XG4gICAgfVxuICAgIGNvbnN0IHZpc2libGUgPSBmaWx0ZXJlZFJvd3MubGVuZ3RoO1xuICAgIGNvbnN0IGNvdW50cyA9IGdldE92ZXJ2aWV3Q291bnRzKHNjb3BlZFJvd3MoKSk7XG4gICAgY29uc3QgdG90YWwgPSBjb3VudHNbYWN0aXZlTW9kZV1bYWN0aXZlS2luZF07XG4gICAgY29uc3QgbW9kZVRleHQgPSBhY3RpdmVNb2RlID09PSAncmVkdW5kYW50JyA/ICflhpfkvZnotYTmupAnIDogJ+i1hOa6kOW8leeUqCc7XG4gICAgY29uc3Qga2luZFRleHQgPSBhY3RpdmVLaW5kID09PSAnc2NyaXB0JyA/ICfohJrmnKwnIDogJ+i1hOa6kCc7XG4gICAgY29uc3Qgc2NvcGVUZXh0ID0gc2NvcGVQYXRoID8gY29tcGFjdFBhdGgoc2NvcGVQYXRoKSA6ICdBc3NldHMg5YWo6aG555uuJztcbiAgICBjb25zdCB0aW1lID0gc25hcHNob3QuZ2VuZXJhdGVkQXRcbiAgICAgICAgPyBuZXcgRGF0ZShzbmFwc2hvdC5nZW5lcmF0ZWRBdCkudG9Mb2NhbGVUaW1lU3RyaW5nKClcbiAgICAgICAgOiAnLS06LS06LS0nO1xuICAgIGlmICghc25hcHNob3QuZW5hYmxlZCkge1xuICAgICAgICBzdGF0dXMudGV4dENvbnRlbnQgPSAn5Yqf6IO95pyq5byA5ZCv77ya5LiN5Lya5p+l6K+iIEFzc2V0RELvvIzkuZ/kuI3kvJrlk43lupTotYTmupDlj5jljJbjgIInO1xuICAgICAgICBzdGF0dXMuY2xhc3NOYW1lID0gJ3N0YXR1cyBkaXNhYmxlZCc7XG4gICAgfSBlbHNlIGlmIChzbmFwc2hvdC5yZWZyZXNoaW5nKSB7XG4gICAgICAgIHN0YXR1cy50ZXh0Q29udGVudCA9IGDmraPlnKjliLfmlrDigKYgJHtzY29wZVRleHR9IMK3ICR7bW9kZVRleHR9IC8gJHtraW5kVGV4dH0gJHt2aXNpYmxlfS8ke3RvdGFsfWA7XG4gICAgICAgIHN0YXR1cy5jbGFzc05hbWUgPSAnc3RhdHVzIHJlZnJlc2hpbmcnO1xuICAgIH0gZWxzZSBpZiAoc25hcHNob3Quc3RhbGUpIHtcbiAgICAgICAgc3RhdHVzLnRleHRDb250ZW50ID0gYOaVsOaNruWPr+iDveS4jeWujOaVtO+8miR7c25hcHNob3QuZXJyb3IgfHwgJ0Fzc2V0REIg5p+l6K+i5aSx6LSlJ31gO1xuICAgICAgICBzdGF0dXMuY2xhc3NOYW1lID0gJ3N0YXR1cyBzdGFsZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gc25hcHNob3QuZnJvbUNhY2hlID8gJ+e8k+WtmCcgOiB0aW1lO1xuICAgICAgICBzdGF0dXMudGV4dENvbnRlbnQgPSBgJHtzY29wZVRleHR9IMK3ICR7bW9kZVRleHR9IC8gJHtraW5kVGV4dH0gwrcgJHt2aXNpYmxlfS8ke3RvdGFsfSDCtyAke3NuYXBzaG90LmVkZ2VDb3VudH0g5p2h5YWo6aG555uu55u05o6l5YWz57O7IMK3ICR7c291cmNlfWA7XG4gICAgICAgIHN0YXR1cy5jbGFzc05hbWUgPSAnc3RhdHVzJztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlUmVuZGVyKCk6IHZvaWQge1xuICAgIGlmIChyZW5kZXJRdWV1ZWQpIHJldHVybjtcbiAgICByZW5kZXJRdWV1ZWQgPSB0cnVlO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIHJlbmRlclF1ZXVlZCA9IGZhbHNlO1xuICAgICAgICByZW5kZXJWaXNpYmxlUm93cygpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiByZW5kZXJWaXNpYmxlUm93cygpOiB2b2lkIHtcbiAgICBjb25zdCB2aWV3cG9ydCA9IHF1ZXJ5PEhUTUxFbGVtZW50PignI2xpc3Qtdmlld3BvcnQnKTtcbiAgICBjb25zdCByb3dzSG9zdCA9IHF1ZXJ5PEhUTUxFbGVtZW50PignI3Zpc2libGUtcm93cycpO1xuICAgIGNvbnN0IGVtcHR5ID0gcXVlcnk8SFRNTEVsZW1lbnQ+KCcjZW1wdHknKTtcbiAgICBpZiAoIXZpZXdwb3J0IHx8ICFyb3dzSG9zdCB8fCAhZW1wdHkpIHJldHVybjtcblxuICAgIGVtcHR5LmhpZGRlbiA9IGZpbHRlcmVkUm93cy5sZW5ndGggPiAwO1xuICAgIGlmIChmaWx0ZXJlZFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJvd3NIb3N0LmlubmVySFRNTCA9ICcnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHZpZXdwb3J0LnNjcm9sbFRvcCAvIFJPV19IRUlHSFQpIC0gT1ZFUlNDQU4pO1xuICAgIGNvbnN0IHZpc2libGVDb3VudCA9IE1hdGguY2VpbCh2aWV3cG9ydC5jbGllbnRIZWlnaHQgLyBST1dfSEVJR0hUKSArIE9WRVJTQ0FOICogMjtcbiAgICBjb25zdCBlbmQgPSBNYXRoLm1pbihmaWx0ZXJlZFJvd3MubGVuZ3RoLCBzdGFydCArIHZpc2libGVDb3VudCk7XG4gICAgcm93c0hvc3Quc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZVkoJHtzdGFydCAqIFJPV19IRUlHSFR9cHgpYDtcbiAgICByb3dzSG9zdC5pbm5lckhUTUwgPSBmaWx0ZXJlZFJvd3Muc2xpY2Uoc3RhcnQsIGVuZCkubWFwKChyb3csIG9mZnNldCkgPT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IHN0YXJ0ICsgb2Zmc2V0O1xuICAgICAgICBjb25zdCBwYXRoID0gY29tcGFjdFBhdGgocm93LnBhdGgpO1xuICAgICAgICBjb25zdCB0eXBlTGFiZWwgPSByb3cuc2NyaXB0Um9sZSA9PT0gJ2dsb2JhbCcgPyBgJHtyb3cudHlwZX0gwrcgR2xvYmFsYCA6IHJvdy50eXBlO1xuICAgICAgICBpZiAoYWN0aXZlTW9kZSA9PT0gJ3JlZHVuZGFudCcpIHtcbiAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFzc2V0LXJvdyByZWR1bmRhbnQtcm93XCIgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCIgZGF0YS11dWlkPVwiJHtlc2NhcGVIdG1sKHJvdy51dWlkKX1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImFzc2V0LXBhdGhcIiB0aXRsZT1cIiR7ZXNjYXBlSHRtbChyb3cuZmlsZSB8fCByb3cucGF0aCl9XCIgZGF0YS1hY3Rpb249XCJyZXZlYWxcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYXNzZXQtbmFtZVwiPiR7ZXNjYXBlSHRtbChyb3cubmFtZSl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhc3NldC11cmxcIj4ke2VzY2FwZUh0bWwocGF0aCl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhc3NldC10eXBlXCIgdGl0bGU9XCIke2VzY2FwZUh0bWwodHlwZUxhYmVsKX1cIj4ke2VzY2FwZUh0bWwodHlwZUxhYmVsKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJsb2NhdGVcIiBkYXRhLWFjdGlvbj1cInJldmVhbFwiIHRpdGxlPVwi5ZyoIENyZWF0b3IgQXNzZXRzIOS4reWumuS9jVwiPuWumuS9jTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFzc2V0LXJvd1wiIGRhdGEtaW5kZXg9XCIke2luZGV4fVwiIGRhdGEtdXVpZD1cIiR7ZXNjYXBlSHRtbChyb3cudXVpZCl9XCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImFzc2V0LXBhdGhcIiB0aXRsZT1cIiR7ZXNjYXBlSHRtbChyb3cuZmlsZSB8fCByb3cucGF0aCl9XCIgZGF0YS1hY3Rpb249XCJyZXZlYWxcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhc3NldC1uYW1lXCI+JHtlc2NhcGVIdG1sKHJvdy5uYW1lKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYXNzZXQtdXJsXCI+JHtlc2NhcGVIdG1sKHBhdGgpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImFzc2V0LXR5cGVcIiB0aXRsZT1cIiR7ZXNjYXBlSHRtbCh0eXBlTGFiZWwpfVwiPiR7ZXNjYXBlSHRtbCh0eXBlTGFiZWwpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiY291bnQgZGVwZW5kZW5jeVwiIGRhdGEtYWN0aW9uPVwiZGV0YWlsXCIgdGl0bGU9XCLnm7TmjqXlvJXnlKggJHtyb3cuZGVwZW5kZW5jeUNvdW50fSDkuKrotYTmupBcIj4ke3Jvdy5kZXBlbmRlbmN5Q291bnR9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImNvdW50IHVzZXJcIiBkYXRhLWFjdGlvbj1cImRldGFpbFwiIHRpdGxlPVwi6KKrICR7cm93LnVzZXJDb3VudH0g5Liq6LWE5rqQ55u05o6l5byV55SoXCI+JHtyb3cudXNlckNvdW50fTwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGJpbmRFdmVudHMoKTogdm9pZCB7XG4gICAgY29uc3Qgdmlld3BvcnQgPSBxdWVyeTxIVE1MRWxlbWVudD4oJyNsaXN0LXZpZXdwb3J0Jyk7XG4gICAgY29uc3Qgc2VhcmNoID0gcXVlcnk8SFRNTElucHV0RWxlbWVudD4oJyNzZWFyY2gnKTtcbiAgICBjb25zdCByZWZyZXNoID0gcXVlcnk8SFRNTEJ1dHRvbkVsZW1lbnQ+KCcjcmVmcmVzaCcpO1xuICAgIGNvbnN0IHRvZ2dsZSA9IHF1ZXJ5PEhUTUxCdXR0b25FbGVtZW50PignI3RvZ2dsZS1lbmFibGVkJyk7XG4gICAgY29uc3Qgcm93c0hvc3QgPSBxdWVyeTxIVE1MRWxlbWVudD4oJyN2aXNpYmxlLXJvd3MnKTtcbiAgICBjb25zdCB1c2VTZWxlY3Rpb24gPSBxdWVyeTxIVE1MQnV0dG9uRWxlbWVudD4oJyN1c2Utc2VsZWN0aW9uJyk7XG4gICAgY29uc3QgY2xlYXJTY29wZSA9IHF1ZXJ5PEhUTUxCdXR0b25FbGVtZW50PignI2NsZWFyLXNjb3BlJyk7XG4gICAgY29uc3QgYnJlYWRjcnVtYiA9IHF1ZXJ5PEhUTUxFbGVtZW50PignI3Njb3BlLWJyZWFkY3J1bWInKTtcbiAgICBpZiAoIXZpZXdwb3J0IHx8ICFzZWFyY2ggfHwgIXJlZnJlc2ggfHwgIXRvZ2dsZSB8fCAhcm93c0hvc3QgfHwgIXVzZVNlbGVjdGlvbiB8fCAhY2xlYXJTY29wZSB8fCAhYnJlYWRjcnVtYikgcmV0dXJuO1xuXG4gICAgdmlld3BvcnQuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgcXVldWVSZW5kZXIsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgICBzZWFyY2guYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgIHNlYXJjaFRleHQgPSBzZWFyY2gudmFsdWU7XG4gICAgICAgIHVwZGF0ZUZpbHRlcih0cnVlKTtcbiAgICB9KTtcbiAgICByZWZyZXNoLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICBpZiAoIXNuYXBzaG90Py5lbmFibGVkKSByZXR1cm47XG4gICAgICAgIHJlZnJlc2guZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICB2b2lkIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRlcGVuZGVuY3ktdmlld2VyJywgJ3JlZnJlc2gnKVxuICAgICAgICAgICAgLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQXNzZXREZXBlbmRlbmN5Vmlld2VyXSBtYW51YWwgcmVmcmVzaCBmYWlsZWQ6JywgZXJyb3I/Lm1lc3NhZ2UgfHwgZXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gc25hcHNob3Q/LmVuYWJsZWQgPyAnZGlzYWJsZScgOiAnZW5hYmxlJztcbiAgICAgICAgdG9nZ2xlLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgdm9pZCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kZXBlbmRlbmN5LXZpZXdlcicsIG1lc3NhZ2UpXG4gICAgICAgICAgICAudGhlbigodmFsdWU6IERlcGVuZGVuY3lTbmFwc2hvdCkgPT4gYXBwbHlTbmFwc2hvdCh2YWx1ZSkpXG4gICAgICAgICAgICAuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICB0b2dnbGUuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtBc3NldERlcGVuZGVuY3lWaWV3ZXJdICR7bWVzc2FnZX0gZmFpbGVkOmAsIGVycm9yPy5tZXNzYWdlIHx8IGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHVzZVNlbGVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgdXNlU2VsZWN0aW9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgdm9pZCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kZXBlbmRlbmN5LXZpZXdlcicsICd1c2UtY3VycmVudC1zZWxlY3Rpb24nKVxuICAgICAgICAgICAgLnRoZW4oKHZhbHVlOiBzdHJpbmcpID0+IGFwcGx5U2NvcGUodmFsdWUpKVxuICAgICAgICAgICAgLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQXNzZXREZXBlbmRlbmN5Vmlld2VyXSB1c2UgY3VycmVudCBzZWxlY3Rpb24gZmFpbGVkOicsIGVycm9yPy5tZXNzYWdlIHx8IGVycm9yKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmluYWxseSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdXNlU2VsZWN0aW9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBjbGVhclNjb3BlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICB2b2lkIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRlcGVuZGVuY3ktdmlld2VyJywgJ3NldC1zY29wZScsICcnKVxuICAgICAgICAgICAgLnRoZW4oKHZhbHVlOiBzdHJpbmcpID0+IGFwcGx5U2NvcGUodmFsdWUpKTtcbiAgICB9KTtcbiAgICBicmVhZGNydW1iLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IGJ1dHRvbiA9IChldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQgfCBudWxsKT8uY2xvc2VzdDxIVE1MQnV0dG9uRWxlbWVudD4oJ2J1dHRvbltkYXRhLXNjb3BlXScpO1xuICAgICAgICBpZiAoIWJ1dHRvbikgcmV0dXJuO1xuICAgICAgICB2b2lkIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRlcGVuZGVuY3ktdmlld2VyJywgJ3NldC1zY29wZScsIGJ1dHRvbi5kYXRhc2V0LnNjb3BlIHx8ICcnKVxuICAgICAgICAgICAgLnRoZW4oKHZhbHVlOiBzdHJpbmcpID0+IGFwcGx5U2NvcGUodmFsdWUpKTtcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IGJ1dHRvbiBvZiBBcnJheS5mcm9tKHJvb3QoKT8ucXVlcnlTZWxlY3RvckFsbDxIVE1MQnV0dG9uRWxlbWVudD4oJ1tkYXRhLW1vZGVdJykgfHwgW10pKSB7XG4gICAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGFjdGl2ZU1vZGUgPSBidXR0b24uZGF0YXNldC5tb2RlIGFzIE92ZXJ2aWV3TW9kZTtcbiAgICAgICAgICAgIHVwZGF0ZUZpbHRlcih0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYnV0dG9uIG9mIEFycmF5LmZyb20ocm9vdCgpPy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxCdXR0b25FbGVtZW50PignW2RhdGEta2luZF0nKSB8fCBbXSkpIHtcbiAgICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgYWN0aXZlS2luZCA9IGJ1dHRvbi5kYXRhc2V0LmtpbmQgYXMgT3ZlcnZpZXdLaW5kO1xuICAgICAgICAgICAgdXBkYXRlRmlsdGVyKHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcm93c0hvc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgY29uc3QgYnV0dG9uID0gdGFyZ2V0Py5jbG9zZXN0PEhUTUxCdXR0b25FbGVtZW50PignYnV0dG9uW2RhdGEtYWN0aW9uXScpO1xuICAgICAgICBjb25zdCByb3dFbGVtZW50ID0gdGFyZ2V0Py5jbG9zZXN0PEhUTUxFbGVtZW50PignLmFzc2V0LXJvdycpO1xuICAgICAgICBpZiAoIXJvd0VsZW1lbnQpIHJldHVybjtcbiAgICAgICAgY29uc3Qgcm93ID0gZmlsdGVyZWRSb3dzW051bWJlcihyb3dFbGVtZW50LmRhdGFzZXQuaW5kZXgpXTtcbiAgICAgICAgaWYgKCFyb3cpIHJldHVybjtcblxuICAgICAgICBjb25zdCBhY3Rpb24gPSByZXNvbHZlT3ZlcnZpZXdSb3dBY3Rpb24oXG4gICAgICAgICAgICBhY3RpdmVNb2RlLFxuICAgICAgICAgICAgYnV0dG9uPy5kYXRhc2V0LmFjdGlvbiA9PT0gJ2RldGFpbCcgPyAnZGV0YWlsJyA6ICdyZXZlYWwnLFxuICAgICAgICApO1xuICAgICAgICBpZiAoYWN0aW9uID09PSAncmV2ZWFsJykge1xuICAgICAgICAgICAgdm9pZCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kZXBlbmRlbmN5LXZpZXdlcicsICdyZXZlYWwtYXNzZXQnLCByb3cudXVpZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFidXR0b24pIHJldHVybjtcblxuICAgICAgICBpZiAoYWN0aW9uID09PSAnZGV0YWlsJykge1xuICAgICAgICAgICAgdm9pZCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kZXBlbmRlbmN5LXZpZXdlcicsICdzaG93LWRldGFpbCcsIHJvdy51dWlkKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhcHBseVNuYXBzaG90KHZhbHVlOiBEZXBlbmRlbmN5U25hcHNob3QgfCBudWxsKTogdm9pZCB7XG4gICAgaWYgKHZhbHVlKSBzbmFwc2hvdCA9IHZhbHVlO1xuICAgIHVwZGF0ZUZpbHRlcihmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5U2NvcGUodmFsdWU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICBzY29wZVBhdGggPSBub3JtYWxpemVTY29wZVBhdGgodmFsdWUgfHwgJycpO1xuICAgIHVwZGF0ZUZpbHRlcih0cnVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcbiAgICB0ZW1wbGF0ZTogYFxuICAgICAgICA8c2VjdGlvbiBpZD1cInJvb3RcIj5cbiAgICAgICAgICAgIDxoZWFkZXIgY2xhc3M9XCJ0b29sYmFyXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IGlkPVwic2VhcmNoXCIgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwi5pCc57Si6LWE5rqQ6Lev5b6E5oiW57G75Z6LXCIgc3BlbGxjaGVjaz1cImZhbHNlXCIgLz5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGlkPVwicmVmcmVzaFwiIHRpdGxlPVwi5LuOIENyZWF0b3IgQXNzZXREQiDph43mlrDor7vlj5ZcIiBkaXNhYmxlZD7liLfmlrA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGlkPVwidG9nZ2xlLWVuYWJsZWRcIiBjbGFzcz1cInByaW1hcnlcIj7lvIDlkK/lip/og708L2J1dHRvbj5cbiAgICAgICAgICAgIDwvaGVhZGVyPlxuICAgICAgICAgICAgPG5hdiBjbGFzcz1cIm1vZGUtdG9nZ2xlc1wiIGFyaWEtbGFiZWw9XCLmn6XnnIvlpKfnsbtcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGRhdGEtbW9kZT1cInJlZmVyZW5jZXNcIiBjbGFzcz1cImFjdGl2ZVwiPui1hOa6kOW8leeUqCA8c3BhbiBpZD1cInJlZmVyZW5jZXMtY291bnRcIj4wPC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gZGF0YS1tb2RlPVwicmVkdW5kYW50XCI+5YaX5L2Z6LWE5rqQIDxzcGFuIGlkPVwicmVkdW5kYW50LWNvdW50XCI+MDwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICAgIDwvbmF2PlxuICAgICAgICAgICAgPG5hdiBjbGFzcz1cImtpbmQtdG9nZ2xlc1wiIGFyaWEtbGFiZWw9XCLotYTmupDnsbvlnotcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGRhdGEta2luZD1cInJlc291cmNlXCIgY2xhc3M9XCJhY3RpdmVcIj7otYTmupAgPHNwYW4gaWQ9XCJyZXNvdXJjZS1jb3VudFwiPjA8L3NwYW4+PC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBkYXRhLWtpbmQ9XCJzY3JpcHRcIj7ohJrmnKwgPHNwYW4gaWQ9XCJzY3JpcHQtY291bnRcIj4wPC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgICAgPC9uYXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic2NvcGUtYmFyXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzY29wZS1sYWJlbFwiPuiMg+WbtDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwic2NvcGUtYnJlYWRjcnVtYlwiIGNsYXNzPVwic2NvcGUtYnJlYWRjcnVtYlwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDxidXR0b24gaWQ9XCJ1c2Utc2VsZWN0aW9uXCIgdGl0bGU9XCLmlofku7blpLnkvb/nlKjoh6rouqvvvJvmlofku7bkvb/nlKjmiYDlnKjmlofku7blpLlcIj7kvb/nlKggQXNzZXRzIOW9k+WJjemAieaLqTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gaWQ9XCJjbGVhci1zY29wZVwiIGRpc2FibGVkPua4hemZpOiMg+WbtDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGlkPVwic3RhdHVzXCIgY2xhc3M9XCJzdGF0dXNcIj7nrYnlvoUgQXNzZXREQiDmlbDmja48L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsaXN0LWhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPui1hOa6kDwvc3Bhbj48c3Bhbj7nsbvlnos8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gaWQ9XCJkZXBlbmRlbmN5LWhlYWRlclwiIGNsYXNzPVwiZGVwZW5kZW5jeVwiPuW8leeUqDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBpZD1cInVzZXItaGVhZGVyXCIgY2xhc3M9XCJ1c2VyXCI+6KKr5byV55SoPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGlkPVwibG9jYXRlLWhlYWRlclwiIGNsYXNzPVwibG9jYXRlLWhlYWRlclwiIGhpZGRlbj7lrprkvY08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgaWQ9XCJsaXN0LXZpZXdwb3J0XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cImxpc3Qtc3BhY2VyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ2aXNpYmxlLXJvd3NcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiZW1wdHlcIiBoaWRkZW4+5rKh5pyJ5Yy56YWN55qE6aG555uu6LWE5rqQPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIGAsXG4gICAgc3R5bGU6IGBcbiAgICAgICAgOmhvc3QgeyBkaXNwbGF5OiBibG9jazsgaGVpZ2h0OiAxMDAlOyB9XG4gICAgICAgICogeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9XG4gICAgICAgICNyb290IHsgaGVpZ2h0OiAxMDAlOyBkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0KTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwpOyB9XG4gICAgICAgIC50b29sYmFyIHsgZGlzcGxheTogZmxleDsgZ2FwOiA4cHg7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgfVxuICAgICAgICAjc2VhcmNoIHsgZmxleDogMTsgbWluLXdpZHRoOiAwOyBoZWlnaHQ6IDI4cHg7IHBhZGRpbmc6IDAgOXB4OyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0KTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwtZW1waGFzaXMpOyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogNHB4OyBvdXRsaW5lOiBub25lOyB9XG4gICAgICAgICNzZWFyY2g6Zm9jdXMgeyBib3JkZXItY29sb3I6IHZhcigtLWNvbG9yLWZvY3VzLWJvcmRlcik7IH1cbiAgICAgICAgYnV0dG9uIHsgZm9udDogaW5oZXJpdDsgfVxuICAgICAgICAjcmVmcmVzaCB7IG1pbi13aWR0aDogNThweDsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdCk7IGJhY2tncm91bmQ6IHZhcigtLWNvbG9yLW5vcm1hbC1maWxsLWVtcGhhc2lzKTsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tY29sb3Itbm9ybWFsLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IDRweDsgY3Vyc29yOiBwb2ludGVyOyB9XG4gICAgICAgICNyZWZyZXNoOmhvdmVyOm5vdCg6ZGlzYWJsZWQpIHsgYm9yZGVyLWNvbG9yOiB2YXIoLS1jb2xvci1mb2N1cy1ib3JkZXIpOyB9XG4gICAgICAgICNyZWZyZXNoOmRpc2FibGVkIHsgb3BhY2l0eTogLjU7IGN1cnNvcjogZGVmYXVsdDsgfVxuICAgICAgICAjdG9nZ2xlLWVuYWJsZWQgeyBtaW4td2lkdGg6IDcycHg7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiAwOyBib3JkZXItcmFkaXVzOiA0cHg7IGN1cnNvcjogcG9pbnRlcjsgfVxuICAgICAgICAjdG9nZ2xlLWVuYWJsZWQucHJpbWFyeSB7IGJhY2tncm91bmQ6ICMzNDc4Yzc7IH1cbiAgICAgICAgI3RvZ2dsZS1lbmFibGVkLmRhbmdlciB7IGJhY2tncm91bmQ6ICNhODQ1NDU7IH1cbiAgICAgICAgI3RvZ2dsZS1lbmFibGVkOmhvdmVyOm5vdCg6ZGlzYWJsZWQpIHsgZmlsdGVyOiBicmlnaHRuZXNzKDEuMTIpOyB9XG4gICAgICAgICN0b2dnbGUtZW5hYmxlZDpkaXNhYmxlZCB7IG9wYWNpdHk6IC41OyBjdXJzb3I6IGRlZmF1bHQ7IH1cbiAgICAgICAgLm1vZGUtdG9nZ2xlcywgLmtpbmQtdG9nZ2xlcyB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBzdHJldGNoOyBwYWRkaW5nOiAwIDEwcHg7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwpOyB9XG4gICAgICAgIC5tb2RlLXRvZ2dsZXMgeyBtaW4taGVpZ2h0OiAzOHB4OyBnYXA6IDRweDsgfVxuICAgICAgICAua2luZC10b2dnbGVzIHsgbWluLWhlaWdodDogMzJweDsgZ2FwOiAycHg7IGJhY2tncm91bmQ6IHZhcigtLWNvbG9yLW5vcm1hbC1maWxsLWVtcGhhc2lzKTsgfVxuICAgICAgICAubW9kZS10b2dnbGVzIGJ1dHRvbiwgLmtpbmQtdG9nZ2xlcyBidXR0b24geyBwb3NpdGlvbjogcmVsYXRpdmU7IHBhZGRpbmc6IDAgMTRweDsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdC1lbXBoYXNpcyk7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBib3JkZXI6IDA7IGN1cnNvcjogcG9pbnRlcjsgfVxuICAgICAgICAubW9kZS10b2dnbGVzIGJ1dHRvbi5hY3RpdmUsIC5raW5kLXRvZ2dsZXMgYnV0dG9uLmFjdGl2ZSB7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QpOyBmb250LXdlaWdodDogNjAwOyB9XG4gICAgICAgIC5tb2RlLXRvZ2dsZXMgYnV0dG9uLmFjdGl2ZTo6YWZ0ZXIsIC5raW5kLXRvZ2dsZXMgYnV0dG9uLmFjdGl2ZTo6YWZ0ZXIgeyBjb250ZW50OiAnJzsgcG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiA4cHg7IHJpZ2h0OiA4cHg7IGJvdHRvbTogMDsgaGVpZ2h0OiAycHg7IGJhY2tncm91bmQ6IHZhcigtLWNvbG9yLWZvY3VzLWJvcmRlcik7IH1cbiAgICAgICAgLm1vZGUtdG9nZ2xlcyBzcGFuLCAua2luZC10b2dnbGVzIHNwYW4geyBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IG1pbi13aWR0aDogMjJweDsgbWFyZ2luLWxlZnQ6IDVweDsgcGFkZGluZzogMXB4IDVweDsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdCk7IGJhY2tncm91bmQ6IHZhcigtLWNvbG9yLW5vcm1hbC1maWxsLWVtcGhhc2lzKTsgYm9yZGVyLXJhZGl1czogOXB4OyBmb250LXNpemU6IDEwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsgfVxuICAgICAgICAua2luZC10b2dnbGVzIHNwYW4geyBiYWNrZ3JvdW5kOiB2YXIoLS1jb2xvci1ub3JtYWwtZmlsbCk7IH1cbiAgICAgICAgLnNjb3BlLWJhciB7IG1pbi1oZWlnaHQ6IDM0cHg7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogNnB4OyBwYWRkaW5nOiA0cHggMTBweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWNvbG9yLW5vcm1hbC1ib3JkZXIpOyBiYWNrZ3JvdW5kOiB2YXIoLS1jb2xvci1ub3JtYWwtZmlsbC1lbXBoYXNpcyk7IH1cbiAgICAgICAgLnNjb3BlLWxhYmVsIHsgZmxleDogMCAwIGF1dG87IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QtZW1waGFzaXMpOyBmb250LXNpemU6IDExcHg7IH1cbiAgICAgICAgLnNjb3BlLWJyZWFkY3J1bWIgeyBtaW4td2lkdGg6IDA7IGZsZXg6IDE7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IG92ZXJmbG93LXg6IGF1dG87IHdoaXRlLXNwYWNlOiBub3dyYXA7IH1cbiAgICAgICAgLnNjb3BlLWNydW1iIHsgZmxleDogMCAwIGF1dG87IHBhZGRpbmc6IDJweCA0cHg7IGNvbG9yOiB2YXIoLS1jb2xvci1mb2N1cy1jb250cmFzdCk7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBib3JkZXI6IDA7IGN1cnNvcjogcG9pbnRlcjsgfVxuICAgICAgICAuc2NvcGUtY3J1bWI6aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgfVxuICAgICAgICAuc2NvcGUtc2VwYXJhdG9yIHsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdC1lbXBoYXNpcyk7IH1cbiAgICAgICAgI3VzZS1zZWxlY3Rpb24sICNjbGVhci1zY29wZSB7IGZsZXg6IDAgMCBhdXRvOyBoZWlnaHQ6IDI0cHg7IHBhZGRpbmc6IDAgOHB4OyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0KTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwpOyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgICAgICAgI3VzZS1zZWxlY3Rpb246aG92ZXI6bm90KDpkaXNhYmxlZCksICNjbGVhci1zY29wZTpob3Zlcjpub3QoOmRpc2FibGVkKSB7IGJvcmRlci1jb2xvcjogdmFyKC0tY29sb3ItZm9jdXMtYm9yZGVyKTsgfVxuICAgICAgICAjdXNlLXNlbGVjdGlvbjpkaXNhYmxlZCwgI2NsZWFyLXNjb3BlOmRpc2FibGVkIHsgb3BhY2l0eTogLjU7IGN1cnNvcjogZGVmYXVsdDsgfVxuICAgICAgICAuc3RhdHVzIHsgbWluLWhlaWdodDogMjdweDsgcGFkZGluZzogNnB4IDEwcHg7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QtZW1waGFzaXMpOyBmb250LXNpemU6IDEycHg7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgb3ZlcmZsb3c6IGhpZGRlbjsgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7IH1cbiAgICAgICAgLnN0YXR1cy5yZWZyZXNoaW5nIHsgY29sb3I6IHZhcigtLWNvbG9yLWZvY3VzLWNvbnRyYXN0KTsgfVxuICAgICAgICAuc3RhdHVzLnN0YWxlIHsgY29sb3I6ICNlNmEyM2M7IH1cbiAgICAgICAgLnN0YXR1cy5kaXNhYmxlZCB7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QtZW1waGFzaXMpOyB9XG4gICAgICAgIC5saXN0LWhlYWRlciwgLmFzc2V0LXJvdyB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogbWlubWF4KDIyMHB4LCAxZnIpIDEyMHB4IDU0cHggNTRweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxuICAgICAgICAubGlzdC1oZWFkZXIgeyBtaW4taGVpZ2h0OiAyOHB4OyBwYWRkaW5nOiAwIDhweDsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdC1lbXBoYXNpcyk7IGZvbnQtc2l6ZTogMTJweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWNvbG9yLW5vcm1hbC1ib3JkZXIpOyBiYWNrZ3JvdW5kOiB2YXIoLS1jb2xvci1ub3JtYWwtZmlsbC1lbXBoYXNpcyk7IH1cbiAgICAgICAgLmxpc3QtaGVhZGVyIC5kZXBlbmRlbmN5LCAubGlzdC1oZWFkZXIgLnVzZXIgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cbiAgICAgICAgLmxvY2F0ZS1oZWFkZXIgeyBncmlkLWNvbHVtbjogMyAvIDU7IHRleHQtYWxpZ246IGNlbnRlcjsgfVxuICAgICAgICBbaGlkZGVuXSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuICAgICAgICAjbGlzdC12aWV3cG9ydCB7IHBvc2l0aW9uOiByZWxhdGl2ZTsgZmxleDogMTsgbWluLWhlaWdodDogMDsgb3ZlcmZsb3c6IGF1dG87IH1cbiAgICAgICAgI2xpc3Qtc3BhY2VyIHsgcG9zaXRpb246IHJlbGF0aXZlOyBtaW4td2lkdGg6IDUwMHB4OyB9XG4gICAgICAgICN2aXNpYmxlLXJvd3MgeyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgcmlnaHQ6IDA7IH1cbiAgICAgICAgLmFzc2V0LXJvdyB7IGhlaWdodDogJHtST1dfSEVJR0hUfXB4OyBwYWRkaW5nOiAwIDhweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKSA1NSUsIHRyYW5zcGFyZW50KTsgfVxuICAgICAgICAuYXNzZXQtcm93OmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tY29sb3ItaG92ZXItZmlsbCk7IH1cbiAgICAgICAgLnJlZHVuZGFudC1yb3cgeyBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgICAgICAgLmFzc2V0LXBhdGggeyBtaW4td2lkdGg6IDA7IGhlaWdodDogMTAwJTsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA4cHg7IHBhZGRpbmc6IDA7IGNvbG9yOiBpbmhlcml0OyB0ZXh0LWFsaWduOiBsZWZ0OyBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgYm9yZGVyOiAwOyBjdXJzb3I6IHBvaW50ZXI7IG92ZXJmbG93OiBoaWRkZW47IH1cbiAgICAgICAgLmFzc2V0LW5hbWUgeyBmbGV4OiAwIDAgYXV0bzsgbWF4LXdpZHRoOiAzNiU7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4gICAgICAgIC5hc3NldC11cmwgeyBtaW4td2lkdGg6IDA7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QtZW1waGFzaXMpOyBmb250LXNpemU6IDExcHg7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4gICAgICAgIC5hc3NldC1wYXRoOmhvdmVyIC5hc3NldC1uYW1lIHsgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7IH1cbiAgICAgICAgLmFzc2V0LXR5cGUgeyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0LWVtcGhhc2lzKTsgZm9udC1zaXplOiAxMXB4OyBvdmVyZmxvdzogaGlkZGVuOyB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuICAgICAgICAuY291bnQgeyBqdXN0aWZ5LXNlbGY6IGNlbnRlcjsgbWluLXdpZHRoOiAzMnB4OyBoZWlnaHQ6IDIycHg7IHBhZGRpbmc6IDAgN3B4OyBjb2xvcjogd2hpdGU7IGJvcmRlcjogMDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cbiAgICAgICAgLmNvdW50LmRlcGVuZGVuY3kgeyBiYWNrZ3JvdW5kOiAjYjg0NTQ1OyB9XG4gICAgICAgIC5jb3VudC51c2VyIHsgYmFja2dyb3VuZDogIzNhOGY1NzsgfVxuICAgICAgICAuY291bnQ6aG92ZXIgeyBmaWx0ZXI6IGJyaWdodG5lc3MoMS4xNik7IH1cbiAgICAgICAgLmxvY2F0ZSB7IGdyaWQtY29sdW1uOiAzIC8gNTsganVzdGlmeS1zZWxmOiBjZW50ZXI7IG1pbi13aWR0aDogNjRweDsgaGVpZ2h0OiAyMnB4OyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0KTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwtZW1waGFzaXMpOyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgICAgICAgLmxvY2F0ZTpob3ZlciB7IGJvcmRlci1jb2xvcjogdmFyKC0tY29sb3ItZm9jdXMtYm9yZGVyKTsgfVxuICAgICAgICAjZW1wdHkgeyBwb3NpdGlvbjogYWJzb2x1dGU7IGluc2V0OiAwOyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdC1lbXBoYXNpcyk7IH1cbiAgICAgICAgI2VtcHR5W2hpZGRlbl0geyBkaXNwbGF5OiBub25lOyB9XG4gICAgYCxcbiAgICAkOiB7XG4gICAgICAgIHJvb3Q6ICcjcm9vdCcsXG4gICAgfSxcbiAgICByZWFkeSh0aGlzOiBQYW5lbEluc3RhbmNlKSB7XG4gICAgICAgIGJpbmRQYW5lbFJvb3QodGhpcyk7XG4gICAgICAgIGJpbmRFdmVudHMoKTtcbiAgICAgICAgdm9pZCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kZXBlbmRlbmN5LXZpZXdlcicsICdyZXF1ZXN0LXNuYXBzaG90JyksXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kZXBlbmRlbmN5LXZpZXdlcicsICdyZXF1ZXN0LXNjb3BlJyksXG4gICAgICAgIF0pLnRoZW4oKFt2YWx1ZSwgY3VycmVudFNjb3BlXTogW0RlcGVuZGVuY3lTbmFwc2hvdCwgc3RyaW5nXSkgPT4ge1xuICAgICAgICAgICAgc2NvcGVQYXRoID0gbm9ybWFsaXplU2NvcGVQYXRoKGN1cnJlbnRTY29wZSB8fCAnJyk7XG4gICAgICAgICAgICBhcHBseVNuYXBzaG90KHZhbHVlKTtcbiAgICAgICAgfSkuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW0Fzc2V0RGVwZW5kZW5jeVZpZXdlcl0gcmVxdWVzdCBpbml0aWFsIHN0YXRlIGZhaWxlZDonLCBlcnJvcj8ubWVzc2FnZSB8fCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgbGlzdGVuZXJzOiB7XG4gICAgICAgIHJlc2l6ZSgpIHtcbiAgICAgICAgICAgIHF1ZXVlUmVuZGVyKCk7XG4gICAgICAgIH0sXG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG4gICAgICAgIHNldFNuYXBzaG90KHRoaXM6IFBhbmVsSW5zdGFuY2UsIHZhbHVlOiBEZXBlbmRlbmN5U25hcHNob3QpIHtcbiAgICAgICAgICAgIGJpbmRQYW5lbFJvb3QodGhpcyk7XG4gICAgICAgICAgICBhcHBseVNuYXBzaG90KHZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0U2NvcGUodGhpczogUGFuZWxJbnN0YW5jZSwgdmFsdWU6IHN0cmluZykge1xuICAgICAgICAgICAgYmluZFBhbmVsUm9vdCh0aGlzKTtcbiAgICAgICAgICAgIGFwcGx5U2NvcGUodmFsdWUpO1xuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiJdfQ==
import { AssetDependencyRow, DependencySnapshot } from '../types';
import {
    filterOverviewRows,
    getOverviewCounts,
    OverviewKind,
    OverviewMode,
    resolveOverviewRowAction,
} from '../overview-filter';
import { filterRowsByScope, normalizeScopePath } from '../scope-utils';

export {};

const ROW_HEIGHT = 32;
const OVERSCAN = 8;

type PanelInstance = {
    $?: Record<string, HTMLElement | null>;
};

let panelRoot: HTMLElement | null = null;
let snapshot: DependencySnapshot | null = null;
let filteredRows: AssetDependencyRow[] = [];
let searchText = '';
let renderQueued = false;
let activeMode: OverviewMode = 'references';
let activeKind: OverviewKind = 'resource';
let scopePath = '';

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function bindPanelRoot(panel?: PanelInstance): void {
    const root = panel?.$?.root;
    if (root) panelRoot = root;
}

function root(): HTMLElement | null {
    if (panelRoot?.isConnected) return panelRoot;
    panelRoot = document.querySelector<HTMLElement>('#root');
    return panelRoot;
}

function query<T extends Element>(selector: string): T | null {
    return root()?.querySelector<T>(selector) || null;
}

function compactPath(path: string): string {
    return path.replace(/^db:\/\/assets\/?/, 'assets/');
}

function scopedRows(): AssetDependencyRow[] {
    return filterRowsByScope(snapshot?.rows || [], scopePath);
}

function renderScope(): void {
    const breadcrumb = query<HTMLElement>('#scope-breadcrumb');
    const clear = query<HTMLButtonElement>('#clear-scope');
    if (!breadcrumb || !clear) return;

    const normalized = normalizeScopePath(scopePath);
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

function updateFilter(resetScroll = false): void {
    const source = scopedRows();
    filteredRows = filterOverviewRows(source, activeMode, activeKind, searchText);

    const spacer = query<HTMLElement>('#list-spacer');
    if (spacer) spacer.style.height = `${filteredRows.length * ROW_HEIGHT}px`;
    if (resetScroll) {
        const viewport = query<HTMLElement>('#list-viewport');
        if (viewport) viewport.scrollTop = 0;
    }
    renderScope();
    updateToggles();
    renderVisibleRows();
    updateStatus();
}

function updateToggles(): void {
    const counts = getOverviewCounts(scopedRows());
    const referenceTotal = counts.references.resource + counts.references.script;
    const redundantTotal = counts.redundant.resource + counts.redundant.script;

    for (const button of Array.from(root()?.querySelectorAll<HTMLButtonElement>('[data-mode]') || [])) {
        button.classList.toggle('active', button.dataset.mode === activeMode);
    }
    for (const button of Array.from(root()?.querySelectorAll<HTMLButtonElement>('[data-kind]') || [])) {
        button.classList.toggle('active', button.dataset.kind === activeKind);
    }

    const referenceCount = query<HTMLElement>('#references-count');
    const redundantCount = query<HTMLElement>('#redundant-count');
    const resourceCount = query<HTMLElement>('#resource-count');
    const scriptCount = query<HTMLElement>('#script-count');
    if (referenceCount) referenceCount.textContent = String(referenceTotal);
    if (redundantCount) redundantCount.textContent = String(redundantTotal);
    if (resourceCount) resourceCount.textContent = String(counts[activeMode].resource);
    if (scriptCount) scriptCount.textContent = String(counts[activeMode].script);

    const dependencyHeader = query<HTMLElement>('#dependency-header');
    const userHeader = query<HTMLElement>('#user-header');
    const locateHeader = query<HTMLElement>('#locate-header');
    if (dependencyHeader) dependencyHeader.hidden = activeMode === 'redundant';
    if (userHeader) userHeader.hidden = activeMode === 'redundant';
    if (locateHeader) locateHeader.hidden = activeMode !== 'redundant';

    const empty = query<HTMLElement>('#empty');
    if (empty) {
        const modeText = activeMode === 'redundant' ? '冗余' : '';
        const kindText = activeKind === 'script' ? '脚本' : '资源';
        empty.textContent = `没有匹配的${modeText}${kindText}`;
    }
}

function updateStatus(): void {
    const status = query<HTMLElement>('#status');
    const refreshButton = query<HTMLButtonElement>('#refresh');
    const toggleButton = query<HTMLButtonElement>('#toggle-enabled');
    if (!status) return;

    if (!snapshot) {
        status.textContent = '等待 AssetDB 数据';
        status.className = 'status';
        return;
    }

    if (refreshButton) refreshButton.disabled = !snapshot.enabled || snapshot.refreshing;
    if (toggleButton) {
        toggleButton.disabled = snapshot.refreshing;
        toggleButton.textContent = snapshot.enabled ? '关闭功能' : '开启功能';
        toggleButton.className = snapshot.enabled ? 'danger' : 'primary';
    }
    const visible = filteredRows.length;
    const counts = getOverviewCounts(scopedRows());
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
    } else if (snapshot.refreshing) {
        status.textContent = `正在刷新… ${scopeText} · ${modeText} / ${kindText} ${visible}/${total}`;
        status.className = 'status refreshing';
    } else if (snapshot.stale) {
        status.textContent = `数据可能不完整：${snapshot.error || 'AssetDB 查询失败'}`;
        status.className = 'status stale';
    } else {
        const source = snapshot.fromCache ? '缓存' : time;
        status.textContent = `${scopeText} · ${modeText} / ${kindText} · ${visible}/${total} · ${snapshot.edgeCount} 条全项目直接关系 · ${source}`;
        status.className = 'status';
    }
}

function queueRender(): void {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderVisibleRows();
    });
}

function renderVisibleRows(): void {
    const viewport = query<HTMLElement>('#list-viewport');
    const rowsHost = query<HTMLElement>('#visible-rows');
    const empty = query<HTMLElement>('#empty');
    if (!viewport || !rowsHost || !empty) return;

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

function bindEvents(): void {
    const viewport = query<HTMLElement>('#list-viewport');
    const search = query<HTMLInputElement>('#search');
    const refresh = query<HTMLButtonElement>('#refresh');
    const toggle = query<HTMLButtonElement>('#toggle-enabled');
    const rowsHost = query<HTMLElement>('#visible-rows');
    const useSelection = query<HTMLButtonElement>('#use-selection');
    const clearScope = query<HTMLButtonElement>('#clear-scope');
    const breadcrumb = query<HTMLElement>('#scope-breadcrumb');
    if (!viewport || !search || !refresh || !toggle || !rowsHost || !useSelection || !clearScope || !breadcrumb) return;

    viewport.addEventListener('scroll', queueRender, { passive: true });
    search.addEventListener('input', () => {
        searchText = search.value;
        updateFilter(true);
    });
    refresh.addEventListener('click', () => {
        if (!snapshot?.enabled) return;
        refresh.disabled = true;
        void Editor.Message.request('asset-dependency-viewer', 'refresh')
            .catch((error: any) => {
                console.warn('[AssetDependencyViewer] manual refresh failed:', error?.message || error);
            });
    });
    toggle.addEventListener('click', () => {
        const message = snapshot?.enabled ? 'disable' : 'enable';
        toggle.disabled = true;
        void Editor.Message.request('asset-dependency-viewer', message)
            .then((value: DependencySnapshot) => applySnapshot(value))
            .catch((error: any) => {
                toggle.disabled = false;
                console.warn(`[AssetDependencyViewer] ${message} failed:`, error?.message || error);
            });
    });
    useSelection.addEventListener('click', () => {
        useSelection.disabled = true;
        void Editor.Message.request('asset-dependency-viewer', 'use-current-selection')
            .then((value: string) => applyScope(value))
            .catch((error: any) => {
                console.warn('[AssetDependencyViewer] use current selection failed:', error?.message || error);
            })
            .finally(() => {
                useSelection.disabled = false;
            });
    });
    clearScope.addEventListener('click', () => {
        void Editor.Message.request('asset-dependency-viewer', 'set-scope', '')
            .then((value: string) => applyScope(value));
    });
    breadcrumb.addEventListener('click', (event) => {
        const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button[data-scope]');
        if (!button) return;
        void Editor.Message.request('asset-dependency-viewer', 'set-scope', button.dataset.scope || '')
            .then((value: string) => applyScope(value));
    });
    for (const button of Array.from(root()?.querySelectorAll<HTMLButtonElement>('[data-mode]') || [])) {
        button.addEventListener('click', () => {
            activeMode = button.dataset.mode as OverviewMode;
            updateFilter(true);
        });
    }
    for (const button of Array.from(root()?.querySelectorAll<HTMLButtonElement>('[data-kind]') || [])) {
        button.addEventListener('click', () => {
            activeKind = button.dataset.kind as OverviewKind;
            updateFilter(true);
        });
    }
    rowsHost.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest<HTMLButtonElement>('button[data-action]');
        const rowElement = target?.closest<HTMLElement>('.asset-row');
        if (!rowElement) return;
        const row = filteredRows[Number(rowElement.dataset.index)];
        if (!row) return;

        const action = resolveOverviewRowAction(
            activeMode,
            button?.dataset.action === 'detail' ? 'detail' : 'reveal',
        );
        if (action === 'reveal') {
            void Editor.Message.request('asset-dependency-viewer', 'reveal-asset', row.uuid);
            return;
        }
        if (!button) return;

        if (action === 'detail') {
            void Editor.Message.request('asset-dependency-viewer', 'show-detail', row.uuid);
        }
    });
}

function applySnapshot(value: DependencySnapshot | null): void {
    if (value) snapshot = value;
    updateFilter(false);
}

function applyScope(value: string | null | undefined): void {
    scopePath = normalizeScopePath(value || '');
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
    ready(this: PanelInstance) {
        bindPanelRoot(this);
        bindEvents();
        void Promise.all([
            Editor.Message.request('asset-dependency-viewer', 'request-snapshot'),
            Editor.Message.request('asset-dependency-viewer', 'request-scope'),
        ]).then(([value, currentScope]: [DependencySnapshot, string]) => {
            scopePath = normalizeScopePath(currentScope || '');
            applySnapshot(value);
        }).catch((error: any) => {
            console.warn('[AssetDependencyViewer] request initial state failed:', error?.message || error);
        });
    },
    listeners: {
        resize() {
            queueRender();
        },
    },
    methods: {
        setSnapshot(this: PanelInstance, value: DependencySnapshot) {
            bindPanelRoot(this);
            applySnapshot(value);
        },
        setScope(this: PanelInstance, value: string) {
            bindPanelRoot(this);
            applyScope(value);
        },
    },
});

import { AssetLink, DetailView } from '../types';

export {};

const ROW_HEIGHT = 34;
const OVERSCAN = 6;

type Side = 'dependencies' | 'users';
type PanelInstance = { $?: Record<string, HTMLElement | null> };

let panelRoot: HTMLElement | null = null;
let detail: DetailView | null = null;
const queued = new Set<Side>();

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function bindPanelRoot(panel?: PanelInstance): void {
    const value = panel?.$?.root;
    if (value) panelRoot = value;
}

function root(): HTMLElement | null {
    if (panelRoot?.isConnected) return panelRoot;
    panelRoot = document.querySelector<HTMLElement>('#root');
    return panelRoot;
}

function query<T extends Element>(selector: string): T | null {
    return root()?.querySelector<T>(selector) || null;
}

function getLinks(side: Side): AssetLink[] {
    return detail?.[side] || [];
}

function queueRender(side: Side): void {
    if (queued.has(side)) return;
    queued.add(side);
    requestAnimationFrame(() => {
        queued.delete(side);
        renderSide(side);
    });
}

function renderSide(side: Side): void {
    const links = getLinks(side);
    const viewport = query<HTMLElement>(`#${side}-viewport`);
    const spacer = query<HTMLElement>(`#${side}-spacer`);
    const host = query<HTMLElement>(`#${side}-rows`);
    const empty = query<HTMLElement>(`#${side}-empty`);
    const count = query<HTMLElement>(`#${side}-count`);
    if (!viewport || !spacer || !host || !empty || !count) return;

    count.textContent = String(links.length);
    spacer.style.height = `${links.length * ROW_HEIGHT}px`;
    empty.hidden = links.length > 0;
    if (links.length === 0) {
        host.innerHTML = '';
        return;
    }

    const start = Math.max(0, Math.floor(viewport.scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(viewport.clientHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(links.length, start + visibleCount);
    host.style.transform = `translateY(${start * ROW_HEIGHT}px)`;
    host.innerHTML = links.slice(start, end).map((link, offset) => `
        <button class="link-row" data-side="${side}" data-index="${start + offset}" title="${escapeHtml(link.file || link.path)}">
            <span class="link-name">${escapeHtml(link.name)}</span>
            <span class="link-path">${escapeHtml(link.path)}</span>
            <span class="link-type">${escapeHtml(link.type)}</span>
        </button>
    `).join('');
}

function renderDetail(value?: DetailView | null): void {
    if (value !== undefined) detail = value;
    const title = query<HTMLButtonElement>('#current-asset');
    if (title) {
        if (detail) {
            title.disabled = false;
            title.dataset.uuid = detail.asset.uuid;
            title.innerHTML = `
                <strong>${escapeHtml(detail.asset.name)}</strong>
                <code>${escapeHtml(detail.asset.path)}</code>
            `;
            title.title = detail.asset.file || detail.asset.path;
        } else {
            title.disabled = true;
            title.dataset.uuid = '';
            title.textContent = '请选择资源查看直接引用关系';
        }
    }

    renderSide('dependencies');
    renderSide('users');
}

function bindEvents(): void {
    for (const side of ['dependencies', 'users'] as Side[]) {
        const viewport = query<HTMLElement>(`#${side}-viewport`);
        const host = query<HTMLElement>(`#${side}-rows`);
        viewport?.addEventListener('scroll', () => queueRender(side), { passive: true });
        host?.addEventListener('click', (event) => {
            const target = event.target as HTMLElement | null;
            const button = target?.closest<HTMLButtonElement>('.link-row');
            if (!button) return;
            const index = Number(button.dataset.index);
            const link = getLinks(side)[index];
            if (link) void Editor.Message.request('asset-dependency-viewer', 'reveal-asset', link.uuid);
        });
    }

    query<HTMLButtonElement>('#current-asset')?.addEventListener('click', (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        if (button.dataset.uuid) {
            void Editor.Message.request('asset-dependency-viewer', 'reveal-asset', button.dataset.uuid);
        }
    });
}

module.exports = Editor.Panel.define({
    template: `
        <section id="root">
            <header class="asset-header">
                <span>当前资源</span>
                <button id="current-asset" disabled>请选择资源查看直接引用关系</button>
            </header>
            <main class="columns">
                <section class="column dependency-column">
                    <h2>引用的资源 <span id="dependencies-count">0</span></h2>
                    <div id="dependencies-viewport" class="viewport">
                        <div id="dependencies-spacer" class="spacer"><div id="dependencies-rows" class="rows"></div></div>
                        <div id="dependencies-empty" class="empty">没有直接引用项目资源</div>
                    </div>
                </section>
                <section class="column user-column">
                    <h2>被以下资源引用 <span id="users-count">0</span></h2>
                    <div id="users-viewport" class="viewport">
                        <div id="users-spacer" class="spacer"><div id="users-rows" class="rows"></div></div>
                        <div id="users-empty" class="empty">没有项目资源直接引用它</div>
                    </div>
                </section>
            </main>
        </section>
    `,
    style: `
        :host { display: block; height: 100%; }
        * { box-sizing: border-box; }
        #root { height: 100%; display: flex; flex-direction: column; color: var(--color-normal-contrast); background: var(--color-normal-fill); }
        .asset-header { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-normal-border); color: var(--color-normal-contrast-emphasis); }
        #current-asset { min-width: 0; display: flex; align-items: baseline; gap: 12px; padding: 8px 10px; color: var(--color-normal-contrast); text-align: left; background: var(--color-normal-fill-emphasis); border: 1px solid var(--color-normal-border); border-radius: 4px; cursor: pointer; overflow: hidden; }
        #current-asset:hover:not(:disabled) { border-color: var(--color-focus-border); }
        #current-asset:disabled { cursor: default; opacity: .7; }
        #current-asset strong { flex: 0 0 auto; }
        #current-asset code { min-width: 0; color: var(--color-normal-contrast-emphasis); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .columns { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--color-normal-border); }
        .column { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--color-normal-fill); }
        .column h2 { height: 40px; margin: 0; padding: 11px 14px; font-size: 14px; border-bottom: 1px solid var(--color-normal-border); }
        .dependency-column h2 { color: #e16c6c; }
        .user-column h2 { color: #62b97c; }
        .column h2 span { display: inline-block; min-width: 26px; margin-left: 6px; text-align: center; color: white; border-radius: 10px; font-size: 11px; }
        .dependency-column h2 span { background: #b84545; }
        .user-column h2 span { background: #3a8f57; }
        .viewport { position: relative; flex: 1; min-height: 0; overflow: auto; }
        .spacer { position: relative; min-width: 420px; }
        .rows { position: absolute; top: 0; left: 0; right: 0; }
        .link-row { width: 100%; height: ${ROW_HEIGHT}px; display: grid; grid-template-columns: minmax(90px, 26%) minmax(160px, 1fr) 90px; align-items: center; gap: 8px; padding: 0 10px; color: var(--color-normal-contrast); text-align: left; background: transparent; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--color-normal-border) 55%, transparent); cursor: pointer; }
        .link-row:hover { background: var(--color-hover-fill); }
        .link-name, .link-path, .link-type { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .link-path, .link-type { color: var(--color-normal-contrast-emphasis); font-size: 11px; }
        .link-row:hover .link-path { text-decoration: underline; }
        .empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--color-normal-contrast-emphasis); }
        .empty[hidden] { display: none; }
    `,
    $: {
        root: '#root',
    },
    ready(this: PanelInstance) {
        bindPanelRoot(this);
        bindEvents();
        void Editor.Message.request('asset-dependency-viewer', 'request-detail')
            .then((value: DetailView | null) => renderDetail(value))
            .catch((error: any) => {
                console.warn('[AssetDependencyViewer] request detail failed:', error?.message || error);
            });
    },
    listeners: {
        resize() {
            queueRender('dependencies');
            queueRender('users');
        },
    },
    methods: {
        setDetail(this: PanelInstance, value: DetailView) {
            bindPanelRoot(this);
            renderDetail(value);
        },
    },
});

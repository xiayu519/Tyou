"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ROW_HEIGHT = 34;
const OVERSCAN = 6;
let panelRoot = null;
let detail = null;
const queued = new Set();
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
    const value = (_a = panel === null || panel === void 0 ? void 0 : panel.$) === null || _a === void 0 ? void 0 : _a.root;
    if (value)
        panelRoot = value;
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
function getLinks(side) {
    return (detail === null || detail === void 0 ? void 0 : detail[side]) || [];
}
function queueRender(side) {
    if (queued.has(side))
        return;
    queued.add(side);
    requestAnimationFrame(() => {
        queued.delete(side);
        renderSide(side);
    });
}
function renderSide(side) {
    const links = getLinks(side);
    const viewport = query(`#${side}-viewport`);
    const spacer = query(`#${side}-spacer`);
    const host = query(`#${side}-rows`);
    const empty = query(`#${side}-empty`);
    const count = query(`#${side}-count`);
    if (!viewport || !spacer || !host || !empty || !count)
        return;
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
function renderDetail(value) {
    if (value !== undefined)
        detail = value;
    const title = query('#current-asset');
    if (title) {
        if (detail) {
            title.disabled = false;
            title.dataset.uuid = detail.asset.uuid;
            title.innerHTML = `
                <strong>${escapeHtml(detail.asset.name)}</strong>
                <code>${escapeHtml(detail.asset.path)}</code>
            `;
            title.title = detail.asset.file || detail.asset.path;
        }
        else {
            title.disabled = true;
            title.dataset.uuid = '';
            title.textContent = '请选择资源查看直接引用关系';
        }
    }
    renderSide('dependencies');
    renderSide('users');
}
function bindEvents() {
    var _a;
    for (const side of ['dependencies', 'users']) {
        const viewport = query(`#${side}-viewport`);
        const host = query(`#${side}-rows`);
        viewport === null || viewport === void 0 ? void 0 : viewport.addEventListener('scroll', () => queueRender(side), { passive: true });
        host === null || host === void 0 ? void 0 : host.addEventListener('click', (event) => {
            const target = event.target;
            const button = target === null || target === void 0 ? void 0 : target.closest('.link-row');
            if (!button)
                return;
            const index = Number(button.dataset.index);
            const link = getLinks(side)[index];
            if (link)
                void Editor.Message.request('asset-dependency-viewer', 'reveal-asset', link.uuid);
        });
    }
    (_a = query('#current-asset')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', (event) => {
        const button = event.currentTarget;
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
    ready() {
        bindPanelRoot(this);
        bindEvents();
        void Editor.Message.request('asset-dependency-viewer', 'request-detail')
            .then((value) => renderDetail(value))
            .catch((error) => {
            console.warn('[AssetDependencyViewer] request detail failed:', (error === null || error === void 0 ? void 0 : error.message) || error);
        });
    },
    listeners: {
        resize() {
            queueRender('dependencies');
            queueRender('users');
        },
    },
    methods: {
        setDetail(value) {
            bindPanelRoot(this);
            renderDetail(value);
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0YWlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3BhbmVscy9kZXRhaWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFJQSxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBS25CLElBQUksU0FBUyxHQUF1QixJQUFJLENBQUM7QUFDekMsSUFBSSxNQUFNLEdBQXNCLElBQUksQ0FBQztBQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBUSxDQUFDO0FBRS9CLFNBQVMsVUFBVSxDQUFDLEtBQWM7SUFDOUIsT0FBTyxNQUFNLENBQUMsS0FBSyxhQUFMLEtBQUssY0FBTCxLQUFLLEdBQUksRUFBRSxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQXFCOztJQUN4QyxNQUFNLEtBQUssR0FBRyxNQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxDQUFDLDBDQUFFLElBQUksQ0FBQztJQUM3QixJQUFJLEtBQUs7UUFBRSxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQ2pDLENBQUM7QUFFRCxTQUFTLElBQUk7SUFDVCxJQUFJLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxXQUFXO1FBQUUsT0FBTyxTQUFTLENBQUM7SUFDN0MsU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQWMsT0FBTyxDQUFDLENBQUM7SUFDekQsT0FBTyxTQUFTLENBQUM7QUFDckIsQ0FBQztBQUVELFNBQVMsS0FB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QUFDO1lBQ3BCLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixDQUFDO0tBQ0o7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBc3NldExpbmssIERldGFpbFZpZXcgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCB7fTtcblxuY29uc3QgUk9XX0hFSUdIVCA9IDM0O1xuY29uc3QgT1ZFUlNDQU4gPSA2O1xuXG50eXBlIFNpZGUgPSAnZGVwZW5kZW5jaWVzJyB8ICd1c2Vycyc7XG50eXBlIFBhbmVsSW5zdGFuY2UgPSB7ICQ/OiBSZWNvcmQ8c3RyaW5nLCBIVE1MRWxlbWVudCB8IG51bGw+IH07XG5cbmxldCBwYW5lbFJvb3Q6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5sZXQgZGV0YWlsOiBEZXRhaWxWaWV3IHwgbnVsbCA9IG51bGw7XG5jb25zdCBxdWV1ZWQgPSBuZXcgU2V0PFNpZGU+KCk7XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwodmFsdWU6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBTdHJpbmcodmFsdWUgPz8gJycpXG4gICAgICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG4gICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpO1xufVxuXG5mdW5jdGlvbiBiaW5kUGFuZWxSb290KHBhbmVsPzogUGFuZWxJbnN0YW5jZSk6IHZvaWQge1xuICAgIGNvbnN0IHZhbHVlID0gcGFuZWw/LiQ/LnJvb3Q7XG4gICAgaWYgKHZhbHVlKSBwYW5lbFJvb3QgPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gcm9vdCgpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChwYW5lbFJvb3Q/LmlzQ29ubmVjdGVkKSByZXR1cm4gcGFuZWxSb290O1xuICAgIHBhbmVsUm9vdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCcjcm9vdCcpO1xuICAgIHJldHVybiBwYW5lbFJvb3Q7XG59XG5cbmZ1bmN0aW9uIHF1ZXJ5PFQgZXh0ZW5kcyBFbGVtZW50PihzZWxlY3Rvcjogc3RyaW5nKTogVCB8IG51bGwge1xuICAgIHJldHVybiByb290KCk/LnF1ZXJ5U2VsZWN0b3I8VD4oc2VsZWN0b3IpIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldExpbmtzKHNpZGU6IFNpZGUpOiBBc3NldExpbmtbXSB7XG4gICAgcmV0dXJuIGRldGFpbD8uW3NpZGVdIHx8IFtdO1xufVxuXG5mdW5jdGlvbiBxdWV1ZVJlbmRlcihzaWRlOiBTaWRlKTogdm9pZCB7XG4gICAgaWYgKHF1ZXVlZC5oYXMoc2lkZSkpIHJldHVybjtcbiAgICBxdWV1ZWQuYWRkKHNpZGUpO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIHF1ZXVlZC5kZWxldGUoc2lkZSk7XG4gICAgICAgIHJlbmRlclNpZGUoc2lkZSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNpZGUoc2lkZTogU2lkZSk6IHZvaWQge1xuICAgIGNvbnN0IGxpbmtzID0gZ2V0TGlua3Moc2lkZSk7XG4gICAgY29uc3Qgdmlld3BvcnQgPSBxdWVyeTxIVE1MRWxlbWVudD4oYCMke3NpZGV9LXZpZXdwb3J0YCk7XG4gICAgY29uc3Qgc3BhY2VyID0gcXVlcnk8SFRNTEVsZW1lbnQ+KGAjJHtzaWRlfS1zcGFjZXJgKTtcbiAgICBjb25zdCBob3N0ID0gcXVlcnk8SFRNTEVsZW1lbnQ+KGAjJHtzaWRlfS1yb3dzYCk7XG4gICAgY29uc3QgZW1wdHkgPSBxdWVyeTxIVE1MRWxlbWVudD4oYCMke3NpZGV9LWVtcHR5YCk7XG4gICAgY29uc3QgY291bnQgPSBxdWVyeTxIVE1MRWxlbWVudD4oYCMke3NpZGV9LWNvdW50YCk7XG4gICAgaWYgKCF2aWV3cG9ydCB8fCAhc3BhY2VyIHx8ICFob3N0IHx8ICFlbXB0eSB8fCAhY291bnQpIHJldHVybjtcblxuICAgIGNvdW50LnRleHRDb250ZW50ID0gU3RyaW5nKGxpbmtzLmxlbmd0aCk7XG4gICAgc3BhY2VyLnN0eWxlLmhlaWdodCA9IGAke2xpbmtzLmxlbmd0aCAqIFJPV19IRUlHSFR9cHhgO1xuICAgIGVtcHR5LmhpZGRlbiA9IGxpbmtzLmxlbmd0aCA+IDA7XG4gICAgaWYgKGxpbmtzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBob3N0LmlubmVySFRNTCA9ICcnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHZpZXdwb3J0LnNjcm9sbFRvcCAvIFJPV19IRUlHSFQpIC0gT1ZFUlNDQU4pO1xuICAgIGNvbnN0IHZpc2libGVDb3VudCA9IE1hdGguY2VpbCh2aWV3cG9ydC5jbGllbnRIZWlnaHQgLyBST1dfSEVJR0hUKSArIE9WRVJTQ0FOICogMjtcbiAgICBjb25zdCBlbmQgPSBNYXRoLm1pbihsaW5rcy5sZW5ndGgsIHN0YXJ0ICsgdmlzaWJsZUNvdW50KTtcbiAgICBob3N0LnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGVZKCR7c3RhcnQgKiBST1dfSEVJR0hUfXB4KWA7XG4gICAgaG9zdC5pbm5lckhUTUwgPSBsaW5rcy5zbGljZShzdGFydCwgZW5kKS5tYXAoKGxpbmssIG9mZnNldCkgPT4gYFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVwibGluay1yb3dcIiBkYXRhLXNpZGU9XCIke3NpZGV9XCIgZGF0YS1pbmRleD1cIiR7c3RhcnQgKyBvZmZzZXR9XCIgdGl0bGU9XCIke2VzY2FwZUh0bWwobGluay5maWxlIHx8IGxpbmsucGF0aCl9XCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxpbmstbmFtZVwiPiR7ZXNjYXBlSHRtbChsaW5rLm5hbWUpfTwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGluay1wYXRoXCI+JHtlc2NhcGVIdG1sKGxpbmsucGF0aCl9PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsaW5rLXR5cGVcIj4ke2VzY2FwZUh0bWwobGluay50eXBlKX08L3NwYW4+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgIGApLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiByZW5kZXJEZXRhaWwodmFsdWU/OiBEZXRhaWxWaWV3IHwgbnVsbCk6IHZvaWQge1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSBkZXRhaWwgPSB2YWx1ZTtcbiAgICBjb25zdCB0aXRsZSA9IHF1ZXJ5PEhUTUxCdXR0b25FbGVtZW50PignI2N1cnJlbnQtYXNzZXQnKTtcbiAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgaWYgKGRldGFpbCkge1xuICAgICAgICAgICAgdGl0bGUuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRpdGxlLmRhdGFzZXQudXVpZCA9IGRldGFpbC5hc3NldC51dWlkO1xuICAgICAgICAgICAgdGl0bGUuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtlc2NhcGVIdG1sKGRldGFpbC5hc3NldC5uYW1lKX08L3N0cm9uZz5cbiAgICAgICAgICAgICAgICA8Y29kZT4ke2VzY2FwZUh0bWwoZGV0YWlsLmFzc2V0LnBhdGgpfTwvY29kZT5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB0aXRsZS50aXRsZSA9IGRldGFpbC5hc3NldC5maWxlIHx8IGRldGFpbC5hc3NldC5wYXRoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGl0bGUuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGl0bGUuZGF0YXNldC51dWlkID0gJyc7XG4gICAgICAgICAgICB0aXRsZS50ZXh0Q29udGVudCA9ICfor7fpgInmi6notYTmupDmn6XnnIvnm7TmjqXlvJXnlKjlhbPns7snO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyU2lkZSgnZGVwZW5kZW5jaWVzJyk7XG4gICAgcmVuZGVyU2lkZSgndXNlcnMnKTtcbn1cblxuZnVuY3Rpb24gYmluZEV2ZW50cygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHNpZGUgb2YgWydkZXBlbmRlbmNpZXMnLCAndXNlcnMnXSBhcyBTaWRlW10pIHtcbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSBxdWVyeTxIVE1MRWxlbWVudD4oYCMke3NpZGV9LXZpZXdwb3J0YCk7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBxdWVyeTxIVE1MRWxlbWVudD4oYCMke3NpZGV9LXJvd3NgKTtcbiAgICAgICAgdmlld3BvcnQ/LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHF1ZXVlUmVuZGVyKHNpZGUpLCB7IHBhc3NpdmU6IHRydWUgfSk7XG4gICAgICAgIGhvc3Q/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gdGFyZ2V0Py5jbG9zZXN0PEhUTUxCdXR0b25FbGVtZW50PignLmxpbmstcm93Jyk7XG4gICAgICAgICAgICBpZiAoIWJ1dHRvbikgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoYnV0dG9uLmRhdGFzZXQuaW5kZXgpO1xuICAgICAgICAgICAgY29uc3QgbGluayA9IGdldExpbmtzKHNpZGUpW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChsaW5rKSB2b2lkIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRlcGVuZGVuY3ktdmlld2VyJywgJ3JldmVhbC1hc3NldCcsIGxpbmsudXVpZCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHF1ZXJ5PEhUTUxCdXR0b25FbGVtZW50PignI2N1cnJlbnQtYXNzZXQnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgYnV0dG9uID0gZXZlbnQuY3VycmVudFRhcmdldCBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgICAgaWYgKGJ1dHRvbi5kYXRhc2V0LnV1aWQpIHtcbiAgICAgICAgICAgIHZvaWQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGVwZW5kZW5jeS12aWV3ZXInLCAncmV2ZWFsLWFzc2V0JywgYnV0dG9uLmRhdGFzZXQudXVpZCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcbiAgICB0ZW1wbGF0ZTogYFxuICAgICAgICA8c2VjdGlvbiBpZD1cInJvb3RcIj5cbiAgICAgICAgICAgIDxoZWFkZXIgY2xhc3M9XCJhc3NldC1oZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7lvZPliY3otYTmupA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBpZD1cImN1cnJlbnQtYXNzZXRcIiBkaXNhYmxlZD7or7fpgInmi6notYTmupDmn6XnnIvnm7TmjqXlvJXnlKjlhbPns7s8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvaGVhZGVyPlxuICAgICAgICAgICAgPG1haW4gY2xhc3M9XCJjb2x1bW5zXCI+XG4gICAgICAgICAgICAgICAgPHNlY3Rpb24gY2xhc3M9XCJjb2x1bW4gZGVwZW5kZW5jeS1jb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgPGgyPuW8leeUqOeahOi1hOa6kCA8c3BhbiBpZD1cImRlcGVuZGVuY2llcy1jb3VudFwiPjA8L3NwYW4+PC9oMj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD1cImRlcGVuZGVuY2llcy12aWV3cG9ydFwiIGNsYXNzPVwidmlld3BvcnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJkZXBlbmRlbmNpZXMtc3BhY2VyXCIgY2xhc3M9XCJzcGFjZXJcIj48ZGl2IGlkPVwiZGVwZW5kZW5jaWVzLXJvd3NcIiBjbGFzcz1cInJvd3NcIj48L2Rpdj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJkZXBlbmRlbmNpZXMtZW1wdHlcIiBjbGFzcz1cImVtcHR5XCI+5rKh5pyJ55u05o6l5byV55So6aG555uu6LWE5rqQPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgICAgICAgICA8c2VjdGlvbiBjbGFzcz1cImNvbHVtbiB1c2VyLWNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICA8aDI+6KKr5Lul5LiL6LWE5rqQ5byV55SoIDxzcGFuIGlkPVwidXNlcnMtY291bnRcIj4wPC9zcGFuPjwvaDI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ1c2Vycy12aWV3cG9ydFwiIGNsYXNzPVwidmlld3BvcnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ1c2Vycy1zcGFjZXJcIiBjbGFzcz1cInNwYWNlclwiPjxkaXYgaWQ9XCJ1c2Vycy1yb3dzXCIgY2xhc3M9XCJyb3dzXCI+PC9kaXY+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPVwidXNlcnMtZW1wdHlcIiBjbGFzcz1cImVtcHR5XCI+5rKh5pyJ6aG555uu6LWE5rqQ55u05o6l5byV55So5a6DPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgICAgIDwvbWFpbj5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIGAsXG4gICAgc3R5bGU6IGBcbiAgICAgICAgOmhvc3QgeyBkaXNwbGF5OiBibG9jazsgaGVpZ2h0OiAxMDAlOyB9XG4gICAgICAgICogeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9XG4gICAgICAgICNyb290IHsgaGVpZ2h0OiAxMDAlOyBkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0KTsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwpOyB9XG4gICAgICAgIC5hc3NldC1oZWFkZXIgeyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IGF1dG8gbWlubWF4KDAsIDFmcik7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogMTJweDsgcGFkZGluZzogMTJweCAxNnB4OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tY29sb3Itbm9ybWFsLWJvcmRlcik7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QtZW1waGFzaXMpOyB9XG4gICAgICAgICNjdXJyZW50LWFzc2V0IHsgbWluLXdpZHRoOiAwOyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogYmFzZWxpbmU7IGdhcDogMTJweDsgcGFkZGluZzogOHB4IDEwcHg7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QpOyB0ZXh0LWFsaWduOiBsZWZ0OyBiYWNrZ3JvdW5kOiB2YXIoLS1jb2xvci1ub3JtYWwtZmlsbC1lbXBoYXNpcyk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWNvbG9yLW5vcm1hbC1ib3JkZXIpOyBib3JkZXItcmFkaXVzOiA0cHg7IGN1cnNvcjogcG9pbnRlcjsgb3ZlcmZsb3c6IGhpZGRlbjsgfVxuICAgICAgICAjY3VycmVudC1hc3NldDpob3Zlcjpub3QoOmRpc2FibGVkKSB7IGJvcmRlci1jb2xvcjogdmFyKC0tY29sb3ItZm9jdXMtYm9yZGVyKTsgfVxuICAgICAgICAjY3VycmVudC1hc3NldDpkaXNhYmxlZCB7IGN1cnNvcjogZGVmYXVsdDsgb3BhY2l0eTogLjc7IH1cbiAgICAgICAgI2N1cnJlbnQtYXNzZXQgc3Ryb25nIHsgZmxleDogMCAwIGF1dG87IH1cbiAgICAgICAgI2N1cnJlbnQtYXNzZXQgY29kZSB7IG1pbi13aWR0aDogMDsgY29sb3I6IHZhcigtLWNvbG9yLW5vcm1hbC1jb250cmFzdC1lbXBoYXNpcyk7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4gICAgICAgIC5jb2x1bW5zIHsgZmxleDogMTsgbWluLWhlaWdodDogMDsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDFweDsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWJvcmRlcik7IH1cbiAgICAgICAgLmNvbHVtbiB7IG1pbi13aWR0aDogMDsgbWluLWhlaWdodDogMDsgZGlzcGxheTogZmxleDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsgYmFja2dyb3VuZDogdmFyKC0tY29sb3Itbm9ybWFsLWZpbGwpOyB9XG4gICAgICAgIC5jb2x1bW4gaDIgeyBoZWlnaHQ6IDQwcHg7IG1hcmdpbjogMDsgcGFkZGluZzogMTFweCAxNHB4OyBmb250LXNpemU6IDE0cHg7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1jb2xvci1ub3JtYWwtYm9yZGVyKTsgfVxuICAgICAgICAuZGVwZW5kZW5jeS1jb2x1bW4gaDIgeyBjb2xvcjogI2UxNmM2YzsgfVxuICAgICAgICAudXNlci1jb2x1bW4gaDIgeyBjb2xvcjogIzYyYjk3YzsgfVxuICAgICAgICAuY29sdW1uIGgyIHNwYW4geyBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IG1pbi13aWR0aDogMjZweDsgbWFyZ2luLWxlZnQ6IDZweDsgdGV4dC1hbGlnbjogY2VudGVyOyBjb2xvcjogd2hpdGU7IGJvcmRlci1yYWRpdXM6IDEwcHg7IGZvbnQtc2l6ZTogMTFweDsgfVxuICAgICAgICAuZGVwZW5kZW5jeS1jb2x1bW4gaDIgc3BhbiB7IGJhY2tncm91bmQ6ICNiODQ1NDU7IH1cbiAgICAgICAgLnVzZXItY29sdW1uIGgyIHNwYW4geyBiYWNrZ3JvdW5kOiAjM2E4ZjU3OyB9XG4gICAgICAgIC52aWV3cG9ydCB7IHBvc2l0aW9uOiByZWxhdGl2ZTsgZmxleDogMTsgbWluLWhlaWdodDogMDsgb3ZlcmZsb3c6IGF1dG87IH1cbiAgICAgICAgLnNwYWNlciB7IHBvc2l0aW9uOiByZWxhdGl2ZTsgbWluLXdpZHRoOiA0MjBweDsgfVxuICAgICAgICAucm93cyB7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwOyBsZWZ0OiAwOyByaWdodDogMDsgfVxuICAgICAgICAubGluay1yb3cgeyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAke1JPV19IRUlHSFR9cHg7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogbWlubWF4KDkwcHgsIDI2JSkgbWlubWF4KDE2MHB4LCAxZnIpIDkwcHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogOHB4OyBwYWRkaW5nOiAwIDEwcHg7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QpOyB0ZXh0LWFsaWduOiBsZWZ0OyBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgYm9yZGVyOiAwOyBib3JkZXItYm90dG9tOiAxcHggc29saWQgY29sb3ItbWl4KGluIHNyZ2IsIHZhcigtLWNvbG9yLW5vcm1hbC1ib3JkZXIpIDU1JSwgdHJhbnNwYXJlbnQpOyBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgICAgICAgLmxpbmstcm93OmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tY29sb3ItaG92ZXItZmlsbCk7IH1cbiAgICAgICAgLmxpbmstbmFtZSwgLmxpbmstcGF0aCwgLmxpbmstdHlwZSB7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4gICAgICAgIC5saW5rLXBhdGgsIC5saW5rLXR5cGUgeyBjb2xvcjogdmFyKC0tY29sb3Itbm9ybWFsLWNvbnRyYXN0LWVtcGhhc2lzKTsgZm9udC1zaXplOiAxMXB4OyB9XG4gICAgICAgIC5saW5rLXJvdzpob3ZlciAubGluay1wYXRoIHsgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7IH1cbiAgICAgICAgLmVtcHR5IHsgcG9zaXRpb246IGFic29sdXRlOyBpbnNldDogMDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IGNvbG9yOiB2YXIoLS1jb2xvci1ub3JtYWwtY29udHJhc3QtZW1waGFzaXMpOyB9XG4gICAgICAgIC5lbXB0eVtoaWRkZW5dIHsgZGlzcGxheTogbm9uZTsgfVxuICAgIGAsXG4gICAgJDoge1xuICAgICAgICByb290OiAnI3Jvb3QnLFxuICAgIH0sXG4gICAgcmVhZHkodGhpczogUGFuZWxJbnN0YW5jZSkge1xuICAgICAgICBiaW5kUGFuZWxSb290KHRoaXMpO1xuICAgICAgICBiaW5kRXZlbnRzKCk7XG4gICAgICAgIHZvaWQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGVwZW5kZW5jeS12aWV3ZXInLCAncmVxdWVzdC1kZXRhaWwnKVxuICAgICAgICAgICAgLnRoZW4oKHZhbHVlOiBEZXRhaWxWaWV3IHwgbnVsbCkgPT4gcmVuZGVyRGV0YWlsKHZhbHVlKSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0Fzc2V0RGVwZW5kZW5jeVZpZXdlcl0gcmVxdWVzdCBkZXRhaWwgZmFpbGVkOicsIGVycm9yPy5tZXNzYWdlIHx8IGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0sXG4gICAgbGlzdGVuZXJzOiB7XG4gICAgICAgIHJlc2l6ZSgpIHtcbiAgICAgICAgICAgIHF1ZXVlUmVuZGVyKCdkZXBlbmRlbmNpZXMnKTtcbiAgICAgICAgICAgIHF1ZXVlUmVuZGVyKCd1c2VycycpO1xuICAgICAgICB9LFxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuICAgICAgICBzZXREZXRhaWwodGhpczogUGFuZWxJbnN0YW5jZSwgdmFsdWU6IERldGFpbFZpZXcpIHtcbiAgICAgICAgICAgIGJpbmRQYW5lbFJvb3QodGhpcyk7XG4gICAgICAgICAgICByZW5kZXJEZXRhaWwodmFsdWUpO1xuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiJdfQ==
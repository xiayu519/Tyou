"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let currentPlan = null;
let isExecuting = false;
let panelRoot = null;
function escapeHtml(input) {
    return String(input !== null && input !== void 0 ? input : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function compactDbPath(input) {
    return String(input || '').replace(/^db:\/\/assets\//, 'assets/');
}
function bindPanelRoot(panel) {
    var _a;
    const root = (_a = panel === null || panel === void 0 ? void 0 : panel.$) === null || _a === void 0 ? void 0 : _a.root;
    if (root)
        panelRoot = root;
}
function getPanelRoot() {
    if (panelRoot === null || panelRoot === void 0 ? void 0 : panelRoot.isConnected)
        return panelRoot;
    const fallback = document.querySelector('#root');
    if (fallback)
        panelRoot = fallback;
    return panelRoot;
}
function queryInPanel(selector) {
    var _a;
    return ((_a = getPanelRoot()) === null || _a === void 0 ? void 0 : _a.querySelector(selector)) || null;
}
function queryAllInPanel(selector) {
    var _a;
    return Array.from(((_a = getPanelRoot()) === null || _a === void 0 ? void 0 : _a.querySelectorAll(selector)) || []);
}
function selectedInputs() {
    return queryAllInPanel('.asset-check:checked');
}
function allAssetInputs() {
    return queryAllInPanel('.asset-check');
}
function updateSelectedSummary() {
    const selectedCount = selectedInputs().length;
    const totalCount = allAssetInputs().length;
    const summary = queryInPanel('#selected-summary');
    const executeButton = queryInPanel('#execute');
    if (summary)
        summary.textContent = totalCount > 0 ? `已勾选 ${selectedCount} / ${totalCount} 张图片` : '没有可清理的图片';
    if (executeButton)
        executeButton.disabled = isExecuting || selectedCount === 0;
}
function groupAssets(plan) {
    const groups = new Map();
    for (const asset of plan.assets) {
        if (!groups.has(asset.atlasPath))
            groups.set(asset.atlasPath, []);
        groups.get(asset.atlasPath).push(asset);
    }
    return Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([atlasPath, assets]) => ({
        atlasPath,
        assets: assets.sort((a, b) => a.file.localeCompare(b.file)),
    }));
}
function groupHtml(group, index) {
    return `
        <section class="group-card" data-group-index="${index}">
            <div class="group-head">
                <div class="group-title">${escapeHtml(group.atlasPath)}</div>
                <span class="badge">${group.assets.length} 张</span>
            </div>
            <div class="asset-list">
                ${group.assets.map((asset) => `
                    <article class="asset-row">
                        <div class="asset-main">
                            <button class="asset-path" type="button" data-db-path="${escapeHtml(asset.dbPath)}">
                                <span class="asset-name">${escapeHtml(asset.name)}</span>
                                <code>${escapeHtml(compactDbPath(asset.dbPath))}</code>
                            </button>
                            <label class="asset-check-wrap">
                                <input class="asset-check" type="checkbox" data-asset-id="${escapeHtml(asset.id)}" ${asset.checked ? 'checked' : ''} />
                            </label>
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}
async function revealAsset(dbPath) {
    var _a, _b, _c, _d, _e;
    try {
        const info = await Editor.Message.request('asset-db', 'query-asset-info', dbPath);
        const uuid = (info === null || info === void 0 ? void 0 : info.uuid) || '';
        if (!uuid)
            return;
        Editor.Selection.clear('asset');
        Editor.Selection.select('asset', uuid);
        await ((_b = (_a = Editor.Panel).focus) === null || _b === void 0 ? void 0 : _b.call(_a, 'assets'));
        const message = Editor.Message;
        (_c = message.send) === null || _c === void 0 ? void 0 : _c.call(message, 'assets', 'twinkle', uuid);
        (_d = message.send) === null || _d === void 0 ? void 0 : _d.call(message, 'assets', 'reveal', uuid);
        (_e = message.send) === null || _e === void 0 ? void 0 : _e.call(message, 'assets', 'select', uuid);
    }
    catch (error) {
        console.warn('[PSD2CCC] reveal redundant atlas asset failed:', dbPath, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
}
function renderPlan(plan) {
    const root = getPanelRoot();
    if (!root)
        return;
    if (!plan) {
        root.innerHTML = `
            <div class="empty">
                <div class="empty-title">暂无扫描结果</div>
                <div class="empty-text">请从顶部 Tools 菜单重新执行“检查冗余图片”。</div>
            </div>
        `;
        return;
    }
    const hasAssets = plan.assets.length > 0;
    root.innerHTML = `
        <div class="panel">
            <header class="header">
                <div>
                    <h1>检查冗余图片</h1>
                    <p>${hasAssets ? '勾选要删除的图片，执行前会再次确认没有 Prefab 引用。' : '本次没有发现未被 Prefab 引用的 atlas 图片。'}</p>
                </div>
                ${hasAssets ? `<div class="toolbar">
                    <button id="select-all" class="secondary">全选</button>
                    <button id="select-none" class="secondary">全不选</button>
                </div>` : ''}
            </header>
            <section class="summary">
                <div><b>${plan.totalAssets}</b><span>扫描图片</span></div>
                <div><b>${plan.prefabCount}</b><span>扫描 Prefab</span></div>
                <div><b>${plan.referencedCount}</b><span>已引用图片</span></div>
                <div><b>${plan.unusedCount}</b><span>可清理图片</span></div>
            </section>
            <div class="report-line">完整报告：<code>${escapeHtml(plan.reportPath)}</code></div>
            <main class="content">
                ${hasAssets ? groupAssets(plan).map(groupHtml).join('') : `
                    <section class="empty-result">
                        <h2>没有可清理的冗余图片</h2>
                        <p><code>assets/asset-art/atlas</code> 下的图片都能在 Prefab 中找到引用。</p>
                    </section>
                `}
                ${plan.skipped.length ? `
                    <section class="skip-card">
                        <h2>扫描跳过 ${plan.skipped.length} 项</h2>
                        ${plan.skipped.slice(0, 12).map((item) => `<div>${escapeHtml(item)}</div>`).join('')}
                    </section>
                ` : ''}
            </main>
            <footer class="footer">
                <span id="selected-summary"></span>
                <div class="footer-actions">
                    <button id="cancel" class="secondary">${hasAssets ? '取消' : '关闭'}</button>
                    ${hasAssets ? '<button id="execute" class="primary">执行清理</button>' : ''}
                </div>
            </footer>
        </div>
    `;
    bindEvents();
    updateSelectedSummary();
}
function setExecuting(value) {
    var _a;
    isExecuting = value;
    (_a = getPanelRoot()) === null || _a === void 0 ? void 0 : _a.classList.toggle('executing', value);
    const executeButton = queryInPanel('#execute');
    if (executeButton)
        executeButton.textContent = value ? '清理中...' : '执行清理';
    updateSelectedSummary();
}
function bindEvents() {
    var _a, _b, _c, _d;
    (_a = queryInPanel('#select-all')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        for (const input of allAssetInputs())
            input.checked = true;
        updateSelectedSummary();
    });
    (_b = queryInPanel('#select-none')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        for (const input of allAssetInputs())
            input.checked = false;
        updateSelectedSummary();
    });
    for (const input of queryAllInPanel('.asset-check')) {
        input.addEventListener('change', updateSelectedSummary);
    }
    for (const button of queryAllInPanel('.asset-path')) {
        button.addEventListener('click', async () => {
            const dbPath = button.dataset.dbPath || '';
            if (dbPath)
                await revealAsset(dbPath);
        });
    }
    (_c = queryInPanel('#cancel')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', async () => {
        if (currentPlan) {
            await Editor.Message.request('psd2ccc', 'discard-redundant-atlas-plan', currentPlan.planId);
        }
        Editor.Panel.close('psd2ccc.redundant-atlas-clean');
    });
    (_d = queryInPanel('#execute')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', async () => {
        if (!currentPlan || isExecuting)
            return;
        const selectedAssetIds = selectedInputs().map((input) => input.dataset.assetId || '').filter(Boolean);
        if (selectedAssetIds.length === 0)
            return;
        setExecuting(true);
        try {
            await Editor.Message.request('psd2ccc', 'execute-redundant-atlas-plan', currentPlan.planId, selectedAssetIds);
            Editor.Panel.close('psd2ccc.redundant-atlas-clean');
        }
        catch (error) {
            await Editor.Dialog.warn('检查冗余图片', {
                title: '执行失败',
                detail: (error === null || error === void 0 ? void 0 : error.message) || String(error),
                buttons: ['确定'],
            });
        }
        finally {
            setExecuting(false);
        }
    });
}
module.exports = Editor.Panel.define({
    template: '<div id="root"></div>',
    style: `
        :host {
            display: block;
            height: 100%;
            color: var(--color-normal-contrast);
            background: var(--color-normal-fill);
            font-family: Arial, "Microsoft YaHei", sans-serif;
        }
        #root {
            height: 100%;
            min-height: 0;
        }
        button {
            border: 1px solid var(--color-normal-border);
            border-radius: 3px;
            height: 28px;
            padding: 0 14px;
            color: var(--color-normal-contrast);
            background: var(--color-normal-fill-emphasis);
            cursor: pointer;
        }
        button:hover { background: var(--color-hover-fill); }
        button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
        }
        .primary {
            color: #fff;
            border-color: #b23b3b;
            background: #b23b3b;
        }
        .primary:hover { background: #c94a4a; }
        .secondary { min-width: 72px; }
        .panel {
            display: flex;
            flex-direction: column;
            height: 100vh;
            min-height: 0;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 18px 20px 12px;
            border-bottom: 1px solid var(--color-normal-border);
        }
        h1 {
            margin: 0 0 6px;
            font-size: 20px;
            font-weight: 600;
        }
        p {
            margin: 0;
            color: var(--color-normal-contrast-emphasis);
            font-size: 13px;
        }
        .toolbar, .footer-actions {
            display: flex;
            gap: 8px;
            white-space: nowrap;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            padding: 12px 20px 8px;
        }
        .summary div {
            border: 1px solid var(--color-normal-border);
            background: var(--color-normal-fill-emphasis);
            padding: 10px 12px;
            border-radius: 4px;
        }
        .summary b {
            display: block;
            font-size: 20px;
            margin-bottom: 4px;
        }
        .summary span {
            color: var(--color-normal-contrast-emphasis);
            font-size: 12px;
        }
        .report-line {
            padding: 0 20px 10px;
            color: var(--color-normal-contrast-emphasis);
            font-size: 12px;
        }
        code {
            font-family: Consolas, "Courier New", monospace;
            font-size: 12px;
            word-break: break-all;
        }
        .content {
            flex: 1;
            min-height: 0;
            overflow: auto;
            padding: 0 20px 16px;
        }
        .group-card, .skip-card, .empty-result {
            border: 1px solid var(--color-normal-border);
            background: var(--color-normal-fill-emphasis);
            border-radius: 6px;
            margin-bottom: 12px;
            overflow: hidden;
        }
        .group-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-normal-border);
        }
        .group-title {
            font-size: 14px;
            font-weight: 600;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
        }
        .badge {
            border-radius: 999px;
            padding: 3px 9px;
            font-size: 12px;
            color: #ffd0d0;
            background: rgba(178, 59, 59, 0.18);
        }
        .asset-list {
            display: flex;
            flex-direction: column;
        }
        .asset-row {
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-normal-border);
        }
        .asset-row:last-child { border-bottom: 0; }
        .asset-main {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 24px;
            gap: 14px;
            align-items: center;
        }
        .asset-path {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
            height: auto;
            padding: 0;
            border: 0;
            color: var(--color-normal-contrast);
            background: transparent;
            text-align: left;
            cursor: pointer;
        }
        .asset-path:hover {
            color: var(--color-focus-contrast);
            background: transparent;
        }
        .asset-path code {
            color: var(--color-normal-contrast-emphasis);
        }
        .asset-path:hover code {
            text-decoration: underline;
        }
        .asset-check-wrap {
            display: flex;
            justify-content: flex-end;
            align-items: center;
        }
        .asset-name {
            font-size: 14px;
            font-weight: 600;
        }
        .skip-card {
            padding: 12px;
            color: var(--color-normal-contrast-emphasis);
            font-size: 12px;
        }
        .skip-card h2, .empty-result h2 {
            margin: 0 0 8px;
            color: var(--color-normal-contrast);
            font-size: 14px;
        }
        .empty-result {
            padding: 22px 24px;
        }
        .empty-result p {
            margin: 0;
            line-height: 1.6;
        }
        .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 20px;
            border-top: 1px solid var(--color-normal-border);
            background: var(--color-normal-fill);
        }
        #selected-summary {
            color: var(--color-normal-contrast-emphasis);
            font-size: 13px;
        }
        .empty {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--color-normal-contrast-emphasis);
        }
        .empty-title {
            color: var(--color-normal-contrast);
            font-size: 18px;
            margin-bottom: 8px;
        }
        #root.executing .content {
            opacity: 0.65;
            pointer-events: none;
        }
    `,
    $: {
        root: '#root',
    },
    update(plan) {
        bindPanelRoot(this);
        currentPlan = plan;
        renderPlan(currentPlan);
    },
    ready() {
        bindPanelRoot(this);
        renderPlan(currentPlan);
    },
    beforeClose() {
        if (currentPlan && !isExecuting) {
            Editor.Message.request('psd2ccc', 'discard-redundant-atlas-plan', currentPlan.planId);
        }
    },
    methods: {
        setPlan(plan) {
            bindPanelRoot(this);
            currentPlan = plan;
            renderPlan(currentPlan);
        },
    },
});
//# sourceMappingURL=redundant-atlas-clean.js.map
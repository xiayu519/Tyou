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
function updateGroupChecks() {
    for (const group of queryAllInPanel('.group-card')) {
        const groupCheck = group.querySelector('.group-check');
        const checks = Array.from(group.querySelectorAll('.asset-check'));
        if (!groupCheck || checks.length === 0)
            continue;
        const checkedCount = checks.filter((input) => input.checked).length;
        groupCheck.checked = checkedCount === checks.length;
        groupCheck.indeterminate = checkedCount > 0 && checkedCount < checks.length;
    }
}
function updateSelectedSummary() {
    const selectedCount = selectedInputs().length;
    const totalCount = allAssetInputs().length;
    const summary = queryInPanel('#selected-summary');
    const executeButton = queryInPanel('#execute');
    if (summary)
        summary.textContent = totalCount > 0 ? `已勾选 ${selectedCount} / ${totalCount} 张图片` : '没有需要整理的图片';
    if (executeButton)
        executeButton.disabled = isExecuting || selectedCount === 0;
    updateGroupChecks();
}
function referencesHtml(references) {
    if (references.length === 0) {
        return '<div class="empty-ref">未找到 Prefab/Scene 文本引用，执行时仍会做删除前引用检查</div>';
    }
    return `
        <details class="refs">
            <summary>关联节点 ${references.length} 处</summary>
            <div class="ref-list">
                ${references.map((ref) => `
                    <div class="ref-item">
                        <div class="ref-node">${escapeHtml(ref.nodePath)}</div>
                        <div class="ref-meta">${escapeHtml(ref.file)} / ${escapeHtml(ref.componentType)}.${escapeHtml(ref.propertyPath)}</div>
                    </div>
                `).join('')}
            </div>
        </details>
    `;
}
function groupHtml(group, index) {
    return `
        <section class="group-card" data-group-id="${escapeHtml(group.id)}">
            <div class="group-head">
                <label class="group-toggle">
                    <input class="group-check" type="checkbox" checked />
                    <span>重复组 ${index + 1}</span>
                </label>
                <span class="badge ${group.willCreateCommon ? 'create' : 'reuse'}">
                    ${group.willCreateCommon ? '新建 common' : '复用 common'}
                </span>
            </div>
            <div class="target">
                <span class="target-label">目标</span>
                <code>${escapeHtml(compactDbPath(group.targetDbPath))}</code>
            </div>
            <div class="asset-list">
                ${group.assets.map((asset) => `
                    <article class="asset-row">
                        <label class="asset-main">
                            <input class="asset-check" type="checkbox" data-asset-id="${escapeHtml(asset.id)}" ${asset.checked ? 'checked' : ''} />
                            <span class="asset-text">
                                <span class="asset-name">${escapeHtml(asset.name)}</span>
                                <code>${escapeHtml(asset.file)}</code>
                            </span>
                        </label>
                        ${referencesHtml(asset.references)}
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}
function renderPlan(plan) {
    const root = getPanelRoot();
    if (!root)
        return;
    if (!plan) {
        root.innerHTML = `
            <div class="empty">
                <div class="empty-title">暂无扫描结果</div>
                <div class="empty-text">请从顶部 Tools 菜单重新执行“检查所有公共图集”。</div>
            </div>
        `;
        return;
    }
    const hasGroups = plan.groups.length > 0;
    root.innerHTML = `
        <div class="panel">
            <header class="header">
                <div>
                    <h1>检查所有公共图集</h1>
                    <p>${hasGroups ? '勾选需要整理的图片，未勾选的图片不会替换引用，也不会删除。' : '本次扫描没有发现需要整理进 common 的重复图片。'}</p>
                </div>
                ${hasGroups ? `<div class="toolbar">
                    <button id="select-all" class="secondary">全选</button>
                    <button id="select-none" class="secondary">全不选</button>
                </div>` : ''}
            </header>
            <section class="summary">
                <div><b>${plan.totalAssets}</b><span>扫描图片</span></div>
                <div><b>${plan.groupCount}</b><span>重复组</span></div>
                <div><b>${plan.createCommonCount}</b><span>新建 common</span></div>
                <div><b>${plan.referenceFileCount}</b><span>关联文件</span></div>
            </section>
            <div class="report-line">完整报告：<code>${escapeHtml(plan.reportPath)}</code></div>
            <main class="content">
                ${hasGroups ? plan.groups.map(groupHtml).join('') : `
                    <section class="empty-result">
                        <h2>没有需要整理的公共图集</h2>
                        <p>当前 <code>assets/asset-art/atlas</code> 下没有找到需要移动到 common 的多引用重复图片。</p>
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
                    <button id="cancel" class="secondary">${hasGroups ? '取消' : '关闭'}</button>
                    ${hasGroups ? '<button id="execute" class="primary">执行整理</button>' : ''}
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
        executeButton.textContent = value ? '整理中...' : '执行整理';
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
    for (const input of queryAllInPanel('.group-check')) {
        input.addEventListener('change', () => {
            const group = input.closest('.group-card');
            if (!group)
                return;
            for (const assetInput of Array.from(group.querySelectorAll('.asset-check'))) {
                assetInput.checked = input.checked;
            }
            updateSelectedSummary();
        });
    }
    (_c = queryInPanel('#cancel')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', async () => {
        if (currentPlan) {
            await Editor.Message.request('psd2ccc', 'discard-all-common-atlas-plan', currentPlan.planId);
        }
        Editor.Panel.close('psd2ccc.common-atlas-check');
    });
    (_d = queryInPanel('#execute')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', async () => {
        if (!currentPlan || isExecuting)
            return;
        const selectedAssetIds = selectedInputs().map((input) => input.dataset.assetId || '').filter(Boolean);
        if (selectedAssetIds.length === 0)
            return;
        setExecuting(true);
        try {
            await Editor.Message.request('psd2ccc', 'execute-all-common-atlas-plan', currentPlan.planId, selectedAssetIds);
            Editor.Panel.close('psd2ccc.common-atlas-check');
        }
        catch (error) {
            await Editor.Dialog.warn('检查所有公共图集', {
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
            border-color: #1f6feb;
            background: #1677d2;
        }
        .primary:hover { background: #1f86e5; }
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
        .group-card, .skip-card {
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
        .group-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
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
        }
        .badge.create {
            color: #9be7c0;
            background: rgba(30, 130, 76, 0.18);
        }
        .badge.reuse {
            color: #9ccfff;
            background: rgba(46, 117, 182, 0.18);
        }
        .target {
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 8px;
            align-items: start;
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-normal-border);
        }
        .target-label {
            color: var(--color-normal-contrast-emphasis);
            font-size: 12px;
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
            grid-template-columns: 18px minmax(0, 1fr);
            gap: 10px;
            align-items: start;
        }
        .asset-text {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }
        .asset-name {
            font-size: 14px;
            font-weight: 600;
        }
        .refs {
            margin: 8px 0 0 28px;
            color: var(--color-normal-contrast-emphasis);
        }
        .refs summary {
            cursor: pointer;
            font-size: 12px;
        }
        .ref-list {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .ref-item {
            padding: 7px 9px;
            border-left: 2px solid #1677d2;
            background: var(--color-normal-fill);
        }
        .ref-node {
            color: var(--color-normal-contrast);
            font-size: 13px;
            margin-bottom: 3px;
        }
        .ref-meta {
            font-size: 12px;
            word-break: break-all;
        }
        .empty-ref {
            margin: 8px 0 0 28px;
            color: var(--color-normal-contrast-emphasis);
            font-size: 12px;
        }
        .skip-card {
            padding: 12px;
            color: var(--color-normal-contrast-emphasis);
            font-size: 12px;
        }
        .skip-card h2 {
            margin: 0 0 8px;
            color: var(--color-normal-contrast);
            font-size: 14px;
        }
        .empty-result {
            border: 1px solid var(--color-normal-border);
            background: var(--color-normal-fill-emphasis);
            border-radius: 6px;
            padding: 22px 24px;
        }
        .empty-result h2 {
            margin: 0 0 8px;
            color: var(--color-normal-contrast);
            font-size: 16px;
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
            Editor.Message.request('psd2ccc', 'discard-all-common-atlas-plan', currentPlan.planId);
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
//# sourceMappingURL=common-atlas-check.js.map
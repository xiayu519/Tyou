'use strict';

import {
    discardAllCommonAtlasPlan,
    discardRedundantAtlasPlan,
    executeAllCommonAtlasPlan,
    executeRedundantAtlasPlan,
    runAllCommonAtlasCheck,
    runCommonAtlasCheckForNode,
    runRedundantAtlasCheck,
} from './common-atlas-checker';

export function resolveSelectedNodeUuid(selection: any = Editor.Selection): string {
    const lastSelected = selection?.getLastSelected?.('node');
    if (lastSelected) return lastSelected;

    const selected = selection?.getSelected?.('node');
    return Array.isArray(selected) && selected.length > 0
        ? selected[selected.length - 1]
        : '';
}

export const methods = {
    async checkAllCommonAtlas() {
        await runAllCommonAtlasCheck();
    },
    async checkRedundantAtlas() {
        await runRedundantAtlasCheck();
    },
    async executeAllCommonAtlasPlan(planId: string, selectedAssetDbPaths: string[]) {
        return await executeAllCommonAtlasPlan(planId, selectedAssetDbPaths);
    },
    async executeRedundantAtlasPlan(planId: string, selectedAssetDbPaths: string[]) {
        return await executeRedundantAtlasPlan(planId, selectedAssetDbPaths);
    },
    discardAllCommonAtlasPlan(planId: string) {
        discardAllCommonAtlasPlan(planId);
    },
    discardRedundantAtlasPlan(planId: string) {
        discardRedundantAtlasPlan(planId);
    },
    async checkCommonAtlasForNode(nodeUuid: string) {
        await runCommonAtlasCheckForNode(nodeUuid);
    },
    async checkCommonAtlasForSelection() {
        const nodeUuid = resolveSelectedNodeUuid();
        if (!nodeUuid) {
            await Editor.Dialog.warn('检查公共图集', {
                title: '未选择节点',
                detail: '请先在层级管理器中选择要检查的 UI 根节点。',
                buttons: ['确定'],
            });
            return;
        }

        await runCommonAtlasCheckForNode(nodeUuid);
    },
};
export function load() { console.log('[PSD2CCC] extension loaded v1.0.1'); }
export function unload() { console.log('[PSD2CCC] extension unloaded'); }

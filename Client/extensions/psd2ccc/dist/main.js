'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.unload = exports.load = exports.methods = exports.resolveSelectedNodeUuid = void 0;
const common_atlas_checker_1 = require("./common-atlas-checker");
function resolveSelectedNodeUuid(selection = Editor.Selection) {
    var _a, _b;
    const lastSelected = (_a = selection === null || selection === void 0 ? void 0 : selection.getLastSelected) === null || _a === void 0 ? void 0 : _a.call(selection, 'node');
    if (lastSelected)
        return lastSelected;
    const selected = (_b = selection === null || selection === void 0 ? void 0 : selection.getSelected) === null || _b === void 0 ? void 0 : _b.call(selection, 'node');
    return Array.isArray(selected) && selected.length > 0
        ? selected[selected.length - 1]
        : '';
}
exports.resolveSelectedNodeUuid = resolveSelectedNodeUuid;
exports.methods = {
    async checkAllCommonAtlas() {
        await (0, common_atlas_checker_1.runAllCommonAtlasCheck)();
    },
    async checkRedundantAtlas() {
        await (0, common_atlas_checker_1.runRedundantAtlasCheck)();
    },
    async executeAllCommonAtlasPlan(planId, selectedAssetDbPaths) {
        return await (0, common_atlas_checker_1.executeAllCommonAtlasPlan)(planId, selectedAssetDbPaths);
    },
    async executeRedundantAtlasPlan(planId, selectedAssetDbPaths) {
        return await (0, common_atlas_checker_1.executeRedundantAtlasPlan)(planId, selectedAssetDbPaths);
    },
    discardAllCommonAtlasPlan(planId) {
        (0, common_atlas_checker_1.discardAllCommonAtlasPlan)(planId);
    },
    discardRedundantAtlasPlan(planId) {
        (0, common_atlas_checker_1.discardRedundantAtlasPlan)(planId);
    },
    async checkCommonAtlasForNode(nodeUuid) {
        await (0, common_atlas_checker_1.runCommonAtlasCheckForNode)(nodeUuid);
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
        await (0, common_atlas_checker_1.runCommonAtlasCheckForNode)(nodeUuid);
    },
};
function load() { console.log('[PSD2CCC] extension loaded v1.0.1'); }
exports.load = load;
function unload() { console.log('[PSD2CCC] extension unloaded'); }
exports.unload = unload;
//# sourceMappingURL=main.js.map
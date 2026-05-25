"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_atlas_checker_1 = require("./common-atlas-checker");
function resolveNodeUuid(nodeInfo) {
    var _a;
    return typeof nodeInfo === 'string'
        ? nodeInfo
        : ((nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.uuid) || (nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo._id) || ((_a = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.value) === null || _a === void 0 ? void 0 : _a.uuid) || '');
}
module.exports = {
    onHierarchyMenu(nodeInfo) {
        const nodeUuid = resolveNodeUuid(nodeInfo);
        if (!nodeUuid)
            return [];
        return [
            {
                label: '检查公共图集',
                visible: true,
                enabled: true,
                async click() {
                    await (0, common_atlas_checker_1.runCommonAtlasCheckForNode)(nodeUuid);
                },
            },
        ];
    },
};
//# sourceMappingURL=hierarchy-menu.js.map
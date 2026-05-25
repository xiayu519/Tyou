'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.unload = exports.load = exports.methods = void 0;
const common_atlas_checker_1 = require("./common-atlas-checker");
exports.methods = {
    async checkCommonAtlasForNode(nodeUuid) {
        await (0, common_atlas_checker_1.runCommonAtlasCheckForNode)(nodeUuid);
    },
};
function load() { console.log('[PSD2CCC] extension loaded'); }
exports.load = load;
function unload() { console.log('[PSD2CCC] extension unloaded'); }
exports.unload = unload;
//# sourceMappingURL=main.js.map
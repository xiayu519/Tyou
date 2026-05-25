'use strict';

import { runCommonAtlasCheckForNode } from './common-atlas-checker';

export const methods = {
    async checkCommonAtlasForNode(nodeUuid: string) {
        await runCommonAtlasCheckForNode(nodeUuid);
    },
};
export function load() { console.log('[PSD2CCC] extension loaded'); }
export function unload() { console.log('[PSD2CCC] extension unloaded'); }

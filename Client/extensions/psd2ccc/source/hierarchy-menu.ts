import { runCommonAtlasCheckForNode } from './common-atlas-checker';

function resolveNodeUuid(nodeInfo: any): string {
    return typeof nodeInfo === 'string'
        ? nodeInfo
        : (nodeInfo?.uuid || nodeInfo?._id || nodeInfo?.value?.uuid || '');
}

module.exports = {
    onHierarchyMenu(nodeInfo: any) {
        const nodeUuid = resolveNodeUuid(nodeInfo);
        if (!nodeUuid) return [];

        return [
            {
                label: '检查公共图集',
                visible: true,
                enabled: true,
                async click() {
                    await runCommonAtlasCheckForNode(nodeUuid);
                },
            },
        ];
    },
};

export {};

type AssetMenuInfo = {
    uuid?: string;
    url?: string;
    name?: string;
    isDirectory?: boolean;
};

module.exports = {
    onAssetMenu(assetInfo: AssetMenuInfo) {
        if (!assetInfo?.name) return [];
        const identity = assetInfo.uuid || assetInfo.url || '';
        const items = [];
        if (assetInfo.isDirectory) {
            items.push({
                label: '检查此文件夹引用',
                enabled: Boolean(identity),
                visible: true,
                async click() {
                    if (identity) {
                        await Editor.Message.request('asset-dependency-viewer', 'open-scope', identity);
                    }
                },
            });
        } else {
            items.push({
                label: '查看引用关系',
                enabled: Boolean(identity),
                visible: true,
                async click() {
                    if (identity) {
                        await Editor.Message.request('asset-dependency-viewer', 'show-detail', identity);
                    }
                },
            });
        }
        items.push(
            {
                label: '打开资源引用查看器',
                enabled: true,
                visible: true,
                async click() {
                    await Editor.Message.request(
                        'asset-dependency-viewer',
                        'open-overview',
                    );
                },
            },
        );
        return items;
    },
};

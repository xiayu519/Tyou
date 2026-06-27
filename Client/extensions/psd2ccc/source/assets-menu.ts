import fs from 'fs';
import path from 'path';

type SceneTreeNode = {
    type: string;
    relativePath?: string;
    sliceBorder?: { top: number; right: number; bottom: number; left: number };
    children?: SceneTreeNode[];
};

type SceneTree = {
    children?: SceneTreeNode[];
    atlasPath?: string;
    psdName?: string;
};

type SpriteMap = Record<string, string>;

type SliceBorder = { top: number; right: number; bottom: number; left: number };

type BuildOptions = {
    sourcePath: string;
    sourceLabel: string;
    waitForAssets?: boolean;
    warnings?: string[];
    exportedCount?: number;
};

function normalizePath(input: string): string {
    return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function getSpriteFrameUuidFromMeta(metaPath: string): string | null {
    try {
        if (!fs.existsSync(metaPath)) return null;
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (!meta.subMetas) return null;

        for (const key of Object.keys(meta.subMetas)) {
            const sub = meta.subMetas[key];
            if (sub.importer === 'sprite-frame' && sub.uuid) {
                return sub.uuid;
            }
        }
    } catch (error: any) {
        console.warn('[PSD2CCC] Failed to read sprite meta:', metaPath, error?.message || error);
    }

    return null;
}

function resolveSpriteFrameUuids(atlasPath: string): SpriteMap {
    const spriteMap: SpriteMap = {};
    const dirPath = path.join(Editor.Project.path, 'assets', atlasPath);
    if (!fs.existsSync(dirPath)) return spriteMap;

    for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.png')) continue;
        const baseName = file.replace(/\.png$/i, '');
        const metaPath = path.join(dirPath, `${file}.meta`);
        const uuid = getSpriteFrameUuidFromMeta(metaPath);
        if (uuid) {
            spriteMap[baseName] = uuid;
        }
    }

    return spriteMap;
}

function mergeSpriteMaps(...maps: SpriteMap[]): SpriteMap {
    const merged: SpriteMap = {};
    for (const map of maps) {
        Object.assign(merged, map);
    }
    return merged;
}

function listAtlasPngFiles(atlasPath: string): string[] {
    const dirPath = path.join(Editor.Project.path, 'assets', atlasPath);
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).filter((file) => file.endsWith('.png'));
}

function collectSliceBorders(children: SceneTreeNode[] | undefined): Record<string, SliceBorder> {
    const map: Record<string, SliceBorder> = {};
    if (!children) return map;

    for (const child of children) {
        if (child.type === 'png' && child.sliceBorder && child.relativePath) {
            map[child.relativePath] = child.sliceBorder;
        }
        if (child.children?.length) {
            Object.assign(map, collectSliceBorders(child.children));
        }
    }

    return map;
}

function collectRelativePaths(children: SceneTreeNode[] | undefined, out = new Set<string>()): Set<string> {
    if (!children) return out;

    for (const child of children) {
        if (child.type === 'png' && child.relativePath) {
            out.add(child.relativePath);
        }
        if (child.children?.length) {
            collectRelativePaths(child.children, out);
        }
    }

    return out;
}

function writeSliceBorderToMeta(meta: any, border: SliceBorder): boolean {
    let found = false;
    for (const key of Object.keys(meta?.subMetas || {})) {
        const sub = meta.subMetas[key];
        if (sub.importer !== 'sprite-frame') continue;

        sub.userData = sub.userData || {};
        sub.userData.borderTop = border.top;
        sub.userData.borderBottom = border.bottom;
        sub.userData.borderLeft = border.left;
        sub.userData.borderRight = border.right;
        found = true;
    }
    return found;
}

function hasSliceBorder(meta: any, border: SliceBorder): boolean {
    for (const key of Object.keys(meta?.subMetas || {})) {
        const sub = meta.subMetas[key];
        const userData = sub?.userData;
        if (sub?.importer === 'sprite-frame'
            && userData?.borderTop === border.top
            && userData?.borderBottom === border.bottom
            && userData?.borderLeft === border.left
            && userData?.borderRight === border.right) {
            return true;
        }
    }
    return false;
}

async function applySliceBordersToMeta(
    atlasPath: string,
    sliceMap: Record<string, SliceBorder>,
): Promise<string[]> {
    const changedAssets: string[] = [];
    if (Object.keys(sliceMap).length === 0) return changedAssets;

    const dirPath = path.join(Editor.Project.path, 'assets', atlasPath);
    if (!fs.existsSync(dirPath)) return changedAssets;

    const failures: string[] = [];

    for (const relPath of Object.keys(sliceMap)) {
        const dbPath = `db://assets/${normalizePath(atlasPath)}/${relPath}.png`;

        try {
            const border = sliceMap[relPath];
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', dbPath);
            if (!assetInfo?.uuid) {
                failures.push(`${relPath}: SpriteFrame 资源尚未导入`);
                continue;
            }

            const meta = await Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            if (!meta || !writeSliceBorderToMeta(meta, border)) {
                failures.push(`${relPath}: 未找到 sprite-frame meta`);
                continue;
            }

            await Editor.Message.request(
                'asset-db',
                'save-asset-meta',
                assetInfo.uuid,
                JSON.stringify(meta),
            );
            await reimportAsset(dbPath);

            const persistedMeta = await Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            if (!persistedMeta || !hasSliceBorder(persistedMeta, border)) {
                failures.push(`${relPath}: border 持久化校验失败`);
                continue;
            }

            changedAssets.push(relPath);
        } catch (error: any) {
            failures.push(`${relPath}: ${error?.message || error}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(`九宫格 meta 持久化失败，请等待资源导入后重试：\n${failures.join('\n')}`);
    }

    return changedAssets;
}

async function delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshAsset(dbPath: string): Promise<void> {
    try {
        await Editor.Message.request('asset-db', 'refresh-asset', dbPath);
    } catch (error: any) {
        console.warn('[PSD2CCC] refresh-asset failed:', dbPath, error?.message || error);
    }
}

async function reimportAsset(dbPath: string): Promise<void> {
    try {
        await Editor.Message.request('asset-db', 'reimport-asset', dbPath);
    } catch (error: any) {
        console.warn('[PSD2CCC] reimport-asset failed:', dbPath, error?.message || error);
    }
}

async function waitForSpriteFrames(atlasPath: string, expectedCount: number, timeoutMs = 15000): Promise<SpriteMap> {
    if (expectedCount <= 0) return {};

    const dbAtlasPath = `db://assets/${normalizePath(atlasPath)}`;
    const atlasParentPath = normalizePath(path.posix.dirname(atlasPath));
    const dbAtlasParentPath = atlasParentPath ? `db://assets/${atlasParentPath}` : 'db://assets';
    const start = Date.now();
    let refreshAt = 0;
    let lastMap: SpriteMap = {};
    let retriedPngReimport = false;

    await refreshAsset(dbAtlasParentPath);
    await refreshAsset(dbAtlasPath);

    while (Date.now() - start < timeoutMs) {
        if (Date.now() >= refreshAt) {
            await refreshAsset(dbAtlasParentPath);
            await refreshAsset(dbAtlasPath);
            refreshAt = Date.now() + 1500;
        }

        lastMap = resolveSpriteFrameUuids(atlasPath);
        if (Object.keys(lastMap).length >= expectedCount) {
            return lastMap;
        }

        const pngFiles = listAtlasPngFiles(atlasPath);
        if (!retriedPngReimport && pngFiles.length > 0 && Object.keys(lastMap).length === 0) {
            retriedPngReimport = true;
            for (const file of pngFiles) {
                await reimportAsset(`${dbAtlasPath}/${file}`);
            }
        }

        await delay(250);
    }

    return lastMap;
}

function getWarningPreview(warnings: string[]): string {
    if (warnings.length === 0) return '';
    const preview = warnings.slice(0, 5).join('\n');
    const suffix = warnings.length > 5 ? `\n... and ${warnings.length - 5} more` : '';
    return `${preview}${suffix}`;
}

function readSceneTree(jsonFilePath: string): SceneTree {
    return JSON.parse(fs.readFileSync(jsonFilePath, 'utf8')) as SceneTree;
}

async function buildUIFromData(data: SceneTree, options: BuildOptions): Promise<void> {
    try {
        if (!data.children?.length) {
            await Editor.Dialog.info('\u63d0\u793a', {
                title: '\u7a7a\u7ed3\u6784',
                detail: '\u6ca1\u6709\u53ef\u751f\u6210\u7684\u8282\u70b9',
                buttons: ['\u786e\u5b9a'],
            });
            return;
        }

        const atlasPath = data.atlasPath || '';
        const expectedSprites = collectRelativePaths(data.children).size;
        const waitForAssets = options.waitForAssets !== false;
        let spriteMap: SpriteMap = {};

        if (atlasPath && expectedSprites > 0) {
            const sliceMap = collectSliceBorders(data.children);

            if (!waitForAssets) {
                await applySliceBordersToMeta(atlasPath, sliceMap);
                spriteMap = mergeSpriteMaps(resolveSpriteFrameUuids(atlasPath), resolveSpriteFrameUuids('asset-art/atlas/common'));

                const dirPath = path.join(Editor.Project.path, 'assets', atlasPath);
                if (fs.existsSync(dirPath)) {
                    const pngFiles = fs.readdirSync(dirPath).filter((file) => file.endsWith('.png'));
                    if (Object.keys(spriteMap).length === 0 && pngFiles.length > 0) {
                        await Editor.Dialog.warn('\u8b66\u544a', {
                            title: '\u8d44\u6e90\u5bfc\u5165\u672a\u5b8c\u6210',
                            detail: `\u68c0\u6d4b\u5230 ${pngFiles.length} \u5f20\u56fe\u7247\uff0c\u4f46\u5f53\u524d\u8fd8\u6ca1\u6709\u53ef\u7528\u7684 SpriteFrame\uff0c\u8bf7\u7b49\u8d44\u6e90\u5bfc\u5165\u5b8c\u6210\u540e\u91cd\u8bd5\u3002`,
                            buttons: ['\u786e\u5b9a'],
                        });
                        return;
                    }
                }
            } else {
                const initialSpriteMap = await waitForSpriteFrames(atlasPath, expectedSprites);
                const changedSliceAssets = await applySliceBordersToMeta(atlasPath, sliceMap);

                if (changedSliceAssets.length > 0) {
                    await delay(250);
                }

                spriteMap = Object.keys(sliceMap).length > 0
                    ? await waitForSpriteFrames(atlasPath, expectedSprites)
                    : initialSpriteMap;
                spriteMap = mergeSpriteMaps(spriteMap, resolveSpriteFrameUuids('asset-art/atlas/common'));

                if (Object.keys(spriteMap).length < expectedSprites) {
                    await Editor.Dialog.warn('\u8b66\u544a', {
                        title: '\u8d44\u6e90\u5bfc\u5165\u672a\u5b8c\u6210',
                        detail: `\u68c0\u6d4b\u5230 ${expectedSprites} \u5f20\u56fe\u7247\uff0c\u4f46\u5f53\u524d\u53ea\u89e3\u6790\u5230 ${Object.keys(spriteMap).length} \u4e2a SpriteFrame\uff0c\u8bf7\u7b49\u5f85\u8d44\u6e90\u5bfc\u5165\u5b8c\u6210\u540e\u91cd\u8bd5\u3002`,
                        buttons: ['\u786e\u5b9a'],
                    });
                    return;
                }
            }
        }

        const psdName = data.psdName || path.basename(options.sourcePath, path.extname(options.sourcePath));
        const uiNodeName = `${psdName}UI`;

        const buildResult = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'psd2ccc',
            method: 'buildNodes',
            args: [uiNodeName, JSON.stringify(data), JSON.stringify(spriteMap)],
        });

        const warnings = options.warnings || [];
        const warningPreview = getWarningPreview(warnings);
        const exportDetail = typeof options.exportedCount === 'number'
            ? `\nPNG: ${options.exportedCount}`
            : '';
        const warningDetail = warnings.length > 0
            ? `\nWarnings: ${warnings.length}\n${warningPreview}`
            : '';

        await Editor.Dialog.info('\u6210\u529f', {
            title: 'PSD\u751f\u6210UI\u5b8c\u6210',
            detail: `Source: ${options.sourceLabel}\nRoot: ${uiNodeName}\nNodes: ${buildResult?.count ?? '?'}${exportDetail}${warningDetail}`,
            buttons: ['\u786e\u5b9a'],
        });
    } catch (error: any) {
        console.error('[PSD2CCC] Failed to build UI:', error);
        await Editor.Dialog.info('\u9519\u8bef', {
            title: 'PSD\u751f\u6210UI\u5931\u8d25',
            detail: error?.message || String(error),
            buttons: ['\u786e\u5b9a'],
        });
    }
}

async function buildUIFromJSON(jsonFilePath: string): Promise<void> {
    const data = readSceneTree(jsonFilePath);
    await buildUIFromData(data, {
        sourcePath: jsonFilePath,
        sourceLabel: path.basename(jsonFilePath),
        waitForAssets: false,
    });
}

module.exports = {
    onAssetMenu(assetInfo: { isDirectory: boolean; name: string; file: string }) {
        if (!assetInfo.name) {
            return [];
        }

        const isJsonFile = /\.json$/i.test(assetInfo.name);
        const isStructure = /-structure\.json$/i.test(assetInfo.name);
        const items = [];

        if (isJsonFile) {
            items.push({
                label: 'PSD\u751f\u6210UI',
                enabled: isStructure,
                visible: true,
                async click() {
                    await buildUIFromJSON(assetInfo.file);
                },
            });
        }

        return items;
    },
};

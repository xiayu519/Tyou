"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function normalizePath(input) {
    return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
function getSpriteFrameUuidFromMeta(metaPath) {
    try {
        if (!fs_1.default.existsSync(metaPath))
            return null;
        const meta = JSON.parse(fs_1.default.readFileSync(metaPath, 'utf8'));
        if (!meta.subMetas)
            return null;
        for (const key of Object.keys(meta.subMetas)) {
            const sub = meta.subMetas[key];
            if (sub.importer === 'sprite-frame' && sub.uuid) {
                return sub.uuid;
            }
        }
    }
    catch (error) {
        console.warn('[PSD2CCC] Failed to read sprite meta:', metaPath, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    return null;
}
function resolveSpriteFrameUuids(atlasPath) {
    const spriteMap = {};
    const dirPath = path_1.default.join(Editor.Project.path, 'assets', atlasPath);
    if (!fs_1.default.existsSync(dirPath))
        return spriteMap;
    for (const file of fs_1.default.readdirSync(dirPath)) {
        if (!file.endsWith('.png'))
            continue;
        const baseName = file.replace(/\.png$/i, '');
        const metaPath = path_1.default.join(dirPath, `${file}.meta`);
        const uuid = getSpriteFrameUuidFromMeta(metaPath);
        if (uuid) {
            spriteMap[baseName] = uuid;
        }
    }
    return spriteMap;
}
function mergeSpriteMaps(...maps) {
    const merged = {};
    for (const map of maps) {
        Object.assign(merged, map);
    }
    return merged;
}
function listAtlasPngFiles(atlasPath) {
    const dirPath = path_1.default.join(Editor.Project.path, 'assets', atlasPath);
    if (!fs_1.default.existsSync(dirPath))
        return [];
    return fs_1.default.readdirSync(dirPath).filter((file) => file.endsWith('.png'));
}
function collectSliceBorders(children) {
    var _a;
    const map = {};
    if (!children)
        return map;
    for (const child of children) {
        if (child.type === 'png' && child.sliceBorder && child.relativePath) {
            map[child.relativePath] = child.sliceBorder;
        }
        if ((_a = child.children) === null || _a === void 0 ? void 0 : _a.length) {
            Object.assign(map, collectSliceBorders(child.children));
        }
    }
    return map;
}
function collectRelativePaths(children, out = new Set()) {
    var _a;
    if (!children)
        return out;
    for (const child of children) {
        if (child.type === 'png' && child.relativePath) {
            out.add(child.relativePath);
        }
        if ((_a = child.children) === null || _a === void 0 ? void 0 : _a.length) {
            collectRelativePaths(child.children, out);
        }
    }
    return out;
}
function applySliceBordersToMeta(atlasPath, sliceMap) {
    const changedAssets = [];
    if (Object.keys(sliceMap).length === 0)
        return changedAssets;
    const dirPath = path_1.default.join(Editor.Project.path, 'assets', atlasPath);
    if (!fs_1.default.existsSync(dirPath))
        return changedAssets;
    for (const relPath of Object.keys(sliceMap)) {
        const metaPath = path_1.default.join(dirPath, `${relPath}.png.meta`);
        if (!fs_1.default.existsSync(metaPath))
            continue;
        try {
            const border = sliceMap[relPath];
            const meta = JSON.parse(fs_1.default.readFileSync(metaPath, 'utf8'));
            if (!meta.subMetas)
                continue;
            let modified = false;
            for (const key of Object.keys(meta.subMetas)) {
                const sub = meta.subMetas[key];
                if (sub.importer === 'sprite-frame' && sub.userData) {
                    sub.userData.borderTop = border.top;
                    sub.userData.borderBottom = border.bottom;
                    sub.userData.borderLeft = border.left;
                    sub.userData.borderRight = border.right;
                    modified = true;
                }
            }
            if (modified) {
                fs_1.default.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
                changedAssets.push(relPath);
            }
        }
        catch (error) {
            console.warn('[PSD2CCC] Failed to write slice border meta:', metaPath, (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
    return changedAssets;
}
async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
async function refreshAsset(dbPath) {
    try {
        await Editor.Message.request('asset-db', 'refresh-asset', dbPath);
    }
    catch (error) {
        console.warn('[PSD2CCC] refresh-asset failed:', dbPath, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
}
async function reimportAsset(dbPath) {
    try {
        await Editor.Message.request('asset-db', 'reimport-asset', dbPath);
    }
    catch (error) {
        console.warn('[PSD2CCC] reimport-asset failed:', dbPath, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
}
async function waitForSpriteFrames(atlasPath, expectedCount, timeoutMs = 15000) {
    if (expectedCount <= 0)
        return {};
    const dbAtlasPath = `db://assets/${normalizePath(atlasPath)}`;
    const atlasParentPath = normalizePath(path_1.default.posix.dirname(atlasPath));
    const dbAtlasParentPath = atlasParentPath ? `db://assets/${atlasParentPath}` : 'db://assets';
    const start = Date.now();
    let refreshAt = 0;
    let lastMap = {};
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
function getWarningPreview(warnings) {
    if (warnings.length === 0)
        return '';
    const preview = warnings.slice(0, 5).join('\n');
    const suffix = warnings.length > 5 ? `\n... and ${warnings.length - 5} more` : '';
    return `${preview}${suffix}`;
}
function readSceneTree(jsonFilePath) {
    return JSON.parse(fs_1.default.readFileSync(jsonFilePath, 'utf8'));
}
async function buildUIFromData(data, options) {
    var _a, _b;
    try {
        if (!((_a = data.children) === null || _a === void 0 ? void 0 : _a.length)) {
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
        let spriteMap = {};
        if (atlasPath && expectedSprites > 0) {
            const sliceMap = collectSliceBorders(data.children);
            if (!waitForAssets) {
                applySliceBordersToMeta(atlasPath, sliceMap);
                spriteMap = mergeSpriteMaps(resolveSpriteFrameUuids(atlasPath), resolveSpriteFrameUuids('asset-art/atlas/common'));
                const dirPath = path_1.default.join(Editor.Project.path, 'assets', atlasPath);
                if (fs_1.default.existsSync(dirPath)) {
                    const pngFiles = fs_1.default.readdirSync(dirPath).filter((file) => file.endsWith('.png'));
                    if (Object.keys(spriteMap).length === 0 && pngFiles.length > 0) {
                        await Editor.Dialog.warn('\u8b66\u544a', {
                            title: '\u8d44\u6e90\u5bfc\u5165\u672a\u5b8c\u6210',
                            detail: `\u68c0\u6d4b\u5230 ${pngFiles.length} \u5f20\u56fe\u7247\uff0c\u4f46\u5f53\u524d\u8fd8\u6ca1\u6709\u53ef\u7528\u7684 SpriteFrame\uff0c\u8bf7\u7b49\u8d44\u6e90\u5bfc\u5165\u5b8c\u6210\u540e\u91cd\u8bd5\u3002`,
                            buttons: ['\u786e\u5b9a'],
                        });
                        return;
                    }
                }
            }
            else {
                const initialSpriteMap = await waitForSpriteFrames(atlasPath, expectedSprites);
                const changedSliceAssets = applySliceBordersToMeta(atlasPath, sliceMap);
                for (const relPath of changedSliceAssets) {
                    await reimportAsset(`db://assets/${normalizePath(atlasPath)}/${relPath}.png`);
                }
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
        const psdName = data.psdName || path_1.default.basename(options.sourcePath, path_1.default.extname(options.sourcePath));
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
            detail: `Source: ${options.sourceLabel}\nRoot: ${uiNodeName}\nNodes: ${(_b = buildResult === null || buildResult === void 0 ? void 0 : buildResult.count) !== null && _b !== void 0 ? _b : '?'}${exportDetail}${warningDetail}`,
            buttons: ['\u786e\u5b9a'],
        });
    }
    catch (error) {
        console.error('[PSD2CCC] Failed to build UI:', error);
        await Editor.Dialog.info('\u9519\u8bef', {
            title: 'PSD\u751f\u6210UI\u5931\u8d25',
            detail: (error === null || error === void 0 ? void 0 : error.message) || String(error),
            buttons: ['\u786e\u5b9a'],
        });
    }
}
async function buildUIFromJSON(jsonFilePath) {
    const data = readSceneTree(jsonFilePath);
    await buildUIFromData(data, {
        sourcePath: jsonFilePath,
        sourceLabel: path_1.default.basename(jsonFilePath),
        waitForAssets: false,
    });
}
module.exports = {
    onAssetMenu(assetInfo) {
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
//# sourceMappingURL=assets-menu.js.map
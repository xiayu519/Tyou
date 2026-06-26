import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

const COMMON_ATLAS_PATH = 'asset-art/atlas/common';
const ASSET_REF_TEXT_EXTS = new Set(['.prefab', '.scene', '.anim', '.mtl']);

type SpriteBorder = { top: number; right: number; bottom: number; left: number };

type PngPixels = {
    width: number;
    height: number;
    rgba: Buffer;
};

type SpriteMetaInfo = {
    imageUuid: string;
    spriteUuid: string;
    userData: Record<string, any>;
};

type SpriteAssetInfo = {
    atlasPath: string;
    baseName: string;
    pngPath: string;
    dbPath: string;
    metaPath: string;
    meta: SpriteMetaInfo;
    fingerprint: string;
};

type ReferenceTarget = {
    filePath: string;
    type: 'asset-json';
};

type CheckContext = {
    targets: ReferenceTarget[];
    assets: SpriteAssetInfo[];
    skipped: string[];
    sceneNodeUuid?: string;
};

type CommonTarget = {
    asset: SpriteAssetInfo;
    created: boolean;
};

type CheckReport = {
    groups: number;
    reusedCommon: number;
    createdCommon: number;
    replacedRefs: number;
    deleted: number;
    skipped: string[];
};

type CommonAtlasAssetInfo = { isDirectory: boolean; name: string; file: string };

type ProgressHandle = {
    update: (progress: number, message: string) => Promise<void>;
    close: () => Promise<void>;
};

function normalizePath(input: string): string {
    return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function toDbPath(absPath: string): string {
    const rel = path.relative(path.join(Editor.Project.path, 'assets'), absPath);
    return `db://assets/${normalizePath(rel)}`;
}

function assetsRoot(): string {
    return path.join(Editor.Project.path, 'assets');
}

function commonDir(): string {
    return path.join(assetsRoot(), COMMON_ATLAS_PATH);
}

function hashBuffer(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function sanitizeFileName(input: string): string {
    return String(input || '')
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
        .replace(/[. ]+$/g, '');
}

function stripToolSuffixes(input: string): string {
    return String(input || '')
        .replace(/[_](9s|scale9)[_]\d+[_]\d+[_]\d+[_]\d+$/i, '')
        .replace(/[_](9s|scale9)$/i, '')
        .replace(/\.img$/i, '');
}

function isLegacyHashCommonName(input: string): boolean {
    return /^common_[0-9a-f]{12}$/i.test(input);
}

async function requestProgress(method: string, ...args: any[]): Promise<any> {
    try {
        if (Editor.Progress?.[method]) {
            return await Editor.Progress[method](...args);
        }
        if (Editor.Message?.request) {
            return await Editor.Message.request('progress', method, ...args);
        }
    } catch {
        return null;
    }
    return null;
}

async function createProgress(title: string): Promise<ProgressHandle> {
    const handle = await requestProgress('create', { title, progress: 0 })
        || await requestProgress('open', title, 0)
        || null;

    return {
        async update(progress: number, message: string) {
            const value = Math.max(0, Math.min(1, progress));
            console.log(`[PSD2CCC] ${title}: ${Math.round(value * 100)}% ${message}`);
            if (handle && typeof handle === 'object') {
                if (typeof handle.update === 'function') {
                    await handle.update(value, message);
                    return;
                }
                if (typeof handle.progress === 'function') {
                    await handle.progress(value, message);
                    return;
                }
                if (typeof handle.setProgress === 'function') {
                    await handle.setProgress(value);
                    if (typeof handle.setMessage === 'function') await handle.setMessage(message);
                    return;
                }
                if (handle.id || handle.uuid) {
                    await requestProgress('update', handle.id || handle.uuid, value, message);
                    return;
                }
            }
            await requestProgress('update', value, message);
        },
        async close() {
            if (handle && typeof handle === 'object') {
                if (typeof handle.close === 'function') {
                    await handle.close();
                    return;
                }
                if (handle.id || handle.uuid) {
                    await requestProgress('close', handle.id || handle.uuid);
                    return;
                }
            }
            await requestProgress('close');
        },
    };
}

function readJson(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function pngInt32(buffer: Buffer, offset: number): number {
    return buffer.readUInt32BE(offset);
}

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function unfilterScanlines(raw: Buffer, width: number, height: number, stride: number, bpp: number): Buffer {
    const out = Buffer.alloc(width * height * stride);
    let inputOffset = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[inputOffset++];
        const rowOffset = y * width * stride;
        const prevOffset = rowOffset - width * stride;
        for (let x = 0; x < width * stride; x++) {
            const value = raw[inputOffset++];
            const left = x >= bpp ? out[rowOffset + x - bpp] : 0;
            const up = y > 0 ? out[prevOffset + x] : 0;
            const upLeft = y > 0 && x >= bpp ? out[prevOffset + x - bpp] : 0;
            let decoded: number;
            if (filter === 0) decoded = value;
            else if (filter === 1) decoded = value + left;
            else if (filter === 2) decoded = value + up;
            else if (filter === 3) decoded = value + Math.floor((left + up) / 2);
            else if (filter === 4) decoded = value + paeth(left, up, upLeft);
            else throw new Error(`Unsupported PNG filter: ${filter}`);
            out[rowOffset + x] = decoded & 0xff;
        }
    }
    return out;
}

function readPngPixels(filePath: string): PngPixels {
    const data = fs.readFileSync(filePath);
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (data.length < 8 || !data.subarray(0, 8).equals(signature)) {
        throw new Error('Not a PNG file');
    }

    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    let palette: Buffer | null = null;
    let transparency: Buffer | null = null;
    const idats: Buffer[] = [];
    let offset = 8;

    while (offset + 12 <= data.length) {
        const length = pngInt32(data, offset);
        const type = data.toString('ascii', offset + 4, offset + 8);
        const chunk = data.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;

        if (type === 'IHDR') {
            width = pngInt32(chunk, 0);
            height = pngInt32(chunk, 4);
            bitDepth = chunk[8];
            colorType = chunk[9];
            interlace = chunk[12];
        } else if (type === 'PLTE') {
            palette = Buffer.from(chunk);
        } else if (type === 'tRNS') {
            transparency = Buffer.from(chunk);
        } else if (type === 'IDAT') {
            idats.push(Buffer.from(chunk));
        } else if (type === 'IEND') {
            break;
        }
    }

    if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
    if (interlace !== 0) throw new Error('Interlaced PNG is not supported');
    if (width <= 0 || height <= 0 || idats.length === 0) throw new Error('Invalid PNG data');

    const channels = colorType === 6 ? 4
        : colorType === 2 ? 3
            : colorType === 4 ? 2
                : colorType === 0 || colorType === 3 ? 1
                    : 0;
    if (channels === 0) throw new Error(`Unsupported PNG color type: ${colorType}`);

    const raw = zlib.inflateSync(Buffer.concat(idats));
    const scan = unfilterScanlines(raw, width, height, channels, channels);
    const rgba = Buffer.alloc(width * height * 4);

    for (let i = 0; i < width * height; i++) {
        const src = i * channels;
        const dst = i * 4;
        if (colorType === 6) {
            rgba[dst] = scan[src];
            rgba[dst + 1] = scan[src + 1];
            rgba[dst + 2] = scan[src + 2];
            rgba[dst + 3] = scan[src + 3];
        } else if (colorType === 2) {
            rgba[dst] = scan[src];
            rgba[dst + 1] = scan[src + 1];
            rgba[dst + 2] = scan[src + 2];
            rgba[dst + 3] = 255;
        } else if (colorType === 4) {
            rgba[dst] = scan[src];
            rgba[dst + 1] = scan[src];
            rgba[dst + 2] = scan[src];
            rgba[dst + 3] = scan[src + 1];
        } else if (colorType === 0) {
            rgba[dst] = scan[src];
            rgba[dst + 1] = scan[src];
            rgba[dst + 2] = scan[src];
            rgba[dst + 3] = 255;
        } else if (colorType === 3) {
            if (!palette) throw new Error('Indexed PNG missing palette');
            const index = scan[src];
            const p = index * 3;
            rgba[dst] = palette[p] || 0;
            rgba[dst + 1] = palette[p + 1] || 0;
            rgba[dst + 2] = palette[p + 2] || 0;
            rgba[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255;
        }

        if (rgba[dst + 3] === 0) {
            rgba[dst] = 0;
            rgba[dst + 1] = 0;
            rgba[dst + 2] = 0;
        }
    }

    return { width, height, rgba };
}

function spriteSignature(userData: Record<string, any>): string {
    const keys = [
        'trimThreshold', 'rotated', 'offsetX', 'offsetY', 'trimX', 'trimY',
        'width', 'height', 'rawWidth', 'rawHeight',
        'borderTop', 'borderBottom', 'borderLeft', 'borderRight',
        'pixelsToUnit', 'pivotX', 'pivotY', 'meshType', 'trimType',
    ];
    const data: Record<string, any> = {};
    for (const key of keys) data[key] = userData ? userData[key] : undefined;
    return JSON.stringify(data);
}

function readSpriteMeta(metaPath: string): SpriteMetaInfo | null {
    if (!fs.existsSync(metaPath)) return null;
    const meta = readJson(metaPath);
    let spriteUuid = '';
    let userData: Record<string, any> = {};
    for (const key of Object.keys(meta.subMetas || {})) {
        const sub = meta.subMetas[key];
        if (sub.importer === 'sprite-frame' && sub.uuid) {
            spriteUuid = sub.uuid;
            userData = sub.userData || {};
            break;
        }
    }
    if (!meta.uuid || !spriteUuid) return null;
    return { imageUuid: meta.uuid, spriteUuid, userData };
}

function writeSpriteUserData(metaPath: string, userData: Record<string, any>) {
    const meta = readJson(metaPath);
    for (const key of Object.keys(meta.subMetas || {})) {
        const sub = meta.subMetas[key];
        if (sub.importer === 'sprite-frame') {
            sub.userData = { ...(sub.userData || {}), ...userData };
        }
    }
    writeJson(metaPath, meta);
}

function readSpriteAsset(pngPath: string, atlasPath: string): SpriteAssetInfo | null {
    const metaPath = `${pngPath}.meta`;
    const meta = readSpriteMeta(metaPath);
    if (!meta) return null;

    const pixels = readPngPixels(pngPath);
    const pixelHash = hashBuffer(Buffer.concat([
        Buffer.from(`${pixels.width}x${pixels.height}|`),
        pixels.rgba,
    ]));
    const fingerprint = `${pixelHash}|sprite=${spriteSignature(meta.userData)}`;
    const baseName = path.basename(pngPath, '.png');

    return {
        atlasPath,
        baseName,
        pngPath,
        dbPath: toDbPath(pngPath),
        metaPath,
        meta,
        fingerprint,
    };
}

function listPngAssets(atlasPath: string): SpriteAssetInfo[] {
    const dirPath = path.join(assetsRoot(), atlasPath);
    if (!fs.existsSync(dirPath)) return [];
    const out: SpriteAssetInfo[] = [];
    for (const file of fs.readdirSync(dirPath)) {
        if (!file.toLowerCase().endsWith('.png')) continue;
        try {
            const asset = readSpriteAsset(path.join(dirPath, file), atlasPath);
            if (asset) out.push(asset);
        } catch (error: any) {
            console.warn('[PSD2CCC] skip PNG:', file, error?.message || error);
        }
    }
    return out;
}

function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
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

async function deleteAsset(dbPath: string): Promise<boolean> {
    try {
        await Editor.Message.request('asset-db', 'delete-asset', dbPath);
        return true;
    } catch (error: any) {
        console.warn('[PSD2CCC] delete-asset failed:', dbPath, error?.message || error);
        return false;
    }
}

async function delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMeta(pngPath: string, timeoutMs = 10000): Promise<boolean> {
    const metaPath = `${pngPath}.meta`;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (fs.existsSync(metaPath) && readSpriteMeta(metaPath)) return true;
        await refreshAsset(toDbPath(pngPath));
        await delay(250);
    }
    return false;
}

function commonBaseNameFor(source: SpriteAssetInfo): string {
    return sanitizeFileName(stripToolSuffixes(source.baseName)) || 'image';
}

function commonSlotFor(source: SpriteAssetInfo): { name: string; targetPng: string; existing?: SpriteAssetInfo } {
    const baseName = commonBaseNameFor(source);
    let index = 0;
    while (true) {
        const name = index === 0 ? baseName : `${baseName}${index}`;
        const targetPng = path.join(commonDir(), `${name}.png`);
        if (!fs.existsSync(targetPng)) return { name, targetPng };

        try {
            const existing = readSpriteAsset(targetPng, COMMON_ATLAS_PATH);
            if (existing && existing.fingerprint === source.fingerprint) {
                return { name, targetPng, existing };
            }
        } catch (error: any) {
            console.warn('[PSD2CCC] skip occupied common name:', name, error?.message || error);
        }
        index++;
    }
}

function moveCommonAsset(existing: SpriteAssetInfo, targetPng: string): SpriteAssetInfo | null {
    if (path.normalize(existing.pngPath) === path.normalize(targetPng)) return existing;
    const targetMeta = `${targetPng}.meta`;
    if (fs.existsSync(targetPng) || fs.existsSync(targetMeta)) return null;

    fs.renameSync(existing.pngPath, targetPng);
    if (fs.existsSync(existing.metaPath)) {
        fs.renameSync(existing.metaPath, targetMeta);
    }
    return readSpriteAsset(targetPng, COMMON_ATLAS_PATH);
}

async function ensureCommonAsset(source: SpriteAssetInfo, report: CheckReport): Promise<CommonTarget | null> {
    ensureDir(commonDir());

    const slot = commonSlotFor(source);
    if (slot.existing) {
        report.reusedCommon++;
        return { asset: slot.existing, created: false };
    }

    const existing = listPngAssets(COMMON_ATLAS_PATH).find((asset) => asset.fingerprint === source.fingerprint);
    if (existing) {
        if (isLegacyHashCommonName(existing.baseName)) {
            const oldDbPath = existing.dbPath;
            const moved = moveCommonAsset(existing, slot.targetPng);
            if (moved) {
                await refreshAsset(oldDbPath);
                await refreshAsset(toDbPath(slot.targetPng));
                await reimportAsset(toDbPath(slot.targetPng));
                report.reusedCommon++;
                return { asset: moved, created: false };
            }
        }
        report.reusedCommon++;
        return { asset: existing, created: false };
    }

    const { name, targetPng } = slot;
    fs.copyFileSync(source.pngPath, targetPng);

    await refreshAsset(`db://assets/${COMMON_ATLAS_PATH}`);
    await refreshAsset(toDbPath(targetPng));
    await reimportAsset(toDbPath(targetPng));
    if (!(await waitForMeta(targetPng))) {
        report.skipped.push(`${name}.png: common meta 未生成`);
        return null;
    }

    writeSpriteUserData(`${targetPng}.meta`, source.meta.userData);
    await reimportAsset(toDbPath(targetPng));
    await delay(250);

    const common = readSpriteAsset(targetPng, COMMON_ATLAS_PATH);
    if (!common) {
        report.skipped.push(`${name}.png: common SpriteFrame 读取失败`);
        return null;
    }
    report.createdCommon++;
    return { asset: common, created: true };
}

function walkFiles(root: string, out: string[] = []): string[] {
    if (!fs.existsSync(root)) return out;
    const stat = fs.statSync(root);
    if (stat.isDirectory()) {
        for (const child of fs.readdirSync(root)) walkFiles(path.join(root, child), out);
    } else {
        out.push(root);
    }
    return out;
}

function textAssetFiles(): string[] {
    return walkFiles(assetsRoot()).filter((file) => ASSET_REF_TEXT_EXTS.has(path.extname(file).toLowerCase()));
}

function replaceInTextFile(filePath: string, replacements: Map<string, string>): number {
    let text = fs.readFileSync(filePath, 'utf8');
    let count = 0;
    for (const [from, to] of replacements) {
        const parts = text.split(from);
        if (parts.length > 1) {
            count += parts.length - 1;
            text = parts.join(to);
        }
    }
    if (count > 0) fs.writeFileSync(filePath, text, 'utf8');
    return count;
}

function hasExternalReference(asset: SpriteAssetInfo, ignoreFiles: Set<string>): boolean {
    const needles = [asset.meta.imageUuid, asset.meta.spriteUuid].filter(Boolean);
    for (const file of textAssetFiles()) {
        if (ignoreFiles.has(path.normalize(file))) continue;
        const text = fs.readFileSync(file, 'utf8');
        if (needles.some((needle) => text.includes(needle))) return true;
    }
    return false;
}

function replaceProjectUuidReferences(replacements: Map<string, string>, ignoreFiles: Set<string>): { count: number; files: Set<string> } {
    let count = 0;
    const files = new Set<string>();
    for (const file of textAssetFiles()) {
        if (ignoreFiles.has(path.normalize(file))) continue;
        const replaced = replaceInTextFile(file, replacements);
        if (replaced > 0) {
            count += replaced;
            files.add(file);
        }
    }
    return { count, files };
}

function spriteUuidsFromSceneRefs(refs: any[]): Set<string> {
    const uuidSet = new Set<string>();
    for (const ref of refs || []) {
        if (typeof ref === 'string') uuidSet.add(ref);
        else if (ref && typeof ref.spriteFrameUuid === 'string') uuidSet.add(ref.spriteFrameUuid);
    }
    return uuidSet;
}

function readSceneNodeAssets(nodeUuid: string, refs: any[], skipped: string[]): CheckContext {
    const uuidSet = spriteUuidsFromSceneRefs(refs);
    const atlasAssets = walkFiles(path.join(assetsRoot(), 'asset-art', 'atlas'))
        .filter((file) => file.toLowerCase().endsWith('.png'))
        .map((pngPath) => {
            const rel = normalizePath(path.relative(assetsRoot(), path.dirname(pngPath)));
            try { return readSpriteAsset(pngPath, rel); }
            catch (error: any) {
                skipped.push(`${path.basename(pngPath)}: ${error?.message || error}`);
                return null;
            }
        })
        .filter((asset): asset is SpriteAssetInfo => !!asset);
    const assets = atlasAssets.filter((asset) => uuidSet.has(asset.meta.spriteUuid) || uuidSet.has(asset.meta.imageUuid));
    return { targets: [], assets, skipped, sceneNodeUuid: nodeUuid };
}

function readPrefabSceneAssets(filePath: string, skipped: string[]): CheckContext {
    const text = fs.readFileSync(filePath, 'utf8');
    const uuidSet = new Set(Array.from(text.matchAll(/"__uuid__"\s*:\s*"([^"]+)"/g)).map((m) => m[1]));
    const atlasAssets = walkFiles(path.join(assetsRoot(), 'asset-art', 'atlas'))
        .filter((file) => file.toLowerCase().endsWith('.png'))
        .map((pngPath) => {
            const rel = normalizePath(path.relative(assetsRoot(), path.dirname(pngPath)));
            try { return readSpriteAsset(pngPath, rel); }
            catch (error: any) {
                skipped.push(`${path.basename(pngPath)}: ${error?.message || error}`);
                return null;
            }
        })
        .filter((asset): asset is SpriteAssetInfo => !!asset);
    const assets = atlasAssets.filter((asset) => uuidSet.has(asset.meta.spriteUuid) || uuidSet.has(asset.meta.imageUuid));
    return { targets: [{ filePath, type: 'asset-json' }], assets, skipped };
}

async function queryNode(nodeUuid: string): Promise<any | null> {
    try {
        return await Editor.Message.request('scene', 'query-node', nodeUuid);
    } catch (error: any) {
        console.warn('[PSD2CCC] query-node failed:', nodeUuid, error?.message || error);
        return null;
    }
}

async function assetDbPathToFile(dbPath: string): Promise<string> {
    try {
        const info = await Editor.Message.request('asset-db', 'query-asset-info', dbPath);
        return info?.file || '';
    } catch (error: any) {
        console.warn('[PSD2CCC] query asset info failed:', dbPath, error?.message || error);
        return '';
    }
}

function unwrapValue(value: any): any {
    return value && typeof value === 'object' && 'value' in value ? value.value : value;
}

function collectStringValues(input: any, out: string[] = []): string[] {
    const value = unwrapValue(input);
    if (!value) return out;
    if (typeof value === 'string') {
        out.push(value);
        return out;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectStringValues(item, out);
        return out;
    }
    if (typeof value === 'object') {
        for (const key of Object.keys(value)) collectStringValues(value[key], out);
    }
    return out;
}

async function resolvePrefabFileFromNode(nodeUuid: string): Promise<string> {
    const nodeInfo = await queryNode(nodeUuid);
    const candidates = collectStringValues(nodeInfo)
        .filter((value) => value.toLowerCase().endsWith('.prefab'));

    for (const candidate of candidates) {
        if (candidate.startsWith('db://')) {
            const file = await assetDbPathToFile(candidate);
            if (file) return file;
        } else if (fs.existsSync(candidate)) {
            return candidate;
        } else {
            const assetRelative = candidate.replace(/^assets[\\/]/i, '');
            const file = path.join(assetsRoot(), assetRelative);
            if (fs.existsSync(file)) return file;
        }
    }

    return '';
}

function readAtlasAssets(dirPath: string, skipped: string[]): CheckContext {
    const atlasPath = normalizePath(path.relative(assetsRoot(), dirPath));
    const assets = listPngAssets(atlasPath);
    const prefabSceneTargets = textAssetFiles()
        .filter((file) => file.endsWith('.prefab') || file.endsWith('.scene'))
        .filter((file) => {
            const text = fs.readFileSync(file, 'utf8');
            return assets.some((asset) => text.includes(asset.meta.spriteUuid) || text.includes(asset.meta.imageUuid));
        })
        .map((filePath) => ({ filePath, type: 'asset-json' as const }));
    return { targets: prefabSceneTargets, assets, skipped };
}

function collectContext(assetInfo: CommonAtlasAssetInfo): CheckContext {
    const skipped: string[] = [];
    if ((assetInfo as any).nodeUuid) {
        return readSceneNodeAssets((assetInfo as any).nodeUuid, (assetInfo as any).spriteRefs || [], skipped);
    }

    const ext = path.extname(assetInfo.file).toLowerCase();
    if (ext === '.prefab') {
        return readPrefabSceneAssets(assetInfo.file, skipped);
    }
    return { targets: [], assets: [], skipped: [`不支持的资源: ${assetInfo.file}`] };
}

export function isCommonAtlasCheckAsset(assetInfo: CommonAtlasAssetInfo): boolean {
    if (assetInfo.isDirectory || !assetInfo.file) return false;
    return path.extname(assetInfo.file).toLowerCase() === '.prefab';
}

async function replaceSceneNodeSpriteFrames(nodeUuid: string, replacements: Map<string, string>): Promise<number> {
    if (replacements.size === 0) return 0;
    try {
        return await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'psd2ccc',
            method: 'replaceSpriteFramesInNodeTree',
            args: [nodeUuid, JSON.stringify(Object.fromEntries(replacements))],
        }) || 0;
    } catch (error: any) {
        console.warn('[PSD2CCC] replace scene SpriteFrame failed:', error?.message || error);
        return 0;
    }
}

async function showNoSpriteFrameWarning(report: CheckReport): Promise<void> {
    await Editor.Dialog.warn('检查公共图集', {
        title: '没有可检查的 SpriteFrame',
        detail: report.skipped.join('\n') || '未找到可处理的 PNG/SpriteFrame 引用。',
        buttons: ['确定'],
    });
}

async function showCommonAtlasReport(report: CheckReport): Promise<void> {
    await Editor.Dialog.info('检查公共图集完成', {
        title: '检查公共图集完成',
        detail: [
            `重复组: ${report.groups}`,
            `复用 common: ${report.reusedCommon}`,
            `新建 common: ${report.createdCommon}`,
            `替换引用: ${report.replacedRefs}`,
            `删除重复图: ${report.deleted}`,
            report.skipped.length ? `跳过:\n${report.skipped.slice(0, 12).join('\n')}` : '',
        ].filter(Boolean).join('\n'),
        buttons: ['确定'],
    });
}

async function showCommonAtlasError(error: any): Promise<void> {
    console.error('[PSD2CCC] common atlas check failed:', error);
    await Editor.Dialog.warn('检查公共图集失败', {
        title: '检查公共图集失败',
        detail: error?.message || String(error),
        buttons: ['确定'],
    });
}

async function runCommonAtlasCheckContext(context: CheckContext, report: CheckReport, progress?: ProgressHandle): Promise<void> {
    await progress?.update(0.08, '收集 SpriteFrame 引用');
    report.skipped.push(...context.skipped);
    if (context.assets.length === 0) {
        await showNoSpriteFrameWarning(report);
        return;
    }

    await progress?.update(0.18, '计算重复资源指纹');
    const groups = new Map<string, SpriteAssetInfo[]>();
    for (const asset of context.assets) {
        if (asset.atlasPath === COMMON_ATLAS_PATH) continue;
        if (!groups.has(asset.fingerprint)) groups.set(asset.fingerprint, []);
        groups.get(asset.fingerprint)!.push(asset);
    }

    const candidateGroups = Array.from(groups.values()).filter((group) => {
        const commonExisting = listPngAssets(COMMON_ATLAS_PATH).find((asset) => asset.fingerprint === group[0].fingerprint);
        return group.length >= 2 || !!commonExisting;
    });
    let groupIndex = 0;
    for (const group of candidateGroups) {
        groupIndex++;
        await progress?.update(0.2 + (groupIndex - 1) / Math.max(1, candidateGroups.length) * 0.65, `处理重复组 ${groupIndex}/${candidateGroups.length}`);
        report.groups++;

        const common = await ensureCommonAsset(group[0], report);
        if (!common) continue;

        const uuidReplacements = new Map<string, string>();
        for (const dup of group) {
            uuidReplacements.set(dup.meta.spriteUuid, common.asset.meta.spriteUuid);
            uuidReplacements.set(dup.meta.imageUuid, common.asset.meta.imageUuid);
        }

        const changedFiles = new Set<string>();
        if (context.sceneNodeUuid) {
            await progress?.update(0.35 + groupIndex / Math.max(1, candidateGroups.length) * 0.25, '替换节点 SpriteFrame 引用');
            report.replacedRefs += await replaceSceneNodeSpriteFrames(context.sceneNodeUuid, uuidReplacements);
        }

        for (const target of context.targets) {
            const replaced = replaceInTextFile(target.filePath, uuidReplacements);
            if (replaced > 0) {
                changedFiles.add(target.filePath);
                report.replacedRefs += replaced;
            }
        }

        if (changedFiles.size > 0) {
            for (const file of changedFiles) await refreshAsset(toDbPath(file));
            await delay(250);
        }

        const ignoreFiles = new Set<string>([
            ...Array.from(changedFiles).map((file) => path.normalize(file)),
        ]);
        const projectReplaced = replaceProjectUuidReferences(uuidReplacements, ignoreFiles);
        if (projectReplaced.count > 0) {
            await progress?.update(0.55 + groupIndex / Math.max(1, candidateGroups.length) * 0.2, '同步 Prefab/Scene 引用');
            report.replacedRefs += projectReplaced.count;
            for (const file of projectReplaced.files) {
                changedFiles.add(file);
                ignoreFiles.add(path.normalize(file));
                await refreshAsset(toDbPath(file));
            }
            await delay(250);
        }

        for (const dup of group) {
            await progress?.update(0.72 + groupIndex / Math.max(1, candidateGroups.length) * 0.18, '删除重复图片');
            if (dup.pngPath === common.asset.pngPath) continue;
            ignoreFiles.add(path.normalize(dup.metaPath));
            ignoreFiles.add(path.normalize(`${dup.pngPath}.meta`));
            if (hasExternalReference(dup, ignoreFiles)) {
                report.skipped.push(`${dup.baseName}: 仍有外部引用，跳过删除`);
                continue;
            }
            if (await deleteAsset(dup.dbPath)) report.deleted++;
            else report.skipped.push(`${dup.baseName}: AssetDB 删除失败，已保留`);
        }
    }

    await progress?.update(0.95, '刷新资源');
    await refreshAsset(`db://assets/${COMMON_ATLAS_PATH}`);
    for (const target of context.targets) await refreshAsset(toDbPath(target.filePath));
}

export async function runCommonAtlasCheck(assetInfo: CommonAtlasAssetInfo): Promise<void> {
    const report: CheckReport = {
        groups: 0,
        reusedCommon: 0,
        createdCommon: 0,
        replacedRefs: 0,
        deleted: 0,
        skipped: [],
    };

    const progress = await createProgress('检查公共图集');
    try {
        const context = collectContext(assetInfo);
        await runCommonAtlasCheckContext(context, report, progress);
        await progress.update(1, '完成');
        await showCommonAtlasReport(report);
    } catch (error: any) {
        await showCommonAtlasError(error);
    } finally {
        await progress.close();
    }
}

export const COMMON_ATLAS_DB_PATH = `db://assets/${COMMON_ATLAS_PATH}`;

export async function runCommonAtlasCheckForNode(nodeUuid: string): Promise<void> {
    let spriteRefs: any[] = [];
    try {
        spriteRefs = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'psd2ccc',
            method: 'collectSpriteFrameRefs',
            args: [nodeUuid],
        }) || [];
    } catch (error: any) {
        console.warn('[PSD2CCC] collect scene SpriteFrame refs failed:', error?.message || error);
    }

    const prefabFile = await resolvePrefabFileFromNode(nodeUuid);
    const context = collectContext({
        isDirectory: false,
        name: nodeUuid,
        file: '',
        nodeUuid,
        spriteRefs,
    } as any);

    if (prefabFile && fs.existsSync(prefabFile)) {
        const prefabContext = readPrefabSceneAssets(prefabFile, context.skipped);
        context.targets.push(...prefabContext.targets);
        const seen = new Set(context.assets.map((asset) => asset.pngPath));
        for (const asset of prefabContext.assets) {
            if (!seen.has(asset.pngPath)) {
                seen.add(asset.pngPath);
                context.assets.push(asset);
            }
        }
    }

    const report: CheckReport = {
        groups: 0,
        reusedCommon: 0,
        createdCommon: 0,
        replacedRefs: 0,
        deleted: 0,
        skipped: [],
    };

    const progress = await createProgress('检查公共图集');
    try {
        await progress.update(0.03, '收集节点 SpriteFrame');
        await runCommonAtlasCheckContext(context, report, progress);
        await progress.update(1, '完成');
        await showCommonAtlasReport(report);
    } catch (error: any) {
        await showCommonAtlasError(error);
    } finally {
        await progress.close();
    }
}

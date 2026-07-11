import { RawAssetInfo } from './types';
import { enrichGlobalScriptRelations } from './global-script-analyzer';

export type AssetDbLoadResult = {
    assets: RawAssetInfo[];
    warning: string;
};

function timeoutPromise<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} 超时（${timeoutMs}ms）`)), timeoutMs);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

async function queryAssets(timeoutMs: number): Promise<RawAssetInfo[]> {
    const result = await timeoutPromise<any[]>(
        Editor.Message.request('asset-db', 'query-assets'),
        timeoutMs,
        '查询项目资源',
    );
    if (!Array.isArray(result)) return [];
    return (result as RawAssetInfo[]).filter((asset) => {
        return String(asset.url || asset.source || '').startsWith('db://assets');
    });
}

function collectTopLevelAssets(assets: RawAssetInfo[]): RawAssetInfo[] {
    const seen = new Set<string>();
    const result: RawAssetInfo[] = [];
    for (const asset of assets) {
        if (!asset?.uuid || asset.isDirectory || seen.has(asset.uuid)) continue;
        seen.add(asset.uuid);
        result.push(asset);
    }
    return result;
}

async function queryRelations(asset: RawAssetInfo, timeoutMs: number): Promise<RawAssetInfo> {
    if (Array.isArray(asset.depends)) {
        return {
            ...asset,
            dependeds: Array.isArray(asset.dependeds) ? asset.dependeds : [],
        };
    }

    const depends = await timeoutPromise<string[]>(
        Editor.Message.request('asset-db', 'query-asset-dependencies', asset.uuid, 'all'),
        timeoutMs,
        `查询 ${asset.url || asset.uuid} 的引用`,
    );

    return {
        ...asset,
        depends: Array.isArray(depends) ? depends : [],
        dependeds: Array.isArray(asset.dependeds) ? asset.dependeds : [],
    };
}

async function hydrateRelations(
    assets: RawAssetInfo[],
    timeoutMs: number,
    concurrency: number,
): Promise<AssetDbLoadResult> {
    const candidates = collectTopLevelAssets(assets);
    const replacement = new Map<string, RawAssetInfo>();
    let failed = 0;
    let cursor = 0;

    const worker = async () => {
        while (cursor < candidates.length) {
            const index = cursor++;
            const asset = candidates[index];
            try {
                replacement.set(asset.uuid, await queryRelations(asset, timeoutMs));
            } catch (error: any) {
                failed += 1;
                replacement.set(asset.uuid, {
                    ...asset,
                    depends: Array.isArray(asset.depends) ? asset.depends : [],
                    dependeds: Array.isArray(asset.dependeds) ? asset.dependeds : [],
                });
            }

            if (index > 0 && index % 50 === 0) {
                await new Promise<void>((resolve) => setTimeout(resolve, 0));
            }
        }
    };

    const workerCount = Math.max(1, Math.min(concurrency, candidates.length || 1));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return {
        assets: assets.map((asset) => replacement.get(asset.uuid) || asset),
        warning: failed > 0 ? `${failed} 个资源的依赖查询失败，当前快照可能不完整` : '',
    };
}

export async function loadAssetDbGraph(
    assetListTimeoutMs = 30000,
    relationTimeoutMs = 8000,
    concurrency = 4,
): Promise<AssetDbLoadResult> {
    const assets = await queryAssets(assetListTimeoutMs);
    const relations = await hydrateRelations(assets, relationTimeoutMs, concurrency);
    const globals = await enrichGlobalScriptRelations(relations.assets);
    return {
        assets: globals.assets,
        warning: [relations.warning, globals.warning].filter(Boolean).join('；'),
    };
}

import fs from 'fs';
import path from 'path';
import { DependencySnapshot } from './types';

const CACHE_VERSION = 4;
const CACHE_DIRECTORY = 'asset-dependency-viewer';
const CACHE_FILENAME = 'dependency-cache.json';

type CachePayload = {
    version: number;
    projectUuid: string;
    snapshot: DependencySnapshot;
};

export function getSnapshotCachePath(): string {
    return path.join(Editor.Project.tmpDir, CACHE_DIRECTORY, CACHE_FILENAME);
}

export async function snapshotCacheExists(): Promise<boolean> {
    try {
        await fs.promises.access(getSnapshotCachePath(), fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function readSnapshotCache(): Promise<DependencySnapshot | null> {
    const cachePath = getSnapshotCachePath();
    try {
        const content = await fs.promises.readFile(cachePath, 'utf8');
        const payload = JSON.parse(content) as CachePayload;
        if (payload.version !== CACHE_VERSION || payload.projectUuid !== Editor.Project.uuid) {
            return null;
        }
        const snapshot = payload.snapshot;
        if (!snapshot || !Array.isArray(snapshot.rows) || snapshot.revision <= 0) return null;
        return {
            ...snapshot,
            enabled: true,
            fromCache: true,
            refreshing: false,
            stale: false,
            error: '',
        };
    } catch (error: any) {
        if (error?.code !== 'ENOENT') {
            console.warn('[AssetDependencyViewer] cache ignored:', error?.message || error);
        }
        return null;
    }
}

export async function writeSnapshotCache(snapshot: DependencySnapshot): Promise<void> {
    if (!snapshot.enabled || snapshot.refreshing || snapshot.stale || snapshot.revision <= 0) return;
    const cachePath = getSnapshotCachePath();
    const directory = path.dirname(cachePath);
    const temporaryPath = `${cachePath}.tmp`;
    const payload: CachePayload = {
        version: CACHE_VERSION,
        projectUuid: Editor.Project.uuid,
        snapshot: {
            ...snapshot,
            fromCache: false,
            error: '',
        },
    };

    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(temporaryPath, JSON.stringify(payload), 'utf8');
    await fs.promises.rm(cachePath, { force: true });
    await fs.promises.rename(temporaryPath, cachePath);
}

export async function deleteSnapshotCache(): Promise<void> {
    const cachePath = getSnapshotCachePath();
    await Promise.all([
        fs.promises.rm(cachePath, { force: true }),
        fs.promises.rm(`${cachePath}.tmp`, { force: true }),
    ]);
}

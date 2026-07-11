import { DependencyIndexService } from './dependency-index-service';
import { readEnabledState, writeEnabledState } from './enabled-state';
import {
    deleteSnapshotCache,
    readSnapshotCache,
    snapshotCacheExists,
    writeSnapshotCache,
} from './snapshot-cache';
import { DependencySnapshot, DetailView } from './types';
import { getScopeForAssetInfo, normalizeScopePath } from './scope-utils';

let service: DependencyIndexService | null = null;
let unsubscribe: (() => void) | null = null;
let currentDetail: DetailView | null = null;
let restorePromise: Promise<void> = Promise.resolve();
let cacheWriteChain: Promise<void> = Promise.resolve();
let assetDbReady = false;
let currentScopePath = '';

function disabledSnapshot(): DependencySnapshot {
    return {
        enabled: false,
        fromCache: false,
        revision: 0,
        generatedAt: 0,
        refreshing: false,
        stale: false,
        error: '',
        rows: [],
        assetCount: 0,
        rawNodeCount: 0,
        edgeCount: 0,
    };
}

function broadcastSnapshot(snapshot: DependencySnapshot): void {
    try {
        Editor.Message.send('asset-dependency-viewer', 'snapshot-updated', snapshot);
    } catch (error: any) {
        console.warn('[AssetDependencyViewer] snapshot broadcast failed:', error?.message || error);
    }
}

function broadcastScope(): void {
    try {
        Editor.Message.send('asset-dependency-viewer', 'scope-updated', currentScopePath);
    } catch (error: any) {
        console.warn('[AssetDependencyViewer] scope broadcast failed:', error?.message || error);
    }
}

async function setScopeFromIdentity(uuidOrPath: string): Promise<string> {
    const info = await Editor.Message.request('asset-db', 'query-asset-info', uuidOrPath);
    currentScopePath = getScopeForAssetInfo(info);
    broadcastScope();
    return currentScopePath;
}

function queueCacheWrite(snapshot: DependencySnapshot): void {
    if (!snapshot.enabled || snapshot.refreshing || snapshot.stale || snapshot.revision <= 0) return;
    cacheWriteChain = cacheWriteChain
        .then(() => writeSnapshotCache(snapshot))
        .catch((error: any) => {
            console.warn('[AssetDependencyViewer] cache write failed:', error?.message || error);
        });
}

function attachService(initialSnapshot?: DependencySnapshot): DependencyIndexService {
    if (service) return service;
    service = new DependencyIndexService(initialSnapshot);
    unsubscribe = service.subscribe((snapshot) => {
        broadcastSnapshot(snapshot);
        queueCacheWrite(snapshot);
    });
    return service;
}

function detachService(): void {
    unsubscribe?.();
    unsubscribe = null;
    service?.dispose();
    service = null;
    currentDetail = null;
}

async function restoreEnabledState(): Promise<void> {
    const persisted = await readEnabledState();
    if (persisted === false || service) return;
    if (persisted === null) {
        if (!await snapshotCacheExists()) return;
        try {
            await writeEnabledState(true);
        } catch (error: any) {
            console.warn('[AssetDependencyViewer] legacy enabled state migration failed:', error?.message || error);
        }
    }
    const cached = await readSnapshotCache();
    const index = attachService(cached || undefined);
    broadcastSnapshot(index.getSnapshot());
    if (!cached && assetDbReady) index.scheduleRefresh(0);
}

async function openOverviewPanel(): Promise<boolean> {
    try {
        const opened = await Editor.Panel.openBeside?.(
            'assets',
            'asset-dependency-viewer.overview',
        );
        if (opened) return true;
    } catch (error: any) {
        console.warn('[AssetDependencyViewer] openBeside failed:', error?.message || error);
    }
    return await Editor.Panel.open('asset-dependency-viewer.overview');
}

async function revealAsset(uuidOrPath: string): Promise<boolean> {
    try {
        const info = await Editor.Message.request('asset-db', 'query-asset-info', uuidOrPath);
        const uuid = info?.uuid || uuidOrPath;
        if (!uuid) return false;

        Editor.Selection.clear('asset');
        Editor.Selection.select('asset', uuid);
        await Editor.Panel.focus?.('assets');

        try {
            Editor.Message.send?.('assets', 'twinkle', uuid);
        } catch {
            // Selection and focus are the supported fallback.
        }
        return true;
    } catch (error: any) {
        console.warn('[AssetDependencyViewer] reveal asset failed:', uuidOrPath, error?.message || error);
        return false;
    }
}

export const methods: Record<string, (...args: any[]) => any> = {
    async openOverview() {
        await restorePromise;
        return await openOverviewPanel();
    },
    requestScope() {
        return currentScopePath;
    },
    setScope(scopePath: string) {
        currentScopePath = normalizeScopePath(scopePath || '');
        broadcastScope();
        return currentScopePath;
    },
    async openScope(uuidOrPath: string) {
        await restorePromise;
        await setScopeFromIdentity(uuidOrPath);
        const opened = await openOverviewPanel();
        broadcastScope();
        return opened;
    },
    async useCurrentSelection() {
        const selected = Editor.Selection.getLastSelected?.('asset') || '';
        if (!selected) {
            currentScopePath = '';
            broadcastScope();
            return currentScopePath;
        }
        return await setScopeFromIdentity(selected);
    },
    async requestSnapshot() {
        await restorePromise;
        return service?.getSnapshot() || disabledSnapshot();
    },
    async isEnabled() {
        await restorePromise;
        return Boolean(service);
    },
    async enable() {
        await restorePromise;
        await writeEnabledState(true);
        const index = attachService();
        broadcastSnapshot(index.getSnapshot());
        if (index.getSnapshot().revision > 0) return index.getSnapshot();
        return await index.refreshNow();
    },
    async disable() {
        await restorePromise;
        detachService();
        try {
            await writeEnabledState(false);
        } catch (error: any) {
            console.warn('[AssetDependencyViewer] disabled locally, but enabled state save failed:', error?.message || error);
        }
        await cacheWriteChain;
        await deleteSnapshotCache();
        const snapshot = disabledSnapshot();
        broadcastSnapshot(snapshot);
        return snapshot;
    },
    async refresh() {
        await restorePromise;
        return service ? await service.refreshNow() : disabledSnapshot();
    },
    async showDetail(uuidOrPath: string) {
        await restorePromise;
        if (!service) {
            await openOverviewPanel();
            broadcastSnapshot(disabledSnapshot());
            return false;
        }
        currentDetail = service.getDetail(uuidOrPath);
        if (!currentDetail) return false;
        const opened = await Editor.Panel.open('asset-dependency-viewer.detail');
        Editor.Message.send('asset-dependency-viewer', 'detail-updated', currentDetail);
        return opened;
    },
    requestDetail() {
        return currentDetail;
    },
    async revealAsset(uuidOrPath: string) {
        return await revealAsset(uuidOrPath);
    },
    assetDbReady() {
        assetDbReady = true;
        void restorePromise.then(() => {
            if (service && service.getSnapshot().revision === 0) {
                service.scheduleRefresh(100);
            }
        });
    },
    assetDbChanged() {
        service?.scheduleRefresh();
    },
};

export function load() {
    restorePromise = restoreEnabledState().catch((error: any) => {
        console.warn('[AssetDependencyViewer] cache restore failed:', error?.message || error);
    });
}

export function unload() {
    detachService();
    currentScopePath = '';
}

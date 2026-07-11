import { loadAssetDbGraph } from './asset-db-source';
import { buildDependencyGraph } from './dependency-graph';
import { DependencySnapshot, DetailView } from './types';

function emptySnapshot(): DependencySnapshot {
    return {
        enabled: true,
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

export class DependencyIndexService {
    private snapshot: DependencySnapshot;
    private revision: number;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private refreshPromise: Promise<DependencySnapshot> | null = null;
    private dirty = false;
    private disposed = false;
    private autoRefreshBlockedUntil = 0;
    private readonly listeners = new Set<(snapshot: DependencySnapshot) => void>();

    public constructor(initialSnapshot?: DependencySnapshot) {
        this.snapshot = initialSnapshot
            ? {
                ...initialSnapshot,
                enabled: true,
                fromCache: true,
                refreshing: false,
                stale: false,
                error: '',
            }
            : emptySnapshot();
        this.revision = this.snapshot.revision;
    }

    public getSnapshot(): DependencySnapshot {
        return this.snapshot;
    }

    public subscribe(listener: (snapshot: DependencySnapshot) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    public getDetail(uuidOrPath: string): DetailView | null {
        const row = this.snapshot.rows.find(
            (item) => item.uuid === uuidOrPath || item.path === uuidOrPath,
        );
        if (!row) return null;
        return {
            asset: {
                uuid: row.uuid,
                path: row.path,
                file: row.file,
                name: row.name,
                type: row.type,
                category: row.category,
            },
            dependencies: row.dependencies,
            users: row.users,
        };
    }

    public scheduleRefresh(delayMs = 700): void {
        if (this.disposed) return;
        if (Date.now() < this.autoRefreshBlockedUntil) return;
        this.dirty = true;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            void this.refreshNow();
        }, Math.max(0, delayMs));
    }

    public async refreshNow(): Promise<DependencySnapshot> {
        if (this.disposed) return this.snapshot;
        this.dirty = true;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = this.runRefreshCycle();
        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
            if (this.dirty && !this.disposed) this.scheduleRefresh();
        }
    }

    public dispose(): void {
        this.disposed = true;
        this.dirty = false;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        this.listeners.clear();
    }

    private publish(): void {
        for (const listener of this.listeners) {
            try {
                listener(this.snapshot);
            } catch (error: any) {
                console.warn('[AssetDependencyViewer] snapshot listener failed:', error?.message || error);
            }
        }
    }

    private setRefreshing(refreshing: boolean): void {
        this.snapshot = { ...this.snapshot, refreshing };
        this.publish();
    }

    private async runRefreshCycle(): Promise<DependencySnapshot> {
        let remainingRuns = 2;
        while (remainingRuns-- > 0 && this.dirty && !this.disposed) {
            this.dirty = false;
            this.setRefreshing(true);
            try {
                this.snapshot = await this.buildFreshSnapshot();
                this.autoRefreshBlockedUntil = 0;
            } catch (error: any) {
                this.autoRefreshBlockedUntil = Date.now() + 15000;
                this.snapshot = {
                    ...this.snapshot,
                    refreshing: false,
                    stale: true,
                    error: error?.message || String(error),
                };
                console.warn(
                    '[AssetDependencyViewer] refresh unavailable:',
                    error?.message || error,
                );
            }
            this.snapshot = { ...this.snapshot, refreshing: false };
            this.publish();
        }
        return this.snapshot;
    }

    private async buildFreshSnapshot(): Promise<DependencySnapshot> {
        const result = await loadAssetDbGraph();
        const snapshot = buildDependencyGraph(result.assets, ++this.revision);
        if (result.warning) {
            snapshot.stale = true;
            snapshot.error = result.warning;
        }
        this.snapshot = snapshot;
        return snapshot;
    }
}

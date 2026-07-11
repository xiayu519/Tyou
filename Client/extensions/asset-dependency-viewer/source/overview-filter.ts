import { AssetDependencyRow } from './types';

export type OverviewMode = 'references' | 'redundant';
export type OverviewKind = 'resource' | 'script';
export type OverviewRowAction = 'detail' | 'reveal';

export type OverviewCounts = {
    references: Record<OverviewKind, number>;
    redundant: Record<OverviewKind, number>;
};

export function getOverviewCounts(rows: AssetDependencyRow[]): OverviewCounts {
    const counts: OverviewCounts = {
        references: { resource: 0, script: 0 },
        redundant: { resource: 0, script: 0 },
    };
    for (const row of rows) {
        counts.references[row.category] += 1;
        if (row.userCount === 0 && row.scriptRole !== 'global') {
            counts.redundant[row.category] += 1;
        }
    }
    return counts;
}

export function filterOverviewRows(
    rows: AssetDependencyRow[],
    mode: OverviewMode,
    kind: OverviewKind,
    searchText = '',
): AssetDependencyRow[] {
    const search = searchText.trim().toLocaleLowerCase();
    return rows.filter((row) => {
        if (row.category !== kind) return false;
        if (mode === 'redundant' && (row.userCount !== 0 || row.scriptRole === 'global')) return false;
        if (!search) return true;
        return row.path.toLocaleLowerCase().includes(search) ||
            row.name.toLocaleLowerCase().includes(search) ||
            row.type.toLocaleLowerCase().includes(search);
    });
}

export function resolveOverviewRowAction(
    mode: OverviewMode,
    requestedAction: OverviewRowAction,
): OverviewRowAction {
    return mode === 'redundant' ? 'reveal' : requestedAction;
}

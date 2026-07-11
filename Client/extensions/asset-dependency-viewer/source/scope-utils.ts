import { normalizeDbPath } from './dependency-graph';
import { AssetDependencyRow, RawAssetInfo } from './types';

export function normalizeScopePath(value: string): string {
    const path = normalizeDbPath(value).replace(/\/$/, '');
    return path === 'db://assets' ? '' : path;
}

export function getScopeForAssetInfo(
    info: Pick<RawAssetInfo, 'url' | 'source' | 'isDirectory'> | null | undefined,
): string {
    if (!info) return '';
    const path = normalizeDbPath(info.url || info.source).replace(/\/$/, '');
    if (!path.startsWith('db://assets')) return '';
    if (info.isDirectory) return normalizeScopePath(path);
    const slash = path.lastIndexOf('/');
    return normalizeScopePath(slash > 'db://assets'.length ? path.slice(0, slash) : '');
}

export function filterRowsByScope(
    rows: AssetDependencyRow[],
    scopePath: string,
): AssetDependencyRow[] {
    const scope = normalizeScopePath(scopePath);
    if (!scope) return rows;
    const prefix = `${scope}/`;
    return rows.filter((row) => row.path === scope || row.path.startsWith(prefix));
}

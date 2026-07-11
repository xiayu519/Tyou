import {
    AssetDependencyRow,
    AssetLink,
    DependencySnapshot,
    RawAssetInfo,
} from './types';

type FlatAsset = RawAssetInfo & {
    parentUuid?: string;
    parentPath?: string;
};

function normalizeSlashes(value: string): string {
    return value.replace(/\\/g, '/');
}

export function normalizeDbPath(value: string | undefined): string {
    const path = normalizeSlashes(String(value || '').trim());
    if (!path) return '';
    if (path.startsWith('db://')) return path;
    const marker = '/assets/';
    const index = path.toLowerCase().lastIndexOf(marker);
    if (index >= 0) return `db://assets/${path.slice(index + marker.length)}`;
    return path;
}

export function isProjectAssetPath(value: string): boolean {
    return value === 'db://assets' || value.startsWith('db://assets/');
}

function flattenAssets(input: RawAssetInfo[]): FlatAsset[] {
    const output: FlatAsset[] = [];
    const seen = new Set<string>();

    const visit = (asset: RawAssetInfo, parent?: FlatAsset) => {
        if (!asset || !asset.uuid) return;
        const current: FlatAsset = {
            ...asset,
            parentUuid: parent?.uuid || asset.fatherInfo?.uuid,
            parentPath: parent
                ? normalizeDbPath(parent.url || parent.source)
                : normalizeDbPath(asset.fatherInfo?.url),
        };

        if (!seen.has(current.uuid)) {
            seen.add(current.uuid);
            output.push(current);
        }

        for (const subAsset of Object.values(asset.subAssets || {})) {
            visit(subAsset, current);
        }
    };

    for (const asset of input) visit(asset);
    return output;
}

function chooseCanonicalByFile(nodes: FlatAsset[]): Map<string, FlatAsset> {
    const result = new Map<string, FlatAsset>();
    for (const node of nodes) {
        const file = normalizeSlashes(String(node.file || ''));
        const path = normalizeDbPath(node.url || node.source);
        if (!file || !isProjectAssetPath(path)) continue;

        const existing = result.get(file);
        if (!existing) {
            result.set(file, node);
            continue;
        }

        const existingPath = normalizeDbPath(existing.url || existing.source);
        const nodeIsRoot = !node.parentUuid && !node.parentPath;
        const existingIsRoot = !existing.parentUuid && !existing.parentPath;
        if ((nodeIsRoot && !existingIsRoot) ||
            (nodeIsRoot === existingIsRoot && path.length < existingPath.length)) {
            result.set(file, node);
        }
    }
    return result;
}

function classifyAsset(node: FlatAsset, path: string): 'resource' | 'script' {
    const type = `${node.type || ''} ${node.importer || ''}`.toLocaleLowerCase();
    if (type.includes('script') || type.includes('typescript') || type.includes('javascript')) {
        return 'script';
    }
    return /\.(?:ts|js|mjs|cjs)$/i.test(path) ? 'script' : 'resource';
}

function createAssetLink(node: FlatAsset, path: string): AssetLink {
    const name = String(node.displayName || node.name || path.split('/').pop() || path);
    return {
        uuid: node.uuid,
        path,
        file: normalizeSlashes(String(node.file || '')),
        name,
        type: String(node.type || node.importer || 'asset'),
        category: classifyAsset(node, path),
        scriptRole: node.scriptRole,
    };
}

export function buildDependencyGraph(
    input: RawAssetInfo[],
    revision = 1,
    generatedAt = Date.now(),
): DependencySnapshot {
    const nodes = flattenAssets(input);
    const byUuid = new Map(nodes.map((node) => [node.uuid, node]));
    const canonicalByFile = chooseCanonicalByFile(nodes);
    const canonicalPathByUuid = new Map<string, string>();
    const representativeByPath = new Map<string, AssetLink>();

    const resolveCanonicalPath = (node: FlatAsset): string => {
        const parentPath = normalizeDbPath(node.parentPath || node.fatherInfo?.url);
        if (isProjectAssetPath(parentPath)) return parentPath;

        const file = normalizeSlashes(String(node.file || ''));
        const root = file ? canonicalByFile.get(file) : undefined;
        const rootPath = normalizeDbPath(root?.url || root?.source);
        if (isProjectAssetPath(rootPath)) return rootPath;

        const ownPath = normalizeDbPath(node.url || node.source);
        return isProjectAssetPath(ownPath) ? ownPath : '';
    };

    for (const node of nodes) {
        const path = resolveCanonicalPath(node);
        if (!path) continue;
        canonicalPathByUuid.set(node.uuid, path);

        const current = representativeByPath.get(path);
        const candidate = createAssetLink(node, path);
        const candidateIsRoot = !node.parentUuid && !node.parentPath;
        if (!current || candidateIsRoot || candidate.path.length < current.path.length) {
            representativeByPath.set(path, candidate);
        }
    }

    const forward = new Map<string, Set<string>>();
    const ensureSet = (map: Map<string, Set<string>>, key: string) => {
        let set = map.get(key);
        if (!set) {
            set = new Set<string>();
            map.set(key, set);
        }
        return set;
    };

    const addRawEdge = (sourceUuid: string, targetUuid: string) => {
        const sourcePath = canonicalPathByUuid.get(sourceUuid);
        const targetPath = canonicalPathByUuid.get(targetUuid);
        if (!sourcePath || !targetPath || sourcePath === targetPath) return;
        ensureSet(forward, sourcePath).add(targetPath);
    };

    for (const node of nodes) {
        for (const dependencyUuid of node.depends || []) {
            addRawEdge(node.uuid, dependencyUuid);
        }
        for (const userUuid of node.dependeds || []) {
            addRawEdge(userUuid, node.uuid);
        }
    }

    const reverse = new Map<string, Set<string>>();
    let edgeCount = 0;
    for (const [sourcePath, targets] of forward) {
        edgeCount += targets.size;
        for (const targetPath of targets) ensureSet(reverse, targetPath).add(sourcePath);
    }

    const paths = Array.from(representativeByPath.keys())
        .filter((path) => {
            const link = representativeByPath.get(path);
            const raw = link ? byUuid.get(link.uuid) : undefined;
            return Boolean(link && !raw?.isDirectory);
        })
        .sort((a, b) => a.localeCompare(b));

    const toLinks = (relatedPaths: Set<string> | undefined): AssetLink[] => {
        return Array.from(relatedPaths || [])
            .map((path) => representativeByPath.get(path))
            .filter((link): link is AssetLink => Boolean(link))
            .sort((a, b) => a.path.localeCompare(b.path));
    };

    const rows: AssetDependencyRow[] = paths.map((path) => {
        const link = representativeByPath.get(path)!;
        const dependencies = toLinks(forward.get(path));
        const users = toLinks(reverse.get(path));
        return {
            ...link,
            dependencyCount: dependencies.length,
            userCount: users.length,
            dependencies,
            users,
        };
    });

    return {
        enabled: true,
        fromCache: false,
        revision,
        generatedAt,
        refreshing: false,
        stale: false,
        error: '',
        rows,
        assetCount: rows.length,
        rawNodeCount: nodes.length,
        edgeCount,
    };
}

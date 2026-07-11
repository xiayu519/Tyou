export type RawAssetInfo = {
    uuid: string;
    name?: string;
    displayName?: string;
    source?: string;
    url?: string;
    file?: string;
    type?: string;
    importer?: string;
    isDirectory?: boolean;
    invalid?: boolean;
    imported?: boolean;
    depends?: string[];
    dependeds?: string[];
    subAssets?: Record<string, RawAssetInfo>;
    fatherInfo?: RawAssetInfo | { uuid?: string; url?: string; file?: string } | null;
    scriptRole?: 'global' | 'normal';
};

export type AssetLink = {
    uuid: string;
    path: string;
    file: string;
    name: string;
    type: string;
    category: 'resource' | 'script';
    scriptRole?: 'global' | 'normal';
};

export type AssetDependencyRow = AssetLink & {
    dependencyCount: number;
    userCount: number;
    dependencies: AssetLink[];
    users: AssetLink[];
};

export type DependencySnapshot = {
    enabled: boolean;
    fromCache: boolean;
    revision: number;
    generatedAt: number;
    refreshing: boolean;
    stale: boolean;
    error: string;
    rows: AssetDependencyRow[];
    assetCount: number;
    rawNodeCount: number;
    edgeCount: number;
};

export type DetailView = {
    asset: AssetLink;
    dependencies: AssetLink[];
    users: AssetLink[];
};

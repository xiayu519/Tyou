// 类型定义
export interface AssetInfo {
    name: string; // 新增：逻辑名称（数组格式时有）
    path: string;
    type: string;
    bundle: string;
    marks?: string[]; // 新增：特殊标记
}

export interface AssetIndexData {
    bundles: string[];
    assets: AssetInfo[] | AssetTable; // 支持数组和对象两种格式
    directories?: { [bundleName: string]: string[] }; // 新增：目录结构
    marks?: { [markName: string]: string[] }; // 新增：特殊标记集合
}

export interface AssetTable {
    [assetName: string]: AssetInfo;
}

export interface AssetSearchResult {
    assetName: string;
    assetInfo: AssetInfo;
    matchType: 'name' | 'path' | 'bundle';
}

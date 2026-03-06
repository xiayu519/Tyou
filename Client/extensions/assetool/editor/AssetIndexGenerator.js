'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 自动扫描项目中所有 isBundle=true 的文件夹，
 * 生成资源索引文件到指定的 bundle 中。
 *
 * 规则：
 *  - 扫描 assets/ 目录下所有 .meta 文件，查找 userData.isBundle === true 的文件夹
 *  - bundle名称：优先使用 meta 中的 userData.bundleName，否则使用文件夹名
 *  - 图片资源（png/jpg/jpeg/webp/bmp/tga）必须以配置的前缀开头才会被收录（默认 "l_"）
 *  - directoryBundles 中的 bundle 只扫描一级子目录名称（不扫描文件）
 *  - excludeBundles 中的 bundle 不参与扫描（如 resources、asset-catalog）
 *  - 特殊标记（specialMarks）：文件/文件夹名匹配前缀时自动标记
 */
const runGenerator = async function () {
    console.log('[AssetIndexGenerator] Start generating asset index (auto-scan mode)...');

    const projectPath = Editor.Project.path;
    const configPath = path.join(projectPath, 'assets', 'editor', 'asset-index-config.json');

    if (!fs.existsSync(configPath)) {
        Editor.error(`Config file not found: ${configPath}`);
        return;
    }

    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const resourceTypeMap = config.resourceTypeMap || {};
        const specialMarksConfig = config.specialMarks || {};
        const imagePrefixFilter = config.imagePrefixFilter || ['l_'];
        const directoryBundles = new Set(config.directoryBundles || []);
        const excludeBundles = new Set(config.excludeBundles || []);
        const outputBundleName = config.outputBundleName || 'asset-catalog';
        const outputFileName = config.outputFileName || 'asset-index';

        // 图片格式列表
        const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tga', 'tif', 'tiff'];

        // 所有可扫描的文件扩展名（来自 resourceTypeMap）
        const allowedExtensions = new Set(Object.keys(resourceTypeMap));

        const assetsArray = [];
        const bundleSet = new Set();
        const directoryMap = {};
        const logicalNameSet = new Set();

        // 初始化特殊标记存储
        const specialMarksMap = {};
        for (const markName in specialMarksConfig) {
            specialMarksMap[markName] = new Set();
        }

        // ---- 第一步：自动发现所有 bundle ----
        const discoveredBundles = discoverBundles(projectPath, excludeBundles);
        console.log(`[AssetIndexGenerator] Discovered ${discoveredBundles.length} bundles:`);
        for (const b of discoveredBundles) {
            console.log(`  - ${b.bundleName} (${b.relativePath})`);
        }

        // ---- 第二步：逐个扫描 bundle ----
        for (const bundleInfo of discoveredBundles) {
            const { bundleName, relativePath, fullPath } = bundleInfo;

            if (directoryBundles.has(bundleName)) {
                // 目录模式：仅扫描一级子文件夹名
                console.log(`[AssetIndexGenerator] Scanning directories: ${relativePath} (Bundle: ${bundleName})`);
                scanFirstLevelDirs(fullPath, bundleName, directoryMap);
                bundleSet.add(bundleName);
            } else {
                // 文件模式：递归扫描所有匹配文件
                console.log(`[AssetIndexGenerator] Scanning files: ${relativePath} (Bundle: ${bundleName})`);
                bundleSet.add(bundleName);
                walkDirectory(
                    fullPath, '', bundleName,
                    allowedExtensions, resourceTypeMap, assetsArray,
                    specialMarksMap, specialMarksConfig, logicalNameSet,
                    imageExtensions, imagePrefixFilter, new Set()
                );
            }
        }

        // ---- 第三步：构建输出 ----
        const outputData = {
            bundles: Array.from(bundleSet).sort(),
            assets: assetsArray,
        };

        if (Object.keys(directoryMap).length > 0) {
            outputData.directories = directoryMap;
        }

        const marksData = {};
        for (const markName in specialMarksMap) {
            marksData[markName] = Array.from(specialMarksMap[markName]).sort();
        }
        outputData.marks = marksData;

        // ---- 第四步：写入到 asset-catalog bundle ----
        // 确保 asset-raw 根目录存在
        const assetRawDir = path.join(projectPath, 'assets', 'asset-raw');
        if (!fs.existsSync(assetRawDir)) {
            fs.mkdirSync(assetRawDir, { recursive: true });
            console.log(`[AssetIndexGenerator] Created asset-raw directory: ${assetRawDir}`);
        }
        const outputDir = path.join(assetRawDir, outputBundleName);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputFilePath = path.join(outputDir, `${outputFileName}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
        console.log(`[AssetIndexGenerator] Output: ${outputFilePath}`);

        // 确保 bundle meta 存在
        ensureBundleMeta(projectPath, outputBundleName);

        // 统计信息
        const processedCount = assetsArray.length;
        console.log(`[AssetIndexGenerator] Completed: ${processedCount} assets, ${bundleSet.size} bundles`);

        for (const markName in specialMarksMap) {
            const count = specialMarksMap[markName].size;
            console.log(`[AssetIndexGenerator] ${markName}: ${count} assets`);
        }

        let message = `Asset index generated successfully!\n${processedCount} assets, ${bundleSet.size} bundles`;
        for (const markName in specialMarksMap) {
            const count = specialMarksMap[markName].size;
            message += `\n${markName}: ${count}`;
        }
        Editor.Dialog.info(message, { title: 'Success' });

    } catch (error) {
        Editor.error('[AssetIndexGenerator] Error:', error);
        Editor.Dialog.error(`Error generating asset index:\n${error.message}`, { title: 'Error' });
    }
};

/**
 * 自动发现项目中所有 isBundle=true 的文件夹
 * 递归扫描 assets/ 目录，读取每个文件夹对应的 .meta 文件
 */
function discoverBundles(projectPath, excludeBundles) {
    const assetsDir = path.join(projectPath, 'assets');
    const bundles = [];

    function scanDir(dir, relativeBase) {
        let items;
        try {
            items = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            return;
        }

        for (const item of items) {
            if (!item.isDirectory()) continue;

            const folderName = item.name;
            const folderPath = path.join(dir, folderName);
            const metaPath = path.join(dir, `${folderName}.meta`);
            const relativePath = relativeBase ? `${relativeBase}/${folderName}` : folderName;

            if (fs.existsSync(metaPath)) {
                try {
                    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    if (meta.userData && meta.userData.isBundle === true) {
                        const bundleName = (meta.userData.bundleName && meta.userData.bundleName.trim())
                            ? meta.userData.bundleName.trim()
                            : folderName;

                        if (!excludeBundles.has(bundleName)) {
                            bundles.push({
                                bundleName,
                                relativePath,
                                fullPath: folderPath,
                            });
                        } else {
                            console.log(`[AssetIndexGenerator] Skipping excluded bundle: ${bundleName}`);
                        }
                        // bundle 内部不再递归查找子 bundle
                        continue;
                    }
                } catch (e) {
                    // meta 解析失败，继续
                }
            }

            // 非 bundle 文件夹，继续递归
            scanDir(folderPath, relativePath);
        }
    }

    scanDir(assetsDir, '');
    return bundles;
}

/**
 * 扫描一级子目录名称（目录模式 bundle）
 */
function scanFirstLevelDirs(fullDirPath, bundleName, directoryMap) {
    try {
        const items = fs.readdirSync(fullDirPath, { withFileTypes: true });
        const dirs = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort();

        if (dirs.length > 0) {
            directoryMap[bundleName] = dirs;
            console.log(`  Found ${dirs.length} subdirectories: ${dirs.join(', ')}`);
        }
    } catch (error) {
        console.error(`Error scanning directories in ${fullDirPath}:`, error);
    }
}

/**
 * 检查特殊标记
 */
function checkSpecialMarks(itemName, specialMarksConfig) {
    const marks = [];
    for (const markName in specialMarksConfig) {
        const prefixes = specialMarksConfig[markName];
        if (Array.isArray(prefixes)) {
            for (const prefix of prefixes) {
                if (itemName.startsWith(prefix) || itemName.toLowerCase().startsWith(prefix.toLowerCase())) {
                    marks.push(markName);
                    break;
                }
            }
        }
    }
    return marks;
}

/**
 * 递归遍历目录，扫描匹配的资源文件
 */
function walkDirectory(currentDir, relativePath, bundleName, allowedExtensions, typeMap, assetsArray, specialMarksMap, specialMarksConfig, logicalNameSet, imageExtensions, imagePrefixFilter, parentMarks) {
    try {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });

        const currentDirMarks = new Set(parentMarks);
        const dirName = path.basename(currentDir);
        const dirMarks = checkSpecialMarks(dirName, specialMarksConfig);
        for (const mark of dirMarks) {
            currentDirMarks.add(mark);
        }

        for (const item of items) {
            if (item.isDirectory()) {
                const subRelPath = relativePath ? `${relativePath}/${item.name}` : item.name;
                const itemMarks = checkSpecialMarks(item.name, specialMarksConfig);
                const childMarks = new Set([...currentDirMarks, ...itemMarks]);
                walkDirectory(
                    path.join(currentDir, item.name), subRelPath, bundleName,
                    allowedExtensions, typeMap, assetsArray,
                    specialMarksMap, specialMarksConfig, logicalNameSet,
                    imageExtensions, imagePrefixFilter, childMarks
                );
            } else {
                processFile(
                    path.join(currentDir, item.name),
                    relativePath ? `${relativePath}/${item.name}` : item.name,
                    bundleName, allowedExtensions, typeMap, assetsArray,
                    specialMarksMap, specialMarksConfig, logicalNameSet,
                    imageExtensions, imagePrefixFilter, currentDirMarks
                );
            }
        }
    } catch (error) {
        console.error(`Error walking directory ${currentDir}:`, error);
    }
}

/**
 * 处理单个文件
 */
function processFile(filePath, relativePath, bundleName, allowedExtensions, typeMap, assetsArray, specialMarksMap, specialMarksConfig, logicalNameSet, imageExtensions, imagePrefixFilter, parentMarks) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (!ext) return;

    // 跳过 .meta 文件
    if (ext === 'meta') return;

    // 必须在 resourceTypeMap 中有映射
    if (!typeMap[ext]) return;

    // 必须在允许的扩展名中
    if (!allowedExtensions.has(ext)) return;

    const fileName = path.basename(filePath, `.${ext}`);
    const assetPath = relativePath.slice(0, -path.extname(relativePath).length).replace(/\\/g, '/');

    // 图片前缀过滤：图片格式必须以指定前缀开头
    if (imageExtensions.includes(ext)) {
        const matchesPrefix = imagePrefixFilter.some(
            prefix => fileName.startsWith(prefix) || fileName.toLowerCase().startsWith(prefix.toLowerCase())
        );
        if (!matchesPrefix) return;
    }

    // 创建唯一逻辑名称
    let logicalName = fileName;
    let counter = 1;
    while (logicalNameSet.has(logicalName)) {
        console.log("[重复名字]", logicalName, fileName);
        logicalName = `${fileName}_${counter}`;
        counter++;
    }
    logicalNameSet.add(logicalName);

    // 收集特殊标记
    const fileMarks = checkSpecialMarks(fileName, specialMarksConfig);
    const allMarks = new Set([...parentMarks, ...fileMarks]);

    const assetInfo = {
        name: logicalName,
        path: assetPath,
        type: typeMap[ext],
        bundle: bundleName,
    };

    if (allMarks.size > 0) {
        assetInfo.marks = Array.from(allMarks).sort();
    }

    assetsArray.push(assetInfo);

    for (const mark of allMarks) {
        if (specialMarksMap[mark]) {
            specialMarksMap[mark].add(logicalName);
        }
    }
}

/**
 * 确保 asset-catalog bundle 的 meta 文件存在
 */
function ensureBundleMeta(projectPath, bundleName) {
    const metaPath = path.join(projectPath, 'assets', 'asset-raw', `${bundleName}.meta`);
    if (!fs.existsSync(metaPath)) {
        const uuid = generateSimpleUUID();
        const meta = {
            ver: "1.2.0",
            importer: "directory",
            imported: true,
            uuid: uuid,
            files: [],
            subMetas: {},
            userData: {
                isBundle: true
            }
        };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        console.log(`[AssetIndexGenerator] Created bundle meta: ${metaPath}`);
    }
}

function generateSimpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = {
    load() {
        console.log('[AssetIndexGenerator] Loaded successfully');
    },

    unload() {
        // Cleanup
    },

    methods: {
        showLog() {
            console.log('[AssetIndexGenerator] Show Log');
            runGenerator();
        }
    }
};

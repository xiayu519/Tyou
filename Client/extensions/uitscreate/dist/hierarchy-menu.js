'use strict';

const fs = require("fs");
const path = require("path");
const psd2cccCommonAtlas = require("../../psd2ccc/dist/common-atlas-checker.js");
const WIDGET_SCRIPT_DIR = "widget";
const WIDGET_IMPORT_ALL_FILE = "WidgetImportAll";

// 默认组件配置
const DEFAULT_COMPONENT_CONFIG = [
    {prefix: "m_tf", component: "Node"},
    {prefix: "m_text", component: "Label"},
    {prefix: "m_btn", component: "Node"},
    {prefix: "m_img", component: "Sprite"},
    {prefix: "m_grid", component: "Layout"},
    {prefix: "m_list", component: "ListView"}
];

const DEFAULT_TS_PATH = "GameScripts/GameLogic/UI";

// 默认模板内容
const DEFAULT_TEMPLATE = ` [IMPORT_STATEMENTS]

@UIDecorator({ name: UIName.[CLASS_NAME] })
export class [CLASS_NAME] extends UIWindow {
[PROPERTY_DEFINITIONS]

    override bindMemberProperty() {
[BIND_STATEMENTS]
    }

    override registerEvent() {
[EVENT_STATEMENTS]
    }

[CLICK_METHODS]

    override onCreate() {

    }

    override onRefresh() {

    }

    override onClosed() {

    }
}
`;

// 加载组件配置
function loadComponentConfig() {
    try {
        const projectPath = Editor.Project.path;
        const configPath = path.join(projectPath, 'assets', 'editor', 'ui-component-config.json');

        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);

            if (config.componentConfig && Array.isArray(config.componentConfig)) {
                console.log('[UI脚本生成器] 加载组件配置文件成功');
                return config.componentConfig;
            }
        }
    } catch (error) {
        console.error('[UI脚本生成器] 加载组件配置文件失败:', error);
    }

    console.log('[UI脚本生成器] 使用默认组件配置');
    return DEFAULT_COMPONENT_CONFIG;
}

// 加载组件配置
function loadPathConfig() {
    try {
        const projectPath = Editor.Project.path;
        const configPath = path.join(projectPath, 'assets', 'editor', 'ui-component-config.json');

        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);

            if (config.tsDirPath) {
                console.log('[UI脚本生成器] 脚本生成位置', config.tsDirPath);
                return config.tsDirPath;
            }
        }
    } catch (error) {
        console.error('[UI脚本生成器] 加载组件配置文件失败:', error);
    }

    console.log('[UI脚本生成器] 使用默认文件位置');
    return DEFAULT_TS_PATH;
}

// 加载模板文件
function loadTemplate() {
    try {
        const projectPath = Editor.Project.path;
        const templatePath = path.join(projectPath, 'assets', 'editor', 'ui-template.txt');

        if (fs.existsSync(templatePath)) {
            const templateContent = fs.readFileSync(templatePath, 'utf8');
            console.log('[UI脚本生成器] 加载模板文件成功');
            return templateContent;
        }
    } catch (error) {
        console.error('[UI脚本生成器] 加载模板文件失败:', error);
    }

    console.log('[UI脚本生成器] 使用默认模板');
    return DEFAULT_TEMPLATE;
}

// 确保目录存在（递归创建）
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[UI脚本生成器] 已创建目录: ${dirPath}`);
    }
}

// 确保 UIName.ts 存在，不存在则创建
function ensureUINameFile(filePath) {
    ensureDirectoryExists(path.dirname(filePath));
    if (!fs.existsSync(filePath)) {
        const content = `/**\n * UI名称枚举（自动生成，请勿手动修改）\n *\n * 右键生成UI脚本时会自动在此枚举中追加新条目。\n * 纯数据文件，无任何import，不参与任何循环依赖。\n */\nexport enum UIName {\n}\n`;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[UI脚本生成器] 已创建 UIName.ts: ${filePath}`);
    }
}

// 确保 UIImportAll.ts 存在，不存在则创建
function ensureUIImportAllFile(filePath) {
    ensureDirectoryExists(path.dirname(filePath));
    if (!fs.existsSync(filePath)) {
        const content = `/**\n * UI统一导入文件（自动生成，请勿手动修改）\n *\n * 导入所有UI类以触发 @UIDecorator 装饰器的自注册，\n * 防止微信小游戏等平台构建时 Tree Shaking 移除UI类。\n * 右键生成UI脚本时会自动更新此文件。\n */\n`;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[UI脚本生成器] 已创建 UIImportAll.ts: ${filePath}`);
    }
}

// 重新生成 UIImportAll.ts（防止 Tree Shaking 移除UI类）
async function regenerateUIImportAll() {
    try {
        const targetDir = loadPathConfig();
        const projectPath = Editor.Project.path;
        const uiNameFilePath = path.join(projectPath, 'assets', targetDir, 'UIName.ts');

        // 确保目录和文件存在
        ensureUINameFile(uiNameFilePath);

        const content = fs.readFileSync(uiNameFilePath, 'utf8');

        // 从 UIName.ts 枚举中提取所有UI名称
        const enumPattern = /(\w+)\s*=\s*["']\w+["']/g;
        const uiNames = [];
        let match;
        while ((match = enumPattern.exec(content)) !== null) {
            uiNames.push(match[1]);
        }

        const widgetImportAllPath = path.join(projectPath, 'assets', targetDir, WIDGET_SCRIPT_DIR, `${WIDGET_IMPORT_ALL_FILE}.ts`);
        const importLineList = uiNames.map(name => `import "./${name}";`);
        if (fs.existsSync(widgetImportAllPath)) {
            importLineList.push(`import "./${WIDGET_SCRIPT_DIR}/${WIDGET_IMPORT_ALL_FILE}";`);
        }

        if (importLineList.length === 0) {
            console.log('[UI脚本生成器] UIName 枚举为空且无 WidgetImportAll，跳过 UIImportAll 生成');
            return;
        }

        // 生成 UIImportAll.ts 内容（装饰器模式：仅需 side-effect import）
        const importLines = importLineList.join('\n');

        const importAllContent = `/**\n * UI统一导入文件（自动生成，请勿手动修改）\n *\n * 导入所有UI类以触发 @UIDecorator 装饰器的自注册，\n * 防止微信小游戏等平台构建时 Tree Shaking 移除UI类。\n * 右键生成UI脚本时会自动更新此文件。\n */\n${importLines}\n`;

        const importAllFilePath = path.join(projectPath, 'assets', targetDir, 'UIImportAll.ts');
        ensureDirectoryExists(path.dirname(importAllFilePath));
        fs.writeFileSync(importAllFilePath, importAllContent, 'utf8');
        console.log(`[UI脚本生成器] UIImportAll.ts 已更新，包含 ${uiNames.length} 个UI类`);

        // 通知 Cocos 刷新资源
        const dbPath = `db://assets/${targetDir}/UIImportAll.ts`;
        try {
            await Editor.Message.request('asset-db', 'refresh-asset', dbPath);
        } catch (e) {
            console.log('[UI脚本生成器] 刷新 UIImportAll.ts 资源通知（可忽略）:', e.message);
        }
    } catch (error) {
        console.error('[UI脚本生成器] 更新 UIImportAll.ts 失败:', error);
    }
}

// 重新生成 WidgetImportAll.ts，供 UIImportAll side-effect 引入，防止小游戏构建剔除动态 Widget 类
async function regenerateWidgetImportAll() {
    try {
        const targetDir = loadPathConfig();
        const projectPath = Editor.Project.path;
        const widgetDir = path.join(projectPath, 'assets', targetDir, WIDGET_SCRIPT_DIR);
        ensureDirectoryExists(widgetDir);

        const widgetNames = fs.readdirSync(widgetDir)
            .filter(file => file.endsWith('.ts'))
            .filter(file => !file.endsWith('.d.ts'))
            .map(file => path.basename(file, '.ts'))
            .filter(name => name !== WIDGET_IMPORT_ALL_FILE)
            .sort();

        const importLines = widgetNames.map(name => `import "./${name}";`).join('\n');
        const content = `/**\n * Widget统一导入文件（自动生成，请勿手动修改）\n *\n * 导入所有 UIWidget 类，防止微信小游戏等平台构建时 Tree Shaking 移除动态 Widget 类。\n * 此文件只做 side-effect import，不引用 UIName，也不反向导入 UI 窗口。\n */\n${importLines}\n`;

        const filePath = path.join(widgetDir, `${WIDGET_IMPORT_ALL_FILE}.ts`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[UI脚本生成器] ${WIDGET_IMPORT_ALL_FILE}.ts 已更新，包含 ${widgetNames.length} 个Widget类`);

        const dbPath = `db://assets/${targetDir}/${WIDGET_SCRIPT_DIR}/${WIDGET_IMPORT_ALL_FILE}.ts`;
        try {
            await Editor.Message.request('asset-db', 'refresh-asset', dbPath);
        } catch (e) {
            console.log(`[UI脚本生成器] 刷新 ${WIDGET_IMPORT_ALL_FILE}.ts 资源通知（可忽略）:`, e.message);
        }

        await regenerateUIImportAll();
    } catch (error) {
        console.error(`[UI脚本生成器] 更新 ${WIDGET_IMPORT_ALL_FILE}.ts 失败:`, error);
    }
}

// 向 UIName.ts 枚举中追加新条目
async function addUINameEntry(className) {
    try {
        const targetDir = loadPathConfig();
        const projectPath = Editor.Project.path;
        const uiNameFilePath = path.join(projectPath, 'assets', targetDir, 'UIName.ts');

        // 确保目录和文件存在
        ensureUINameFile(uiNameFilePath);

        let content = fs.readFileSync(uiNameFilePath, 'utf8');

        // 检查是否已存在该条目
        const entryPattern = new RegExp(`\\b${className}\\s*=`);
        if (entryPattern.test(content)) {
            console.log(`[UI脚本生成器] UIName 枚举中已存在 ${className}，跳过`);
            return;
        }

        // 找到枚举的最后一个 } 并在其前面插入新条目
        const closingBraceIndex = content.lastIndexOf('}');
        if (closingBraceIndex === -1) {
            console.error('[UI脚本生成器] UIName.ts 格式异常，找不到枚举结束括号');
            return;
        }

        const before = content.substring(0, closingBraceIndex);
        const after = content.substring(closingBraceIndex);
        const newEntry = `    ${className} = "${className}",\n`;
        const newContent = before + newEntry + after;

        fs.writeFileSync(uiNameFilePath, newContent, 'utf8');
        console.log(`[UI脚本生成器] 已向 UIName 枚举添加: ${className}`);

        // 通知 Cocos 刷新资源
        const dbPath = `db://assets/${targetDir}/UIName.ts`;
        try {
            await Editor.Message.request('asset-db', 'refresh-asset', dbPath);
        } catch (e) {
            console.log('[UI脚本生成器] 刷新 UIName.ts 资源通知（可忽略）:', e.message);
        }
    } catch (error) {
        console.error('[UI脚本生成器] 更新 UIName.ts 失败:', error);
    }
}

// 检查文件是否存在
async function checkFileExists(scriptPath) {
    try {
        const info = await Editor.Message.request('asset-db', 'query-asset-info', scriptPath);
        return !!info;
    } catch (error) {
        return false;
    }
}

// 获取已存在文件的内容
async function getExistingFileContent(scriptPath) {
    try {
        const result = await Editor.Message.request('asset-db', 'query-asset-info', scriptPath);
        if (result && result.file) {
            const content = fs.readFileSync(result.file, 'utf8');
            return content;
        }
    } catch (error) {
        console.error('读取现有文件失败:', error);
    }
    return null;
}

function buildNodeMap(nodes) {
    const map = new Map();
    nodes.forEach(node => map.set(node.uuid, node));
    return map;
}

function isDescendantOf(node, ancestor, nodeMap) {
    let parentUuid = node.parentUuid;
    while (parentUuid) {
        if (parentUuid === ancestor.uuid) {
            return true;
        }
        const parent = nodeMap.get(parentUuid);
        if (!parent) {
            return false;
        }
        parentUuid = parent.parentUuid;
    }
    return false;
}

function isInsideNestedList(node, listNode, nodeMap) {
    let parentUuid = node.parentUuid;
    while (parentUuid && parentUuid !== listNode.uuid) {
        const parent = nodeMap.get(parentUuid);
        if (!parent) {
            return false;
        }
        if ((parent.name || '').indexOf('m_list') === 0) {
            return true;
        }
        parentUuid = parent.parentUuid;
    }
    return false;
}

function toPascalCase(value) {
    const text = String(value || '').replace(/[^a-zA-Z0-9_]/g, '');
    if (!text) {
        return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function stripPrefix(name, prefix) {
    return name.indexOf(prefix) === 0 ? name.substring(prefix.length) : name;
}

function isListItemWidgetName(name) {
    return String(name || '').indexOf('m_item') === 0;
}

function containsWidgetMarker(name) {
    const lowerName = String(name || '').toLowerCase();
    return lowerName.includes('widget');
}

function sanitizeScriptClassName(name, fallback) {
    let className = String(name || '')
        .replace(/\(Clone\)/g, '')
        .replace(/\.prefab$/i, '')
        .replace(/[^a-zA-Z0-9_]/g, '_');

    if (!className) {
        className = fallback;
    }

    if (/^[0-9]/.test(className)) {
        className = `_${className}`;
    }

    return className.charAt(0).toUpperCase() + className.slice(1);
}

function normalizeWidgetClassName(nodeName) {
    const cleanName = String(nodeName || '').replace(/\(Clone\)/g, '').replace(/\.prefab$/i, '');
    if (isListItemWidgetName(cleanName)) {
        const itemSuffix = toPascalCase(stripPrefix(cleanName, 'm_item'));
        return `Item${itemSuffix}`;
    }
    return sanitizeScriptClassName(cleanName, 'Widget');
}

function createListItemContext(scriptName, nodes) {
    const nodeMap = buildNodeMap(nodes);
    const listItemByListName = new Map();
    const listItemMetas = [];
    const classNameCounts = new Map();

    const listNodes = nodes.filter(node => (node.name || '').indexOf('m_list') === 0);
    for (const listNode of listNodes) {
        const itemNodes = nodes.filter(node => {
            const name = node.name || '';
            return name.indexOf('m_item') === 0
                && isDescendantOf(node, listNode, nodeMap)
                && !isInsideNestedList(node, listNode, nodeMap);
        });

        if (itemNodes.length !== 1) {
            continue;
        }

        const className = normalizeWidgetClassName(itemNodes[0].name);
        const meta = {
            className,
            listNode,
            rootNode: itemNodes[0],
        };
        listItemMetas.push(meta);
        listItemByListName.set(listNode.name, meta);
        classNameCounts.set(className, (classNameCounts.get(className) || 0) + 1);
    }

    const duplicateClassNames = Array.from(classNameCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([className]) => className);

    return {
        nodeMap,
        listItemByListName,
        listItemMetas,
        duplicateClassNames,
    };
}

// 生成需要复制的部分内容
function generateClipboardContent(className, nodeProperties) {
    // 格式化类名
    const validClassName = className.replace(/[^a-zA-Z0-9_]/g, '_');
    const formattedClassName = validClassName.charAt(0).toUpperCase() + validClassName.slice(1);

    // 生成属性定义
    const propertyDefinitions = nodeProperties.map(prop => {
        return `    private ${prop.propertyName}: ${prop.componentType};`;
    }).join('\n\n');

    // 生成绑定语句
    const bindStatements = nodeProperties.map(prop => {
        const statements = [];
        if (prop.componentType === 'Node') {
            statements.push(`        this.${prop.propertyName} = this.get("${prop.originalName}");`);
        } else {
            statements.push(`        this.${prop.propertyName} = this.get("${prop.originalName}").getComponent(${prop.componentType});`);
        }

        if (prop.listItemMeta) {
            statements.push(`        this.${prop.propertyName}.setItemWidget(${prop.listItemMeta.className}, this);`);
        }

        return statements.join('\n');
    }).join('\n');

    // 生成事件语句
    const btnProperties = nodeProperties.filter(prop => prop.prefix === 'm_btn');
    const eventStatements = btnProperties.map(prop => {
        return `        this.onRegisterEvent(this.${prop.propertyName}, this.${prop.methodName})`;
    }).join('\n');

    // 构建剪贴板内容
    let clipboardContent = '';

    if (propertyDefinitions) {
        clipboardContent += propertyDefinitions + '\n\n';
    }

    clipboardContent += `    override bindMemberProperty() {
${bindStatements}
    }

    override registerEvent() {
${eventStatements}
    }`;

    return clipboardContent;
}

// 使用Electron剪贴板API复制文本
function copyToClipboard(text) {
    try {
        // 尝试使用Electron的clipboard模块
        const { clipboard } = require('electron');
        clipboard.writeText(text);
        console.log('复制到剪贴板成功');
        return true;
    } catch (error) {
        console.error('使用Electron剪贴板失败:', error);

        // 备选方案：使用Node.js子进程
        try {
            const { exec } = require('child_process');
            const platform = process.platform;

            let command;
            if (platform === 'darwin') { // macOS
                command = 'pbcopy';
            } else if (platform === 'win32') { // Windows
                command = 'clip';
            } else if (platform === 'linux') { // Linux
                command = 'xclip -selection clipboard';
            } else {
                console.error('不支持的平台:', platform);
                return false;
            }

            const proc = exec(command);
            proc.stdin.write(text);
            proc.stdin.end();
            console.log(`使用${command}复制到剪贴板成功`);
            return true;
        } catch (fallbackError) {
            console.error('备用复制方法失败:', fallbackError);
            return false;
        }
    }
}

// 生成UI脚本的核心逻辑
async function generateUIScript(nodeUuid) {
    try {
        // 1. 确定节点 uuid（优先使用传入的 uuid，兜底从 Selection 获取）
        let uuid = nodeUuid;
        if (!uuid) {
            const uuids = Editor.Selection.getSelected('node');
            if (!uuids || uuids.length === 0) {
                console.warn('请选中一个节点');
                await showWarning('请先选中一个节点');
                return;
            }
            uuid = uuids[0];
        }

        console.log("选择节点 uuid:", uuid);

        // 2. 查询节点信息（带重试，防止场景面板尚未就绪）
        let node = null;
        for (let retry = 0; retry < 3; retry++) {
            try {
                node = await Editor.Message.request('scene', 'query-node', uuid);
            } catch (e) {
                console.warn(`[UI脚本生成器] query-node 第${retry + 1}次失败:`, e.message);
            }
            if (node) break;
            // 等待 300ms 后重试
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (!node) {
            console.error('无法获取节点信息, uuid:', uuid);
            await showWarning('无法获取节点信息，请确保场景已打开并重试');
            return;
        }

        const nodeName = node.name?.value || '';

        // 3. 检查是否为UI节点
        if (!containsUI(nodeName)) {
            await showWarning(`节点名称 "${nodeName}" 不包含"UI"字样`);
            return;
        }

        // 4. 获取所有子节点
        const allNodes = await getAllChildNodes(uuid);
        const scriptName = nodeName.replace(/\(Clone\)/g, '').replace('.prefab', '');
        const listItemContext = createListItemContext(scriptName, allNodes);
        if (listItemContext.duplicateClassNames && listItemContext.duplicateClassNames.length > 0) {
            await showErrorMessage(
                'Item脚本名重复',
                `以下 m_item 会生成重复脚本名：${listItemContext.duplicateClassNames.join(', ')}\n请重命名对应 m_item 节点后重新生成。`
            );
            return;
        }

        // 5. 加载组件配置和模板
        const componentConfig = loadComponentConfig();
        const template = loadTemplate();

        // 6. 筛选节点
        const nodeProperties = filterNodesByConfig(allNodes, componentConfig, listItemContext);

        // 7. 生成脚本内容
        const scriptContent = generateScriptContent(scriptName, nodeProperties, template, listItemContext);
        await createListItemScripts(scriptName, allNodes, componentConfig, listItemContext);

        // 8. 检查文件是否存在
        const targetDir = loadPathConfig();
        const scriptPath = `db://assets/${targetDir}/${scriptName}.ts`;

        const fileExists = await checkFileExists(scriptPath);

        if (fileExists) {
            // 文件已存在，只生成需要复制的部分内容
            const clipboardContent = generateClipboardContent(scriptName, nodeProperties);

            // 复制到剪贴板
            const copySuccess = copyToClipboard(clipboardContent);

            if (copySuccess) {
                const detailMessage = `脚本绑定部分已复制到剪贴板！\n包含 ${nodeProperties.length} 个节点属性。\n\n请打开 ${scriptName}.ts 文件，找到对应的绑定部分，按 Ctrl+V 粘贴替换。`;
                await showSuccess('脚本绑定部分已复制到剪贴板', detailMessage);
            } else {
                // 如果复制失败，显示内容让用户手动复制
                const detailMessage = `复制到剪贴板失败，请手动复制以下内容：\n\n${clipboardContent}\n\n然后粘贴到 ${scriptName}.ts 文件的对应位置。`;
                await showWarning('复制失败，请手动复制', detailMessage);
            }
        } else {
            // 文件不存在，创建新文件
            await createScriptFile(scriptName, scriptContent);

            // 自动向 UIName.ts 枚举中追加新条目
            await addUINameEntry(scriptName);

            // 自动重新生成 UIImportAll.ts（防止 Tree Shaking）
            await regenerateUIImportAll(scriptName);

            const detailMessage = nodeProperties.length > 0
                ? `UI脚本已成功生成！\n包含 ${nodeProperties.length} 个节点属性。\nUIName 枚举与 UIImportAll 已自动更新。`
                : `UI脚本已成功生成！\n未找到匹配的节点，生成了基础模板。\nUIName 枚举与 UIImportAll 已自动更新。`;

            await showSuccess('脚本生成成功', detailMessage);
        }
    } catch (error) {
        console.error('生成UI脚本失败:', error);
        await showErrorMessage('生成失败', error.message);
    }
}

async function generateWidgetScript(nodeUuid) {
    try {
        let uuid = nodeUuid;
        if (!uuid) {
            const uuids = Editor.Selection.getSelected('node');
            if (!uuids || uuids.length === 0) {
                await showWarning('请先选中一个节点');
                return;
            }
            uuid = uuids[0];
        }

        let node = null;
        for (let retry = 0; retry < 3; retry++) {
            try {
                node = await Editor.Message.request('scene', 'query-node', uuid);
            } catch (e) {
                console.warn(`[UI脚本生成器] query-node 第${retry + 1}次失败:`, e.message);
            }
            if (node) break;
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (!node) {
            await showWarning('无法获取节点信息，请确保场景已打开并重试');
            return;
        }

        const nodeName = node.name?.value || '';
        const isItemWidget = isListItemWidgetName(nodeName);
        if (!isItemWidget && !containsWidgetMarker(nodeName)) {
            await showWarning(`节点名称 "${nodeName}" 不包含 "Widget" 标记，不能生成Widget脚本`);
            return;
        }

        const scriptName = normalizeWidgetClassName(nodeName);
        const allNodes = await getAllChildNodes(uuid);
        const componentConfig = loadComponentConfig();
        const nodeProperties = filterNodesByConfig(allNodes, componentConfig, null);
        const scriptContent = generateListItemScriptContent(scriptName, nodeProperties, { includeRecycle: isItemWidget });
        const targetDir = `${loadPathConfig()}/${WIDGET_SCRIPT_DIR}`;
        const scriptPath = `db://assets/${targetDir}/${scriptName}.ts`;

        if (await checkFileExists(scriptPath)) {
            const clipboardContent = generateClipboardContent(scriptName, nodeProperties);
            const copySuccess = copyToClipboard(clipboardContent);
            if (copySuccess) {
                await showSuccess('Widget脚本绑定部分已复制到剪贴板', `包含 ${nodeProperties.length} 个节点属性。\n\n请打开 ${scriptName}.ts 文件，手动合并绑定部分。`);
            } else {
                await showWarning('复制失败，请手动复制', `复制到剪贴板失败，请手动复制以下内容：\n\n${clipboardContent}`);
            }
            await regenerateWidgetImportAll();
            return;
        }

        await createScriptFile(scriptName, scriptContent, targetDir);
        await regenerateWidgetImportAll();
        await showSuccess('Widget脚本生成成功', `Widget脚本已生成到 ${targetDir}/${scriptName}.ts\n包含 ${nodeProperties.length} 个节点属性。`);
    } catch (error) {
        console.error('生成Widget脚本失败:', error);
        await showErrorMessage('生成失败', error.message || String(error));
    }
}

// 获取所有子节点
async function getAllChildNodes(rootUuid, includeRoot = false) {
    const nodes = [];

    const collectNodes = async (parentUuid, ownerUuid = '') => {
        try {
            const node = await Editor.Message.request('scene', 'query-node', parentUuid);
            if (!node) return;

            const nodeName = node.name?.value || '';
            // 记录节点；UI脚本生成跳过根节点，前缀检查需要把选中的 m_list 根节点也纳入扫描。
            if ((includeRoot || parentUuid !== rootUuid) && nodeName) {
                nodes.push({
                    uuid: parentUuid,
                    parentUuid: ownerUuid,
                    name: nodeName
                });
            }

            // 获取子节点
            const children = node.children;
            for (const child of children) {
                if (child && child.value.uuid) {
                    await collectNodes(child.value.uuid, parentUuid);
                }
            }
        } catch (error) {
            console.error('收集节点失败:', error);
        }
    };

    await collectNodes(rootUuid);
    return nodes;
}

// 根据配置筛选节点
function filterNodesByConfig(nodes, config, context = null) {
    const properties = [];

    for (const node of nodes) {
        const nodeName = node.name;

        for (const cfg of config) {
            if (nodeName.startsWith(cfg.prefix)) {
                // 代码生成使用 codeType（如果存在），否则使用 component
                const codeType = cfg.codeType || cfg.component;
                const listItemMeta = context ? context.listItemByListName.get(nodeName) : null;

                // 生成属性名（去掉m_，前面加_）
                const prefixIndex = cfg.prefix.indexOf('_');
                const propertyName = '_' + nodeName.substring(prefixIndex + 1);

                // 生成方法名（用于按钮）
                let methodName = '';
                if (cfg.prefix === 'm_btn') {
                    const namePart = nodeName.substring('m_'.length);
                    const words = namePart.split(/(?=[A-Z])/);
                    const capitalized = words.map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join('');
                    methodName = `on${capitalized}Click`;
                }

                properties.push({
                    originalName: nodeName,
                    propertyName: propertyName,
                    componentType: codeType,
                    prefix: cfg.prefix,
                    methodName: methodName,
                    listItemMeta: listItemMeta
                });

                break;
            }
        }
    }

    return properties;
}

// 生成完整脚本内容（使用模板）
function generateScriptContent(className, nodeProperties, template, context = null) {
    // 格式化类名
    const validClassName = className.replace(/[^a-zA-Z0-9_]/g, '_');
    const formattedClassName = validClassName.charAt(0).toUpperCase() + validClassName.slice(1);

    // 收集需要导入的组件类型
    const importComponents = new Set(['Label', 'Sprite', 'Node', 'Layout']);
    let hasListView = false;
    let hasScrollView = false;
    const listItemImports = new Set();

    nodeProperties.forEach(prop => {
        if (prop.componentType && prop.componentType !== 'Node') {
            importComponents.add(prop.componentType);
        }

        if (prop.componentType === 'ListView') {
            hasListView = true;
        }

        if (prop.componentType === 'ScrollView') {
            hasScrollView = true;
        }

        if (prop.listItemMeta) {
            listItemImports.add(prop.listItemMeta.className);
        }
    });

    // 生成导入语句
    const importStatements = [];

    // 添加组件导入
    const ccComponents = Array.from(importComponents)
        .filter(comp => comp !== 'ListView' && comp !== 'ScrollView')
        .sort();

    if (ccComponents.length > 0) {
        importStatements.push(`import {${ccComponents.join(', ')}} from "cc";`);
    }

    // 添加自定义组件导入
    if (hasListView) {
        importStatements.push('import ListView from "../../../ty-framework/module/ui/loop-list/ListView"');
    }

    if (hasScrollView) {
        importStatements.push('import ScrollView from "../Core/ScrollView/ScrollView";');
    }

    Array.from(listItemImports).sort().forEach(className => {
        importStatements.push(`import {${className}} from "./${WIDGET_SCRIPT_DIR}/${className}";`);
    });

    // 添加基础导入
    importStatements.push('import {UIDecorator} from "../../../ty-framework/module/ui/UIDecorator";');
    importStatements.push('import {UIWindow} from "../../../ty-framework/module/ui/UIWindow";');
    importStatements.push('import {UILayer} from "../../../ty-framework/module/ui/WindowAttribute";');
    importStatements.push('import {UIName} from "./UIName";');
    const importSection = importStatements.join('\n');

    // 生成属性定义
    const propertyDefinitions = nodeProperties.map(prop => {
        return `    private ${prop.propertyName}: ${prop.componentType};`;
    }).join('\n\n');

    // 生成绑定语句
    const bindStatements = nodeProperties.map(prop => {
        const statements = [];
        if (prop.componentType === 'Node') {
            statements.push(`        this.${prop.propertyName} = this.get("${prop.originalName}");`);
        } else {
            statements.push(`        this.${prop.propertyName} = this.get("${prop.originalName}").getComponent(${prop.componentType});`);
        }

        if (prop.listItemMeta) {
            statements.push(`        this.${prop.propertyName}.setItemWidget(${prop.listItemMeta.className}, this);`);
        }

        return statements.join('\n');
    }).join('\n');

    // 生成事件语句
    const btnProperties = nodeProperties.filter(prop => prop.prefix === 'm_btn');
    const eventStatements = btnProperties.map(prop => {
        return `        this.onRegisterEvent(this.${prop.propertyName}, this.${prop.methodName})`;
    }).join('\n');

    // 生成点击方法
    const clickMethods = btnProperties.map(prop => {
        return `    private ${prop.methodName}(btn:Node,param:any) {\n\n    }`;
    }).join('\n\n');

    // 替换模板中的占位符
    let scriptContent = template;

    // 替换导入语句
    scriptContent = scriptContent.replace(/\[IMPORT_STATEMENTS\]/g, importSection);

    // 替换类名
    scriptContent = scriptContent.replace(/\[CLASS_NAME\]/g, formattedClassName);

    // 替换属性定义（如果没有属性，留空）
    scriptContent = scriptContent.replace(/\[PROPERTY_DEFINITIONS\]/g, propertyDefinitions || '');

    // 替换绑定语句（如果没有绑定语句，留空）
    scriptContent = scriptContent.replace(/\[BIND_STATEMENTS\]/g, bindStatements || '');

    // 替换事件语句（如果没有事件语句，留空）
    scriptContent = scriptContent.replace(/\[EVENT_STATEMENTS\]/g, eventStatements || '');

    // 替换点击方法（如果没有点击方法，留空）
    scriptContent = scriptContent.replace(/\[CLICK_METHODS\]/g, clickMethods || '');

    // 清理多余的空行
    scriptContent = scriptContent.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 如果没有任何属性，移除多余的空行
    if (nodeProperties.length === 0) {
        scriptContent = scriptContent.replace(/\n\s*\n\s*override bindMemberProperty\(\) \{/g, '\n\n    override bindMemberProperty() {');
        scriptContent = scriptContent.replace(/bindMemberProperty\(\) \{\s*\}/g, 'bindMemberProperty() {\n\n    }');
    }

    return scriptContent;
}

function getListItemChildNodes(rootNode, nodes, nodeMap) {
    return nodes.filter(node => isDescendantOf(node, rootNode, nodeMap));
}

function generateListItemScriptContent(className, nodeProperties, options = {}) {
    const includeRecycle = options.includeRecycle !== false;
    const importComponents = new Set(['Node']);
    let hasListView = false;

    nodeProperties.forEach(prop => {
        if (prop.componentType && prop.componentType !== 'Node') {
            importComponents.add(prop.componentType);
        }
        if (prop.componentType === 'ListView') {
            hasListView = true;
        }
    });

    const importStatements = [];
    const ccComponents = Array.from(importComponents)
        .filter(comp => comp !== 'ListView' && comp !== 'UIWidget')
        .sort();

    if (ccComponents.length > 0) {
        importStatements.push(`import {${ccComponents.join(', ')}} from "cc";`);
    }
    if (hasListView) {
        importStatements.push('import ListView from "../../../../ty-framework/module/ui/loop-list/ListView";');
    }
    importStatements.push('import {UIWidget} from "../../../../ty-framework/module/ui/UIWidget";');

    const propertyDefinitions = nodeProperties.map(prop => {
        return `    private ${prop.propertyName}: ${prop.componentType};`;
    }).join('\n\n');

    const bindStatements = nodeProperties.map(prop => {
        if (prop.componentType === 'Node') {
            return `        this.${prop.propertyName} = this.get("${prop.originalName}");`;
        }
        return `        this.${prop.propertyName} = this.get("${prop.originalName}").getComponent(${prop.componentType});`;
    }).join('\n');

    const btnProperties = nodeProperties.filter(prop => prop.prefix === 'm_btn');
    const eventStatements = btnProperties.map(prop => {
        return `        this.onRegisterEvent(this.${prop.propertyName}, this.${prop.methodName})`;
    }).join('\n');

    const clickMethods = btnProperties.map(prop => {
        return `    private ${prop.methodName}(btn:Node,param:any) {\n\n    }`;
    }).join('\n\n');
    const recycleMethod = includeRecycle ? `\n\n    override onRecycle() {\n\n    }` : '';

    return `${importStatements.join('\n')}\n\nexport class ${className} extends UIWidget {\n${propertyDefinitions}\n\n    override bindMemberProperty() {\n${bindStatements}\n    }\n\n    override registerEvent() {\n${eventStatements}\n    }\n\n${clickMethods}\n\n    override onCreate() {\n\n    }\n\n    override onRefresh() {\n\n    }${recycleMethod}\n\n    override onClosed() {\n\n    }\n}\n`.replace(/\n\s*\n\s*\n/g, '\n\n');
}

async function createListItemScripts(scriptName, allNodes, componentConfig, context) {
    if (!context || !context.listItemMetas || context.listItemMetas.length === 0) {
        return { total: 0, created: 0, existing: 0 };
    }
    if (context.duplicateClassNames && context.duplicateClassNames.length > 0) {
        throw new Error(`m_item 生成脚本名重复: ${context.duplicateClassNames.join(', ')}`);
    }

    const targetDir = loadPathConfig();
    const widgetDir = `${targetDir}/${WIDGET_SCRIPT_DIR}`;
    const projectPath = Editor.Project.path;
    ensureDirectoryExists(path.join(projectPath, 'assets', widgetDir));
    let created = 0;
    let existing = 0;

    for (const meta of context.listItemMetas) {
        const scriptPath = `db://assets/${widgetDir}/${meta.className}.ts`;
        if (await checkFileExists(scriptPath)) {
            existing++;
            continue;
        }

        const childNodes = getListItemChildNodes(meta.rootNode, allNodes, context.nodeMap);
        const childProperties = filterNodesByConfig(childNodes, componentConfig, context);
        const scriptContent = generateListItemScriptContent(meta.className, childProperties);
        await createScriptFile(meta.className, scriptContent, widgetDir);
        created++;
    }

    await regenerateWidgetImportAll();
    return { total: context.listItemMetas.length, created, existing };
}

// 创建脚本文件
async function createScriptFile(scriptName, scriptText, customTargetDir) {
    const targetDir = customTargetDir || loadPathConfig();
    let scriptPath = `db://assets/${targetDir}/${scriptName}.ts`;

    console.log('创建脚本文件:', scriptPath);

    try {
        const result = await Editor.Message.request('asset-db', 'create-asset', scriptPath, scriptText, {});
        return result;
    } catch (error) {
        console.error('创建脚本失败:', error);

        // 备选方案：先确保目录存在
        try {
            const dirPath = `db://assets/${targetDir}`;

            // 检查目录是否存在，如果不存在则创建
            try {
                await Editor.Message.request('asset-db', 'query-asset-info', dirPath);
            } catch (dirError) {
                console.log('目录不存在，尝试创建...');

                const parts = targetDir.split('/');
                let currentPath = 'assets';

                for (const part of parts) {
                    const checkPath = `db://${currentPath}/${part}`;
                    try {
                        await Editor.Message.request('asset-db', 'query-asset-info', checkPath);
                    } catch (e) {
                        await Editor.Message.request('asset-db', 'create-asset', checkPath, '', { type: 'folder' });
                    }
                    currentPath = `${currentPath}/${part}`;
                }
            }

            // 再次尝试创建文件
            const result = await Editor.Message.request('asset-db', 'create-asset', scriptPath, scriptText, {});
            console.log('脚本创建成功（备选方案）:', result);
            return result;
        } catch (fallbackError) {
            console.error('备选方案也失败:', fallbackError);
            throw new Error(`无法创建脚本文件: ${fallbackError.message}`);
        }
    }
}

// UI辅助方法
function containsUI(name) {
    const lowerName = name.toLowerCase();
    return lowerName.includes('ui');
}

async function showWarning(message) {
    return Editor.Dialog.info('提示', {
        title: '操作提示',
        detail: message,
        buttons: ['确定']
    });
}

async function showErrorMessage(title, message) {
    return Editor.Dialog.info('错误', {
        title: title,
        detail: message,
        buttons: ['确定']
    });
}

async function showSuccess(title, message) {
    return Editor.Dialog.info('成功', {
        title: title,
        detail: message,
        buttons: ['确定']
    });
}

// ===========================
// 前缀检查：自动修正组件（两阶段）
// ===========================
async function checkPrefixComponents(nodeUuid) {
    try {
        let uuid = nodeUuid;
        if (!uuid) {
            const uuids = Editor.Selection.getSelected('node');
            if (!uuids || uuids.length === 0) {
                await showWarning('请先选中一个节点');
                return;
            }
            uuid = uuids[0];
        }

        // 读取组件配置
        const componentConfig = loadComponentConfig();

        // ======== 阶段 1：移除互斥组件 + 直接添加无冲突组件 ========
        const phase1Result = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'uitscreate',
            method: 'checkPrefixes_phase1',
            args: [uuid, JSON.stringify(componentConfig)],
        });

        if (!phase1Result) {
            await showWarning('检查失败，场景脚本未返回结果');
            return;
        }

        let allDetails = phase1Result.details ? [...phase1Result.details] : [];
        let totalFixed = phase1Result.fixed || 0;
        let totalRemoved = phase1Result.removed || 0;
        let totalSkipped = phase1Result.skipped || 0;
        let totalFailed = 0;

        // ======== 阶段 2：等待刷新后添加因互斥而推迟的组件 ========
        if (phase1Result.needsPhase2 && phase1Result.pendingAdds && phase1Result.pendingAdds.length > 0) {
            allDetails.push('');
            allDetails.push('--- 等待引擎刷新后执行阶段 2 ---');

            // 等待 800ms 让引擎完成组件移除的刷新（需要足够时间让场景进程 tick）
            await new Promise(resolve => setTimeout(resolve, 800));

            const phase2Result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'uitscreate',
                method: 'checkPrefixes_phase2',
                args: [JSON.stringify(phase1Result.pendingAdds)],
            });

            if (phase2Result) {
                totalFixed += phase2Result.fixed || 0;
                totalFailed += phase2Result.failed || 0;
                if (phase2Result.details) {
                    allDetails = allDetails.concat(phase2Result.details);
                }
            }

            // 如果 phase2 仍有失败，再重试一次（等待更长时间）
            if (phase2Result && phase2Result.failed > 0) {
                allDetails.push('');
                allDetails.push('--- 部分组件添加失败，等待后重试 ---');

                await new Promise(resolve => setTimeout(resolve, 1000));

                // 收集失败的项重试
                const retryAdds = phase1Result.pendingAdds.filter(item => {
                    // 检查 phase2 的 details 中是否有该节点的失败记录
                    return phase2Result.details.some(d => d.includes(item.name) && d.includes('失败'));
                });

                if (retryAdds.length > 0) {
                    const retryResult = await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'uitscreate',
                        method: 'checkPrefixes_phase2',
                        args: [JSON.stringify(retryAdds)],
                    });

                    if (retryResult) {
                        totalFixed += retryResult.fixed || 0;
                        totalFailed = Math.max(0, totalFailed - (retryResult.fixed || 0));
                        if (retryResult.details) {
                            allDetails = allDetails.concat(retryResult.details);
                        }
                    }
                }
            }
        }

        // ======== 阶段 3：为 m_list/content/m_item 自动生成 item Widget 脚本 ========
        try {
            const scriptNodes = await getAllChildNodes(uuid, true);
            const listItemContext = createListItemContext('PrefixCheck', scriptNodes);
            const scriptResult = await createListItemScripts('PrefixCheck', scriptNodes, componentConfig, listItemContext);
            if (scriptResult && scriptResult.total > 0) {
                allDetails.push('');
                allDetails.push('--- 生成 m_item Widget 脚本 ---');
                allDetails.push(`  ✓ item Widget: 共 ${scriptResult.total} 个，新建 ${scriptResult.created} 个，已存在 ${scriptResult.existing} 个`);
            }
        } catch (scriptError) {
            totalFailed += 1;
            allDetails.push('');
            allDetails.push('--- 生成 m_item Widget 脚本失败 ---');
            allDetails.push(`  ✖ ${scriptError.message || String(scriptError)}`);
        }

        // ======== 输出结果 ========
        let msg = `检查完成！\n\n`;
        msg += `扫描节点: ${phase1Result.total}\n`;
        msg += `添加组件: ${totalFixed}\n`;
        msg += `移除冲突: ${totalRemoved}\n`;
        msg += `无需修改: ${totalSkipped}\n`;
        if (totalFailed > 0) {
            msg += `添加失败: ${totalFailed}\n`;
        }
        if (allDetails.length > 0) {
            msg += `\n操作详情:\n` + allDetails.join('\n');
        }

        if (totalFailed > 0) {
            await showErrorMessage('前缀检查完成但有失败', msg);
        } else if (totalFixed > 0 || totalRemoved > 0) {
            await showSuccess('前缀检查完成', msg);
        } else {
            await Editor.Dialog.info('提示', {
                title: '前缀检查完成',
                detail: msg,
                buttons: ['确定'],
            });
        }
    } catch (e) {
        console.error('[UI脚本生成器] 前缀检查失败:', e);
        await showErrorMessage('检查失败', e.message || String(e));
    }
}

async function checkCommonAtlas(nodeUuid) {
    try {
        let uuid = nodeUuid;
        if (!uuid) {
            const uuids = Editor.Selection.getSelected('node');
            if (!uuids || uuids.length === 0) {
                await showWarning('请先选中一个节点');
                return;
            }
            uuid = uuids[0];
        }

        await psd2cccCommonAtlas.runCommonAtlasCheckForNode(uuid);
    } catch (e) {
        console.error('[UI脚本生成器] 检查公共图集失败:', e);
        await showErrorMessage('检查失败', e.message || String(e));
    }
}

// 导出函数
module.exports = {
    onHierarchyMenu: function(assetInfo) {
        return [
            {
                label: '🎯 生成UI脚本',
                async click() {
                    await generateUIScript(assetInfo);
                }
            },
            {
                label: '🧱 生成Widget脚本',
                async click() {
                    await generateWidgetScript(assetInfo);
                }
            },
            {
                label: '🔍 检查前缀组件',
                async click() {
                    await checkPrefixComponents(assetInfo);
                }
            },
            {
                label: '🧩 检查公共图集',
                async click() {
                    await checkCommonAtlas(assetInfo);
                }
            }
        ];
    }
};

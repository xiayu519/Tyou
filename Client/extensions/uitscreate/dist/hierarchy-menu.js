'use strict';

const fs = require("fs");
const path = require("path");

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

// 重新生成 UIImportAll.ts（防止 Tree Shaking 移除UI类）
async function regenerateUIImportAll() {
    try {
        const targetDir = loadPathConfig();
        const projectPath = Editor.Project.path;
        const uiNameFilePath = path.join(projectPath, 'assets', targetDir, 'UIName.ts');

        if (!fs.existsSync(uiNameFilePath)) {
            console.log('[UI脚本生成器] UIName.ts 不存在，跳过 UIImportAll 生成');
            return;
        }

        const content = fs.readFileSync(uiNameFilePath, 'utf8');

        // 从 UIName.ts 枚举中提取所有UI名称
        const enumPattern = /(\w+)\s*=\s*["']\w+["']/g;
        const uiNames = [];
        let match;
        while ((match = enumPattern.exec(content)) !== null) {
            uiNames.push(match[1]);
        }

        if (uiNames.length === 0) {
            console.log('[UI脚本生成器] UIName 枚举为空，跳过 UIImportAll 生成');
            return;
        }

        // 生成 UIImportAll.ts 内容（装饰器模式：仅需 side-effect import）
        const importLines = uiNames.map(name => `import "./${name}";`).join('\n');

        const importAllContent = `/**\n * UI统一导入文件（自动生成，请勿手动修改）\n *\n * 导入所有UI类以触发 @UIDecorator 装饰器的自注册，\n * 防止微信小游戏等平台构建时 Tree Shaking 移除UI类。\n * 右键生成UI脚本时会自动更新此文件。\n */\n${importLines}\n`;

        const importAllFilePath = path.join(projectPath, 'assets', targetDir, 'UIImportAll.ts');
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

// 向 UIName.ts 枚举中追加新条目
async function addUINameEntry(className) {
    try {
        const targetDir = loadPathConfig();
        const projectPath = Editor.Project.path;
        const uiNameFilePath = path.join(projectPath, 'assets', targetDir, 'UIName.ts');

        let content;
        if (fs.existsSync(uiNameFilePath)) {
            content = fs.readFileSync(uiNameFilePath, 'utf8');
        } else {
            // UIName.ts 不存在，创建初始内容
            content = `/**\n * UI名称枚举（自动生成，请勿手动修改）\n *\n * 右键生成UI脚本时会自动在此枚举中追加新条目。\n * 纯数据文件，无任何import，不参与任何循环依赖。\n */\nexport enum UIName {\n}\n`;
        }

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
        if (prop.componentType === 'Node') {
            return `        this.${prop.propertyName} = this.get("${prop.originalName}");`;
        } else {
            return `        this.${prop.propertyName} = this.get("${prop.originalName}").getComponent(${prop.componentType});`;
        }
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

        // 5. 加载组件配置和模板
        const componentConfig = loadComponentConfig();
        const template = loadTemplate();

        // 6. 筛选节点
        const nodeProperties = filterNodesByConfig(allNodes, componentConfig);

        // 7. 生成脚本内容
        const scriptName = nodeName.replace(/\(Clone\)/g, '').replace('.prefab', '');
        const scriptContent = generateScriptContent(scriptName, nodeProperties, template);

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

// 获取所有子节点
async function getAllChildNodes(rootUuid) {
    const nodes = [];

    const collectNodes = async (parentUuid) => {
        try {
            const node = await Editor.Message.request('scene', 'query-node', parentUuid);
            if (!node) return;

            const nodeName = node.name?.value || '';
            // 记录节点（跳过根节点本身）
            if (parentUuid !== rootUuid && nodeName) {
                nodes.push({
                    uuid: parentUuid,
                    name: nodeName
                });
            }

            // 获取子节点
            const children = node.children;
            for (const child of children) {
                if (child && child.value.uuid) {
                    await collectNodes(child.value.uuid);
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
function filterNodesByConfig(nodes, config) {
    const properties = [];

    for (const node of nodes) {
        const nodeName = node.name;

        for (const cfg of config) {
            if (nodeName.startsWith(cfg.prefix)) {
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
                    componentType: cfg.component,
                    prefix: cfg.prefix,
                    methodName: methodName
                });

                break;
            }
        }
    }

    return properties;
}

// 生成完整脚本内容（使用模板）
function generateScriptContent(className, nodeProperties, template) {
    // 格式化类名
    const validClassName = className.replace(/[^a-zA-Z0-9_]/g, '_');
    const formattedClassName = validClassName.charAt(0).toUpperCase() + validClassName.slice(1);

    // 收集需要导入的组件类型
    const importComponents = new Set(['Label', 'Sprite', 'Node', 'Layout']);
    let hasListView = false;
    let hasScrollView = false;

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
        importStatements.push('import ListView from "../core/loop-list/ListView"');
    }

    if (hasScrollView) {
        importStatements.push('import ScrollView from "../Core/ScrollView/ScrollView";');
    }

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
        if (prop.componentType === 'Node') {
            return `        this.${prop.propertyName} = this.get("${prop.originalName}");`;
        } else {
            return `        this.${prop.propertyName} = this.get("${prop.originalName}").getComponent(${prop.componentType});`;
        }
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

// 创建脚本文件
async function createScriptFile(scriptName, scriptText) {
    const targetDir = loadPathConfig();
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

// 导出函数
module.exports = {
    onHierarchyMenu: function(assetInfo) {
        return [{
            label: '🎯 生成UI脚本',
            async click() {
                // assetInfo 即为右键点击的节点 uuid，直接传入避免依赖 Selection API
                await generateUIScript(assetInfo);
            }
        }];
    }
};
'use strict';

/**
 * 前缀检查场景脚本 —— 运行在场景渲染进程中
 * 根据前缀规则自动添加/移除组件
 *
 * 采用两阶段方案：
 *   Phase 1 (checkPrefixes_phase1): 扫描节点，移除互斥组件，记录需要添加的组件
 *   Phase 2 (checkPrefixes_phase2): 在组件刷新后，添加目标组件
 *
 * 这样做是因为 Cocos Creator 中移除组件后在同一帧内无法立即添加互斥组件，
 * 必须等引擎刷新（至少一帧）后才能添加。
 */

// ============================================================
// Cocos Creator 互斥组件组
// ============================================================
// 同一个节点上不能同时存在同组的组件。
// 组 1: 渲染器组件 (继承自 UIRenderer / Renderable2D) — 每个节点只能有一个渲染器
// 组 2: 交互组件 — Toggle / Slider / ProgressBar / EditBox 存在底层互斥
var EXCLUSIVE_GROUPS = [
    // 渲染器互斥组：Sprite, Label, RichText, EditBox, TiledMap, Graphics, Mask 等
    // EditBox 既是渲染器也是交互组件，放在两个组里
    ['cc.Sprite', 'cc.Label', 'cc.RichText', 'cc.EditBox', 'cc.TiledLayer'],
    // 交互组件互斥组
    ['cc.Toggle', 'cc.Slider', 'cc.ProgressBar'],
];

/**
 * 根据配置中的 component 名称解析为引擎组件全名
 * 返回一个数组：[必须拥有的主组件, ...可选的辅助组件]
 * 返回 null 表示只需要是 Node 即可（无需额外组件）
 */
function resolveRequiredComponents(component) {
    if (component === 'ListView') {
        return { main: 'pkg:ListView', deps: ['cc.ScrollView', 'cc.Mask'] };
    }

    var map = {
        'Node':        null,                                  // m_go: 只要是 Node 就行
        'UITransform': { main: 'cc.UITransform', deps: [] },  // m_tf: 需要 UITransform
        'Label':       { main: 'cc.Label',       deps: [] },  // m_text: 需要 Label
        'Button':      { main: 'cc.Button',      deps: [] },  // m_btn: 需要 Button
        'Sprite':      { main: 'cc.Sprite',      deps: [] },  // m_img: 需要 Sprite
        'Layout':      { main: 'cc.Layout',      deps: [] },  // m_grid: 需要 Layout
        'ListView':    { main: 'pkg:ListView',   deps: ['cc.ScrollView', 'cc.Mask'] },  // m_list: 需要 Tyou ListView
        'ScrollView':  { main: 'cc.ScrollView',  deps: [] },  // m_scroll: 需要 ScrollView
        'Toggle':      { main: 'cc.Toggle',      deps: [] },  // m_toggle: 需要 Toggle
        'Slider':      { main: 'cc.Slider',      deps: [] },  // m_slider: 需要 Slider
        'ProgressBar': { main: 'cc.ProgressBar', deps: [] },  // m_progress: 需要 ProgressBar
        'EditBox':     { main: 'cc.EditBox',     deps: [] },  // m_eb: 需要 EditBox
        'RichText':    { main: 'cc.RichText',    deps: [] },  // m_rt: 需要 RichText
    };
    return map[component] || null;
}

/**
 * 获取目标组件的所有互斥组件列表
 */
function getExclusiveComponents(targetComp) {
    var toRemove = [];
    for (var g = 0; g < EXCLUSIVE_GROUPS.length; g++) {
        var group = EXCLUSIVE_GROUPS[g];
        var inGroup = false;
        for (var i = 0; i < group.length; i++) {
            if (group[i] === targetComp) { inGroup = true; break; }
        }
        if (inGroup) {
            for (var j = 0; j < group.length; j++) {
                if (group[j] !== targetComp) {
                    toRemove.push(group[j]);
                }
            }
        }
    }
    return toRemove;
}

/**
 * 递归收集所有子节点（包含子节点的子节点）
 */
function collectAllChildren(node) {
    var result = [];
    var children = node.children;
    for (var i = 0; i < children.length; i++) {
        result.push(children[i]);
        var sub = collectAllChildren(children[i]);
        for (var j = 0; j < sub.length; j++) {
            result.push(sub[j]);
        }
    }
    return result;
}

/**
 * 在场景中根据 UUID 查找节点
 */
function findNodeByUuid(scene, uuid) {
    var find = function (node, id) {
        if (node.uuid === id || node._id === id) return node;
        var ch = node.children;
        for (var i = 0; i < ch.length; i++) {
            var f = find(ch[i], id);
            if (f) return f;
        }
        return null;
    };
    return find(scene, uuid);
}

function ensureComponent(node, compName, details) {
    var comp = node.getComponent(compName);
    if (comp) return comp;

    try {
        comp = node.addComponent(compName);
        details.push('  ✔ [' + node.name + '] 添加 ' + compName);
        return comp;
    } catch (err) {
        details.push('  ✖ [' + node.name + '] 添加 ' + compName + ' 失败: ' + err.message);
        return null;
    }
}

function findDirectChildByName(node, name) {
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
        if (children[i].name === name) {
            return children[i];
        }
    }
    return null;
}

function reparentPreserveWorld(node, parent) {
    var worldPosition = null;
    if (node.worldPosition && typeof node.worldPosition.clone === 'function') {
        worldPosition = node.worldPosition.clone();
    }

    parent.addChild(node);

    if (worldPosition && typeof node.setWorldPosition === 'function') {
        node.setWorldPosition(worldPosition);
    }
}

function collectServingItems(listNode) {
    var result = [];
    var walk = function (node) {
        var children = node.children || [];
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            var name = child.name || '';

            if (child !== listNode && name.indexOf('m_list') === 0) {
                continue;
            }

            if (name.indexOf('m_item') === 0) {
                result.push(child);
                continue;
            }

            walk(child);
        }
    };

    walk(listNode);
    return result;
}

function normalizeListViews(root, details) {
    var allNodes = collectAllChildren(root);
    var fixed = 0;
    var errors = [];

    for (var i = 0; i < allNodes.length; i++) {
        var listNode = allNodes[i];
        var listName = listNode.name || '';
        if (listName.indexOf('m_list') !== 0) continue;

        var items = collectServingItems(listNode);
        if (items.length === 0) {
            errors.push('[' + listName + '] 缺少服务于当前列表的 m_item 模板');
            details.push('  ✖ [' + listName + '] 缺少 m_item 模板');
            continue;
        }

        if (items.length > 1) {
            errors.push('[' + listName + '] 存在多个 m_item 模板，请只保留一个');
            details.push('  ✖ [' + listName + '] 存在多个 m_item 模板');
            continue;
        }

        var itemNode = items[0];
        var beforeCount = details.length;
        var listTransform = ensureComponent(listNode, 'cc.UITransform', details);
        var scrollView = ensureComponent(listNode, 'cc.ScrollView', details);
        ensureComponent(listNode, 'cc.Mask', details);
        var listView = ensureComponent(listNode, 'pkg:ListView', details);

        var content = findDirectChildByName(listNode, 'content');
        if (!content) {
            content = new cc.Node('content');
            listNode.addChild(content);
            details.push('  ✔ [' + listName + '] 创建 content 节点');
        }

        var contentTransform = ensureComponent(content, 'cc.UITransform', details);
        ensureComponent(content, 'cc.Layout', details);
        var itemTransform = ensureComponent(itemNode, 'cc.UITransform', details);
        ensureComponent(itemNode, 'pkg:ListItem', details);

        if (listTransform && contentTransform && contentTransform.setContentSize) {
            try {
                if (listTransform.contentSize) {
                    contentTransform.setContentSize(listTransform.contentSize);
                } else {
                    contentTransform.setContentSize(listTransform.width || 0, listTransform.height || 0);
                }
            } catch (err) {
                try {
                    contentTransform.setContentSize(listTransform.width || 0, listTransform.height || 0);
                } catch (innerErr) {
                    details.push('  ⚠ [' + content.name + '] 同步尺寸失败: ' + innerErr.message);
                }
            }
        }

        if (listTransform && contentTransform) {
            if (typeof contentTransform.setAnchorPoint === 'function') {
                contentTransform.setAnchorPoint(0.5, 1);
            } else {
                contentTransform.anchorX = 0.5;
                contentTransform.anchorY = 1;
            }
            if (typeof content.setPosition === 'function') {
                content.setPosition(0, (listTransform.height || 0) * (1 - listTransform.anchorY), 0);
            }
        }

        if (itemNode.parent !== content) {
            reparentPreserveWorld(itemNode, content);
            details.push('  ✔ [' + itemNode.name + '] 移动到 ' + listName + '/content');
        }

        if (itemTransform && typeof itemNode.setPosition === 'function') {
            itemNode.setPosition(itemNode.position.x || 0, -(itemTransform.height || 0) * itemTransform.anchorY, 0);
        }

        if (scrollView) {
            scrollView.content = content;
        }

        if (listView) {
            listView.templateType = 1;
            listView.tmpNode = itemNode;
            listView.tmpPrefab = null;
        }

        if (details.length > beforeCount) {
            fixed++;
        } else {
            details.push('  ✓ [' + listName + '] ListView 结构已符合 m_list/content/m_item');
        }
    }

    return {
        fixed: fixed,
        errors: errors,
    };
}

module.exports = {
    methods: {
        /**
         * 阶段 1：扫描所有子节点，移除互斥组件，记录需要延迟添加的组件
         *
         * @param {string} rootUuid  - 根节点 UUID
         * @param {string} configStr - JSON 字符串，componentConfig 数组
         * @returns {{
         *   removed: number,
         *   skipped: number,
         *   total: number,
         *   needsPhase2: boolean,
         *   pendingAdds: Array<{ uuid: string, name: string, comp: string }>,
         *   details: string[]
         * }}
         */
        checkPrefixes_phase1: function (rootUuid, configStr) {
            var config = JSON.parse(configStr);
            var scene = cc.director.getScene();
            if (!scene) throw new Error('当前没有打开的场景');

            var root = findNodeByUuid(scene, rootUuid);
            if (!root) throw new Error('找不到节点 (UUID: ' + rootUuid + ')');

            var allNodes = collectAllChildren(root);
            var removed = 0, skipped = 0;
            var fixed = 0;
            var details = [];
            // 记录需要在 phase2 中添加的组件 { uuid, name, comp }
            var pendingAdds = [];
            // 记录没有互斥冲突、可以直接添加的组件
            var directAdds = [];

            for (var n = 0; n < allNodes.length; n++) {
                var node = allNodes[n];
                var name = node.name || '';

                // 查找匹配的前缀规则（最长前缀匹配优先）
                var matchedRule = null;
                for (var c = 0; c < config.length; c++) {
                    if (name.indexOf(config[c].prefix) === 0) {
                        if (!matchedRule || config[c].prefix.length > matchedRule.prefix.length) {
                            matchedRule = config[c];
                        }
                    }
                }

                if (!matchedRule) continue;

                var resolved = resolveRequiredComponents(matchedRule.component);

                // m_go (Node) — 只要节点存在就行，不需要任何额外组件
                if (!resolved) {
                    skipped++;
                    details.push('  ✓ [' + name + '] Node 节点，无需额外组件');
                    continue;
                }

                var mainComp = resolved.main;

                if (resolved.deps && resolved.deps.length > 0) {
                    for (var depIndex = 0; depIndex < resolved.deps.length; depIndex++) {
                        var depComp = resolved.deps[depIndex];
                        if (!node.getComponent(depComp)) {
                            try {
                                node.addComponent(depComp);
                                fixed++;
                                details.push('  ✔ [' + name + '] 添加依赖组件 ' + depComp);
                            } catch (err) {
                                pendingAdds.push({
                                    uuid: node.uuid || node._id,
                                    name: name,
                                    comp: depComp,
                                });
                                details.push('  ⏳ [' + name + '] 依赖组件推迟添加 ' + depComp + ': ' + err.message);
                            }
                        }
                    }
                }

                // 检查是否已有目标组件
                var hasTarget = node.getComponent(mainComp);
                if (hasTarget) {
                    skipped++;
                    details.push('  ✓ [' + name + '] 已有 ' + mainComp);
                    continue;
                }

                // 获取互斥组件列表
                var exclusives = getExclusiveComponents(mainComp);
                var hadConflict = false;

                // 移除互斥组件
                for (var e = 0; e < exclusives.length; e++) {
                    var existing = node.getComponent(exclusives[e]);
                    if (existing) {
                        try {
                            // 优先使用 destroy() — 在编辑器中比 removeComponent 更可靠
                            // destroy() 会在帧末清理，确保引擎内部状态一致
                            if (typeof existing.destroy === 'function') {
                                existing.destroy();
                            } else {
                                node.removeComponent(existing);
                            }
                            removed++;
                            hadConflict = true;
                            details.push('  ✖ [' + name + '] 移除互斥组件 ' + exclusives[e]);
                        } catch (err) {
                            details.push('  ⚠ [' + name + '] 移除 ' + exclusives[e] + ' 失败: ' + err.message);
                        }
                    }
                }

                if (hadConflict) {
                    // 有互斥冲突被移除 → 必须等刷新后才能添加，记录到 pendingAdds
                    pendingAdds.push({
                        uuid: node.uuid || node._id,
                        name: name,
                        comp: mainComp,
                    });
                    details.push('  ⏳ [' + name + '] 等待刷新后添加 ' + mainComp);
                } else {
                    // 没有互斥冲突 → 直接添加
                    directAdds.push({
                        node: node,
                        name: name,
                        comp: mainComp,
                    });
                }
            }

            // 直接添加没有冲突的组件
            for (var d = 0; d < directAdds.length; d++) {
                var item = directAdds[d];
                try {
                    item.node.addComponent(item.comp);
                    fixed++;
                    details.push('  ✔ [' + item.name + '] 添加 ' + item.comp);
                } catch (err) {
                    // 添加失败可能是因为隐含的互斥（引擎内部依赖），也推迟到 phase2
                    pendingAdds.push({
                        uuid: item.node.uuid || item.node._id,
                        name: item.name,
                        comp: item.comp,
                    });
                    details.push('  ⏳ [' + item.name + '] 直接添加失败，推迟到刷新后: ' + err.message);
                }
            }

            var listNormalize = normalizeListViews(root, details);
            fixed += listNormalize.fixed;

            return {
                fixed: fixed,
                removed: removed,
                skipped: skipped,
                total: allNodes.length,
                needsPhase2: pendingAdds.length > 0,
                pendingAdds: pendingAdds,
                listErrors: listNormalize.errors,
                details: details,
            };
        },

        /**
         * 阶段 2：在引擎刷新后，添加之前因互斥冲突而推迟的组件
         *
         * @param {string} pendingAddsStr - JSON 字符串，pendingAdds 数组
         * @returns {{ fixed: number, failed: number, details: string[] }}
         */
        checkPrefixes_phase2: function (pendingAddsStr, rootUuid) {
            var pendingAdds = JSON.parse(pendingAddsStr);
            var scene = cc.director.getScene();
            if (!scene) throw new Error('当前没有打开的场景');
            var root = rootUuid ? findNodeByUuid(scene, rootUuid) : scene;
            if (!root) throw new Error('找不到节点 (UUID: ' + rootUuid + ')');

            var fixed = 0, failed = 0;
            var details = [];

            for (var i = 0; i < pendingAdds.length; i++) {
                var item = pendingAdds[i];
                var node = findNodeByUuid(scene, item.uuid);

                if (!node) {
                    failed++;
                    details.push('  ⚠ [' + item.name + '] 找不到节点，跳过');
                    continue;
                }

                // 再次检查是否已有目标组件（防止重复添加）
                var hasTarget = node.getComponent(item.comp);
                if (hasTarget) {
                    details.push('  ✓ [' + item.name + '] 刷新后已有 ' + item.comp + '，跳过');
                    continue;
                }

                // 检查互斥组件是否还存在（可能 destroy 还没完成）
                var stillHasConflict = false;
                var exclusives = getExclusiveComponents(item.comp);
                for (var e = 0; e < exclusives.length; e++) {
                    var conflict = node.getComponent(exclusives[e]);
                    if (conflict && conflict.isValid !== false) {
                        stillHasConflict = true;
                        details.push('  ⚠ [' + item.name + '] 互斥组件 ' + exclusives[e] + ' 仍未销毁');
                        break;
                    }
                }
                if (stillHasConflict) {
                    failed++;
                    details.push('  ✖ [' + item.name + '] 互斥组件仍存在，无法添加 ' + item.comp);
                    continue;
                }

                try {
                    node.addComponent(item.comp);
                    fixed++;
                    details.push('  ✔ [' + item.name + '] 刷新后添加 ' + item.comp + ' 成功');
                } catch (err) {
                    failed++;
                    details.push('  ✖ [' + item.name + '] 刷新后添加 ' + item.comp + ' 仍然失败: ' + err.message);
                }
            }

            var listNormalize = normalizeListViews(root, details);
            fixed += listNormalize.fixed;

            return {
                fixed: fixed,
                failed: failed,
                listErrors: listNormalize.errors,
                details: details,
            };
        },

        /**
         * 兼容旧版：单次调用（用于没有互斥冲突的简单场景）
         * 内部调用 phase1，如果没有 pendingAdds 直接返回
         */
        checkPrefixes: function (rootUuid, configStr) {
            return this.checkPrefixes_phase1(rootUuid, configStr);
        },
    },
};

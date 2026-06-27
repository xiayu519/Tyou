type Size = { width: number; height: number };

const FALLBACK_DESIGN_SIZE: Size = { width: 720, height: 1280 };

function findCanvasNode() {
    const scene = cc.director.getScene();
    if (!scene) return null;
    return findCanvas(scene);
}

function findCanvas(node: any): any {
    if (node.getComponent && node.getComponent('cc.Canvas')) {
        return node;
    }

    for (const child of node.children || []) {
        const found = findCanvas(child);
        if (found) return found;
    }

    return null;
}

function isValidSize(size: any): size is Size {
    return !!size
        && Number.isFinite(size.width)
        && Number.isFinite(size.height)
        && size.width > 0
        && size.height > 0;
}

function getContentSize(node: any): Size | null {
    const transform = node && node.getComponent && node.getComponent('cc.UITransform');
    if (!transform) return null;

    if (typeof transform.getContentSize === 'function') {
        const size = transform.getContentSize();
        if (isValidSize(size)) {
            return { width: size.width, height: size.height };
        }
    }

    if (isValidSize(transform.contentSize)) {
        return { width: transform.contentSize.width, height: transform.contentSize.height };
    }

    if (Number.isFinite(transform.width) && Number.isFinite(transform.height) && transform.width > 0 && transform.height > 0) {
        return { width: transform.width, height: transform.height };
    }

    return null;
}

function getViewDesignResolutionSize(): Size | null {
    const view = cc.view;
    if (!view || typeof view.getDesignResolutionSize !== 'function') return null;

    const designSize = view.getDesignResolutionSize();
    if (!isValidSize(designSize)) return null;

    return { width: designSize.width, height: designSize.height };
}

function resolveDesignSize(canvasNode: any): Size {
    return getViewDesignResolutionSize() || getContentSize(canvasNode) || { ...FALLBACK_DESIGN_SIZE };
}

function setupFullScreenWidget(node: any) {
    const widget = node.getComponent('cc.Widget') || node.addComponent('cc.Widget');

    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.left = 0;
    widget.right = 0;
    widget.top = 0;
    widget.bottom = 0;
    widget.alignMode = cc.Widget?.AlignMode?.ON_WINDOW_RESIZE ?? 0;

    if (typeof widget.updateAlignment === 'function') {
        widget.updateAlignment();
    }

    return widget;
}

function calcPosition(childData: any, parentOffset: { left: number; top: number }, parentSize: Size) {
    let centerX: number;
    let centerY: number;

    if (childData.sourceBounds) {
        centerX = (childData.sourceBounds.left + childData.sourceBounds.right) * 0.5;
        centerY = (childData.sourceBounds.top + childData.sourceBounds.bottom) * 0.5;
    } else {
        centerX = childData.offset.left + childData.size.width * 0.5;
        centerY = childData.offset.top + childData.size.height * 0.5;
    }

    const parentCenterX = parentOffset.left + parentSize.width * 0.5;
    const parentCenterY = parentOffset.top + parentSize.height * 0.5;

    return {
        x: centerX - parentCenterX,
        y: -(centerY - parentCenterY),
    };
}

function getLayoutRect(data: any) {
    if (data.sourceBounds) {
        return {
            offset: { left: data.sourceBounds.left, top: data.sourceBounds.top },
            size: {
                width: data.sourceBounds.right - data.sourceBounds.left,
                height: data.sourceBounds.bottom - data.sourceBounds.top,
            },
        };
    }

    return {
        offset: data.offset,
        size: data.size,
    };
}

function ensureOpacity(node: any, opacityPercent: number) {
    if (opacityPercent >= 100) return;
    const opacity = node.getComponent('cc.UIOpacity') || node.addComponent('cc.UIOpacity');
    opacity.opacity = Math.round(opacityPercent * 2.55);
}

function createNode(
    parent: any,
    data: any,
    parentOffset: { left: number; top: number },
    parentSize: Size,
    spriteMap: Record<string, string>,
) {
    const node = new cc.Node(data.name);
    parent.addChild(node);

    const displayWidth = (data.trimmedSize && data.trimmedSize.width) || data.size.width;
    const displayHeight = (data.trimmedSize && data.trimmedSize.height) || data.size.height;
    const transform = node.addComponent('cc.UITransform');
    transform.setContentSize(displayWidth, displayHeight);

    const pos = calcPosition(data, parentOffset, parentSize);
    node.setPosition(pos.x, pos.y, 0);

    if (data.type === 'png') {
        const sprite = node.addComponent('cc.Sprite');
        const applyCustomSize = () => {
            sprite.sizeMode = 0;
            transform.setContentSize(displayWidth, displayHeight);
        };
        applyCustomSize();

        if (data.sliceBorder) {
            sprite.type = 1;
        }

        const opacity = (data.options && typeof data.options.opacity === 'number') ? data.options.opacity : 100;
        ensureOpacity(node, opacity);

        const spriteFrameUuid = spriteMap[data.relativePath];
        if (spriteFrameUuid) {
            try {
                const sliceBorder = data.sliceBorder;
                const originalSize = data.originalSize;
                const cached = cc.assetManager.assets.get(spriteFrameUuid);

                const applySpriteFrame = (asset: any) => {
                    if (sliceBorder) {
                        asset.insetTop = sliceBorder.top;
                        asset.insetBottom = sliceBorder.bottom;
                        asset.insetLeft = sliceBorder.left;
                        asset.insetRight = sliceBorder.right;
                    }

                    sprite.spriteFrame = asset;
                    applyCustomSize();

                    if (sliceBorder && originalSize) {
                        transform.setContentSize(originalSize.width, originalSize.height);
                    }
                };

                if (cached) {
                    applySpriteFrame(cached);
                } else {
                    cc.assetManager.loadAny(spriteFrameUuid, (err: Error | null, asset: any) => {
                        if (!err && asset && node.isValid && sprite.isValid) {
                            applySpriteFrame(asset);
                        }
                    });
                }
            } catch (error: any) {
                console.warn('[PSD2CCC] Failed to load sprite frame:', data.relativePath, error?.message || error);
            }
        }
    } else if (data.type === 'text') {
        const label = node.addComponent('cc.Label');
        const options = data.options || {};
        label.string = options.textContents || '';
        label.fontSize = options.textSize || 14;

        const leading = options.leading;
        label.lineHeight = (typeof leading === 'number' && leading > 0) ? leading : (options.textSize || 14);
        label.overflow = options.textBoxBounds && options.textBoxBounds.width > 0 ? 1 : 0;
        label.useSystemFont = true;
        label.cacheMode = 0;

        const justificationMap: Record<string, number> = {
            LEFT: 0,
            CENTER: 1,
            RIGHT: 2,
            JUSTIFYLEFT: 0,
            JUSTIFYCENTER: 1,
            JUSTIFYRIGHT: 2,
            JUSTIFYALL: 0,
        };
        const justification = options.justification || 'LEFT';
        label.horizontalAlign = justificationMap[justification] ?? 0;
        label.verticalAlign = 1;

        if (options.fauxBold) label.isBold = true;
        if (options.fauxItalic) label.isItalic = true;

        if (options.textBoxBounds && options.textBoxBounds.width > 0) {
            transform.setContentSize(options.textBoxBounds.width, options.textBoxBounds.height || data.size.height);
        } else {
            transform.setContentSize(data.size.width, data.size.height);
        }

        const textColor = options.textColor || { red: 0, green: 0, blue: 0 };
        label.color = cc.color(textColor.red || 0, textColor.green || 0, textColor.blue || 0, 255);

        const opacity = typeof options.opacity === 'number' ? options.opacity : 100;
        ensureOpacity(node, opacity);

        if (options.outline && options.outline.width > 0) {
            label.enableOutline = true;
            label.outlineWidth = options.outline.width;
            const outlineColor = options.outline.color || { red: 0, green: 0, blue: 0 };
            label.outlineColor = cc.color(outlineColor.red || 0, outlineColor.green || 0, outlineColor.blue || 0, 255);
        }

        if (options.shadow) {
            label.enableShadow = true;
            const shadowColor = options.shadow.color || { red: 0, green: 0, blue: 0 };
            const shadowAlpha = typeof options.shadow.opacity === 'number'
                ? Math.round(options.shadow.opacity * 2.55)
                : 255;
            label.shadowColor = cc.color(
                shadowColor.red || 0,
                shadowColor.green || 0,
                shadowColor.blue || 0,
                shadowAlpha,
            );
            label.shadowOffset = cc.v2(options.shadow.offsetX || 2, options.shadow.offsetY || -2);
            label.shadowBlur = options.shadow.blur || 2;
        }
    }

    if (data.children && data.children.length > 0) {
        const layoutRect = getLayoutRect(data);
        buildChildren(node, data.children, layoutRect.offset, layoutRect.size, spriteMap);
    }

    return node;
}

function buildChildren(
    parent: any,
    children: any[],
    parentOffset: { left: number; top: number },
    parentSize: Size,
    spriteMap: Record<string, string>,
) {
    // Photoshop JSON stores the visually upper layers before lower layers. Cocos renders
    // later siblings above earlier siblings, so add every children array from bottom to top.
    for (let i = children.length - 1; i >= 0; i--) {
        createNode(parent, children[i], parentOffset, parentSize, spriteMap);
    }
}

function countNodes(children: any[]): number {
    let total = 0;
    for (const child of children || []) {
        total++;
        if (child.children) {
            total += countNodes(child.children);
        }
    }
    return total;
}

function findNodeByUuid(root: any, uuid: string): any | null {
    if (!root) return null;
    if (root.uuid === uuid) return root;

    for (const child of root.children || []) {
        const found = findNodeByUuid(child, uuid);
        if (found) return found;
    }

    return null;
}

function findSceneNode(uuid: string): any | null {
    const scene = cc.director.getScene();
    if (!scene) return null;
    return findNodeByUuid(scene, uuid);
}

function visitNodeTree(node: any, visitor: (node: any) => void) {
    if (!node) return;
    visitor(node);
    for (const child of node.children || []) {
        visitNodeTree(child, visitor);
    }
}

function getSpriteFrameUuid(spriteFrame: any): string {
    return spriteFrame?._uuid || spriteFrame?.uuid || '';
}

function loadSpriteFrame(uuid: string): Promise<any> {
    const cached = cc.assetManager.assets.get(uuid);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
        cc.assetManager.loadAny(uuid, (err: Error | null, asset: any) => {
            if (err || !asset) reject(err || new Error(`SpriteFrame not found: ${uuid}`));
            else resolve(asset);
        });
    });
}

async function replaceSpriteFrames(root: any, replacementsJson: string): Promise<{ changed: number; remainingSourceUuids: string[] }> {
    if (!root) return { changed: 0, remainingSourceUuids: [] };

    const replacements = JSON.parse(replacementsJson || '{}');
    const sourceUuids = new Set(Object.keys(replacements).filter(Boolean));
    const targetUuids = Array.from(new Set(Object.values(replacements).filter(Boolean))) as string[];
    const loaded: Record<string, any> = {};
    for (const uuid of targetUuids) {
        loaded[uuid] = await loadSpriteFrame(uuid);
    }

    let changed = 0;
    visitNodeTree(root, (node) => {
        const sprite = node.getComponent && node.getComponent('cc.Sprite');
        const currentUuid = getSpriteFrameUuid(sprite?.spriteFrame);
        const nextUuid = currentUuid ? replacements[currentUuid] : '';
        if (sprite && nextUuid && loaded[nextUuid]) {
            sprite.spriteFrame = loaded[nextUuid];
            changed++;
        }
    });

    const remaining = new Set<string>();
    visitNodeTree(root, (node) => {
        const sprite = node.getComponent && node.getComponent('cc.Sprite');
        const currentUuid = getSpriteFrameUuid(sprite?.spriteFrame);
        if (currentUuid && sourceUuids.has(currentUuid)) {
            remaining.add(currentUuid);
        }
    });

    return { changed, remainingSourceUuids: Array.from(remaining) };
}

export const methods = {
    buildNodes(uiNodeName: string, jsonStr: string, spriteMapStr: string) {
        const data = JSON.parse(jsonStr);
        const spriteMap = JSON.parse(spriteMapStr || '{}');

        const canvasNode = findCanvasNode();
        if (!canvasNode) {
            throw new Error('Current scene has no Canvas node');
        }

        const uiRoot = new cc.Node(uiNodeName);
        canvasNode.addChild(uiRoot);

        const designSize = resolveDesignSize(canvasNode);
        const uiTransform = uiRoot.addComponent('cc.UITransform');
        uiTransform.setContentSize(designSize.width, designSize.height);
        setupFullScreenWidget(uiRoot);

        try {
            buildChildren(uiRoot, data.children, { left: 0, top: 0 }, data.size, spriteMap);
        } catch (error) {
            uiRoot.destroy();
            throw error;
        }

        return {
            success: true,
            count: countNodes(data.children || []),
            rootUuid: uiRoot.uuid,
            rootName: uiRoot.name,
        };
    },

    collectSpriteFrameRefs(rootUuid: string) {
        const root = findSceneNode(rootUuid);
        if (!root) return [];

        const refs: string[] = [];
        visitNodeTree(root, (node) => {
            const sprite = node.getComponent && node.getComponent('cc.Sprite');
            const uuid = getSpriteFrameUuid(sprite?.spriteFrame);
            if (uuid) refs.push(uuid);
        });

        return refs;
    },

    async replaceSpriteFramesInNodeTree(rootUuid: string, replacementsJson: string) {
        const root = findSceneNode(rootUuid);
        if (!root) return 0;

        const result = await replaceSpriteFrames(root, replacementsJson);
        return result.changed;
    },

    async replaceSpriteFramesInOpenScene(replacementsJson: string) {
        const scene = cc.director.getScene();
        return await replaceSpriteFrames(scene, replacementsJson);
    },
};

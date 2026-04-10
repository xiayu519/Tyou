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

function calcPosition(childData: any, parentOffset: { left: number; top: number }, parentSize: { width: number; height: number }) {
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

function ensureOpacity(node: any, opacityPercent: number) {
    if (opacityPercent >= 100) return;
    const opacity = node.getComponent('cc.UIOpacity') || node.addComponent('cc.UIOpacity');
    opacity.opacity = Math.round(opacityPercent * 2.55);
}

function createNode(
    parent: any,
    data: any,
    parentOffset: { left: number; top: number },
    parentSize: { width: number; height: number },
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
        sprite.sizeMode = 2;

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
        buildChildren(node, data.children, data.offset, data.size, spriteMap);
    }

    return node;
}

function buildChildren(
    parent: any,
    children: any[],
    parentOffset: { left: number; top: number },
    parentSize: { width: number; height: number },
    spriteMap: Record<string, string>,
) {
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

        const uiTransform = uiRoot.addComponent('cc.UITransform');
        uiTransform.setContentSize(data.size.width, data.size.height);

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
};

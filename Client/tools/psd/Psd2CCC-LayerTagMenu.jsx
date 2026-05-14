/*
 * Psd2CCC Layer Tag Menu
 * Photoshop helper for project PSD tags.
 * Supports .img composite export tags and _9s_T_B_L_R nine-slice tags.
 */

#target photoshop

(function () {
    var IMG_SUFFIX = ".img";
    var SCALE9_PREFIX = "_9s";
    var IMG_SUFFIX_RE = /\.img$/i;
    var SCALE9_SUFFIX_RE = /_(9s|scale9)(_(\d+)_(\d+)_(\d+)_(\d+))?$/i;
    var PREVIEW_MAX_WIDTH = 420;
    var PREVIEW_MAX_HEIGHT = 260;

    if (!app.documents.length) {
        alert("请先打开一个 PSD 文档");
        return;
    }

    if (!app.activeDocument.activeLayer) {
        alert("请先选择一个图层");
        return;
    }

    var savedSelection = saveSelection();
    var layerInfos = getSelectedLayerInfosFast();
    if (!layerInfos.length) {
        alert("请先选择一个或多个图层");
        return;
    }

    var initialInsets = getInitialScale9Insets(layerInfos);
    var scale9Preview = null;
    var previewCleaned = false;

    var w = new Window("dialog", "Psd2CCC - PSD 标签");
    w.alignChildren = "fill";
    w.spacing = 12;
    w.margins = 16;

    var infoPanel = w.add("panel", undefined, "选中的图层");
    infoPanel.alignChildren = "left";
    infoPanel.margins = 10;

    if (layerInfos.length === 1) {
        var nameText = infoPanel.add("statictext", undefined, layerInfos[0].name);
        nameText.preferredSize.width = 420;
    } else {
        infoPanel.add("statictext", undefined, "已选择 " + layerInfos.length + " 个图层");
        var displayCount = Math.min(layerInfos.length, 6);
        for (var i = 0; i < displayCount; i++) {
            var item = infoPanel.add("statictext", undefined, "  - " + layerInfos[i].name);
            item.preferredSize.width = 420;
        }
        if (layerInfos.length > displayCount) {
            infoPanel.add("statictext", undefined, "  ... 还有 " + (layerInfos.length - displayCount) + " 个");
        }
    }

    var imgPanel = w.add("panel", undefined, "合图标签");
    imgPanel.alignChildren = "fill";
    imgPanel.margins = 10;
    var imgTip = imgPanel.add("statictext", undefined, "追加 .img，导出时按 Photoshop 视觉结果合成一张 PNG");
    imgTip.preferredSize.width = 420;
    var imgButton = imgPanel.add("button", undefined, "添加 .img");
    imgButton.preferredSize.height = 30;
    imgButton.onClick = function () {
        var result = batchRename(layerInfos, function (name) {
            return makeImgName(name);
        });
        restoreSelection(savedSelection);
        cleanupDialogPreview();
        w.close();
        showResult(".img", result);
    };

    var scale9Panel = w.add("panel", undefined, "九宫格标签");
    scale9Panel.alignChildren = "fill";
    scale9Panel.margins = 10;
    var scale9Tip = scale9Panel.add("statictext", undefined, "填写上/下/左/右像素，单选图层时可实时预览，确认后追加 _9s_上_下_左_右");
    scale9Tip.preferredSize.width = 440;

    var previewData = createLayerPreviewData(layerInfos, savedSelection);
    var previewArea = addScale9PreviewArea(scale9Panel, previewData);

    var inputRow = scale9Panel.add("group");
    inputRow.orientation = "row";
    inputRow.alignChildren = "center";
    inputRow.spacing = 6;

    var topInput = addNumberInput(inputRow, "上", String(initialInsets.top));
    var bottomInput = addNumberInput(inputRow, "下", String(initialInsets.bottom));
    var leftInput = addNumberInput(inputRow, "左", String(initialInsets.left));
    var rightInput = addNumberInput(inputRow, "右", String(initialInsets.right));
    scale9Preview = bindScale9Preview(previewArea, previewData, topInput, bottomInput, leftInput, rightInput);

    var scale9Button = scale9Panel.add("button", undefined, "确定九宫格");
    scale9Button.preferredSize.height = 30;
    scale9Button.onClick = function () {
        var insets = readInsets(topInput, bottomInput, leftInput, rightInput);
        if (!insets) {
            alert("九宫格参数必须是非负整数");
            restoreSelection(savedSelection);
            return;
        }

        if (scale9Preview) {
            insets = scale9Preview.normalizeInsets(insets);
        }

        var suffix = SCALE9_PREFIX + "_" + insets.top + "_" + insets.bottom + "_" + insets.left + "_" + insets.right;
        var result = batchRename(layerInfos, function (name) {
            return makeScale9Name(name, suffix);
        });
        restoreSelection(savedSelection);
        cleanupDialogPreview();
        w.close();
        showResult(suffix, result);
    };

    var bottomGroup = w.add("group");
    bottomGroup.alignment = "center";
    var cancelBtn = bottomGroup.add("button", undefined, "取消", { name: "cancel" });
    cancelBtn.preferredSize = [100, 28];
    cancelBtn.onClick = function () {
        cleanupDialogPreview();
        w.close();
    };

    w.onClose = function () {
        cleanupDialogPreview();
    };

    w.center();
    w.show();
    cleanupDialogPreview();

    function addNumberInput(parent, label, defaultValue) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = "center";
        group.add("statictext", undefined, label);
        var input = group.add("edittext", undefined, defaultValue);
        input.characters = 4;
        return input;
    }

    function readInsets(topInput, bottomInput, leftInput, rightInput) {
        var top = parseNonNegativeInteger(topInput.text);
        var bottom = parseNonNegativeInteger(bottomInput.text);
        var left = parseNonNegativeInteger(leftInput.text);
        var right = parseNonNegativeInteger(rightInput.text);
        if (top === null || bottom === null || left === null || right === null) return null;
        return { top: top, bottom: bottom, left: left, right: right };
    }

    function parseNonNegativeInteger(value) {
        var text = trim(String(value));
        if (!/^\d+$/.test(text)) return null;
        return parseInt(text, 10);
    }

    function trim(value) {
        return value.replace(/^\s+|\s+$/g, "");
    }

    function getInitialScale9Insets(infos) {
        if (infos.length === 1) {
            var parsed = parseScale9InsetsFromName(infos[0].name);
            if (parsed) return parsed;
        }
        return { top: 10, bottom: 10, left: 10, right: 10 };
    }

    function parseScale9InsetsFromName(name) {
        var match = String(name).match(SCALE9_SUFFIX_RE);
        if (!match || match.length < 7 || match[3] === undefined) return null;
        return {
            top: parseInt(match[3], 10),
            bottom: parseInt(match[4], 10),
            left: parseInt(match[5], 10),
            right: parseInt(match[6], 10)
        };
    }

    function makeImgName(name) {
        var baseName = stripProjectTags(name);
        return baseName + IMG_SUFFIX;
    }

    function makeScale9Name(name, suffix) {
        var baseName = stripProjectTags(name);
        return baseName + suffix;
    }

    function stripProjectTags(name) {
        var next = name;
        var changed = true;
        while (changed) {
            changed = false;
            if (IMG_SUFFIX_RE.test(next)) {
                next = next.replace(IMG_SUFFIX_RE, "");
                changed = true;
            }
            if (SCALE9_SUFFIX_RE.test(next)) {
                next = next.replace(SCALE9_SUFFIX_RE, "");
                changed = true;
            }
        }
        return next;
    }

    function addScale9PreviewArea(parent, previewData) {
        if (!previewData || !previewData.image) {
            var message = previewData && previewData.message ? previewData.message : "单选可渲染图层时显示预览；当前可手动填写九宫格参数。";
            var fallback = parent.add("statictext", undefined, message);
            fallback.preferredSize.width = 440;
            return null;
        }

        try {
            var panel = parent.add("panel", undefined, "图片预览");
            panel.alignChildren = "center";
            panel.margins = 8;
            var canvas = panel.add("panel", undefined, "");
            canvas.margins = 0;
            canvas.preferredSize = [previewData.viewWidth, previewData.viewHeight];
            canvas.minimumSize = [previewData.viewWidth, previewData.viewHeight];
            canvas.maximumSize = [previewData.viewWidth, previewData.viewHeight];
            var tip = panel.add("statictext", undefined, "修改下面数值可实时预览九宫格切线");
            tip.preferredSize.width = Math.max(260, previewData.viewWidth);
            return { panel: panel, canvas: canvas };
        } catch (e) {
            var text = parent.add("statictext", undefined, "当前 Photoshop 不支持可绘制预览控件，可手动填写九宫格参数。");
            text.preferredSize.width = 440;
        }
        return null;
    }

    function bindScale9Preview(area, previewData, topInput, bottomInput, leftInput, rightInput) {
        if (!area || !area.canvas || !previewData || !previewData.image) return null;

        var state = {
            image: previewData.image,
            imageFile: previewData.file,
            sourceWidth: previewData.sourceWidth,
            sourceHeight: previewData.sourceHeight,
            viewWidth: previewData.viewWidth,
            viewHeight: previewData.viewHeight,
            scale: previewData.scale,
            insets: { top: 0, bottom: 0, left: 0, right: 0 },
            lastDrawKey: ""
        };

        setStateInsets(state, readInsets(topInput, bottomInput, leftInput, rightInput) || getInitialScale9Insets(layerInfos), null);
        writeInsetsToInputs(state.insets, topInput, bottomInput, leftInput, rightInput);

        area.canvas.onDraw = function () {
            drawScale9Preview(this, state);
        };

        attachScale9InputSync(topInput, area.canvas, state, topInput, bottomInput, leftInput, rightInput);
        attachScale9InputSync(bottomInput, area.canvas, state, topInput, bottomInput, leftInput, rightInput);
        attachScale9InputSync(leftInput, area.canvas, state, topInput, bottomInput, leftInput, rightInput);
        attachScale9InputSync(rightInput, area.canvas, state, topInput, bottomInput, leftInput, rightInput);
        requestPreviewRedraw(area.canvas, state, true);

        return {
            normalizeInsets: function (insets) {
                setStateInsets(state, insets, null);
                writeInsetsToInputs(state.insets, topInput, bottomInput, leftInput, rightInput);
                requestPreviewRedraw(area.canvas, state, true);
                return cloneInsets(state.insets);
            },
            cleanup: function () {
                var file = state.imageFile;
                state.image = null;
                state.imageFile = null;
                try { previewData.image = null; } catch (clearImageError) {}
                try { previewData.file = null; } catch (clearFileError) {}
                removePreviewFile(file);
                runExtendScriptGc();
                removePreviewFile(file);
            }
        };
    }

    function attachScale9InputSync(input, canvas, state, topInput, bottomInput, leftInput, rightInput) {
        var syncLive = function () {
            syncScale9PreviewFromInputs(canvas, state, topInput, bottomInput, leftInput, rightInput, false);
        };
        var syncFinal = function () {
            syncScale9PreviewFromInputs(canvas, state, topInput, bottomInput, leftInput, rightInput, true);
        };
        input.onChanging = syncLive;
        input.onChange = syncFinal;

        try {
            input.addEventListener("keyup", syncLive);
            input.addEventListener("change", syncFinal);
        } catch (e) {}
    }

    function syncScale9PreviewFromInputs(canvas, state, topInput, bottomInput, leftInput, rightInput, writeBack) {
        var insets = readInsets(topInput, bottomInput, leftInput, rightInput);
        if (!insets) return;
        setStateInsets(state, insets, null);
        if (writeBack) {
            writeInsetsToInputs(state.insets, topInput, bottomInput, leftInput, rightInput);
        }
        requestPreviewRedraw(canvas, state, true);
    }

    function createLayerPreviewData(infos, selection) {
        if (infos.length !== 1) {
            return { message: "多选图层时不显示图片预览，可继续手动填写九宫格参数。" };
        }

        var originalDoc = app.activeDocument;
        var oldUnits = null;
        var previewDoc = null;
        var previewFile = null;

        try {
            oldUnits = app.preferences.rulerUnits;
            app.preferences.rulerUnits = Units.PIXELS;
            selectLayerById(infos[0].id);
            var sourceLayer = originalDoc.activeLayer;
            var bounds = getLayerPixelBounds(sourceLayer);
            if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
                return { message: "无法读取图层像素边界，可手动填写九宫格参数。" };
            }

            previewDoc = app.documents.add(bounds.width, bounds.height, originalDoc.resolution || 72, "__psd2ccc_9s_preview__", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
            app.activeDocument = originalDoc;
            selectLayerById(infos[0].id);
            sourceLayer = originalDoc.activeLayer;
            sourceLayer.duplicate(previewDoc, ElementPlacement.PLACEATBEGINNING);

            app.activeDocument = previewDoc;
            try {
                previewDoc.activeLayer.translate(-bounds.left, -bounds.top);
            } catch (translateError) {}

            previewFile = new File(Folder.temp.fsName + "/psd2ccc_9s_preview_" + (new Date()).getTime() + ".png");
            var pngOptions = new PNGSaveOptions();
            previewDoc.saveAs(previewFile, pngOptions, true, Extension.LOWERCASE);
            var image = ScriptUI.newImage(previewFile);
            var previewSize = calculatePreviewSize(bounds.width, bounds.height);
            return {
                image: image,
                file: previewFile,
                sourceWidth: bounds.width,
                sourceHeight: bounds.height,
                viewWidth: previewSize.width,
                viewHeight: previewSize.height,
                scale: previewSize.scale
            };
        } catch (e) {
            try {
                if (previewFile && previewFile.exists) previewFile.remove();
            } catch (removeError) {}
            return { message: "无法生成预览图，可手动填写九宫格参数。" };
        } finally {
            try {
                if (previewDoc) previewDoc.close(SaveOptions.DONOTSAVECHANGES);
            } catch (closeError) {}
            try {
                app.activeDocument = originalDoc;
            } catch (activeError) {}
            try {
                restoreSelection(selection);
            } catch (restoreError) {}
            try {
                if (oldUnits !== null) app.preferences.rulerUnits = oldUnits;
            } catch (unitError) {}
        }
    }

    function calculatePreviewSize(width, height) {
        var scale = Math.min(PREVIEW_MAX_WIDTH / width, PREVIEW_MAX_HEIGHT / height);
        if (scale > 1.5) scale = 1.5;
        if (scale <= 0) scale = 1;
        return {
            width: Math.max(40, Math.round(width * scale)),
            height: Math.max(40, Math.round(height * scale)),
            scale: scale
        };
    }

    function getLayerPixelBounds(layer) {
        try {
            var bounds = layer.bounds;
            var left = unitToPixel(bounds[0]);
            var top = unitToPixel(bounds[1]);
            var right = unitToPixel(bounds[2]);
            var bottom = unitToPixel(bounds[3]);
            return {
                left: left,
                top: top,
                right: right,
                bottom: bottom,
                width: Math.max(0, right - left),
                height: Math.max(0, bottom - top)
            };
        } catch (e) {}
        return null;
    }

    function unitToPixel(value) {
        try {
            return Math.round(value.as("px"));
        } catch (e) {}
        return Math.round(parseFloat(value));
    }

    function drawScale9Preview(control, state) {
        var g = control.graphics;
        try {
            g.drawImage(state.image, 0, 0, state.viewWidth, state.viewHeight);
        } catch (drawImageError) {}

        try {
            var greenBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0, 1, 0, 0.95]);
            var xLeft = state.insets.left * state.scale;
            var xRight = (state.sourceWidth - state.insets.right) * state.scale;
            var yTop = state.insets.top * state.scale;
            var yBottom = (state.sourceHeight - state.insets.bottom) * state.scale;

            fillRect(g, xLeft - 1, 0, 2, state.viewHeight, greenBrush);
            fillRect(g, xRight - 1, 0, 2, state.viewHeight, greenBrush);
            fillRect(g, 0, yTop - 1, state.viewWidth, 2, greenBrush);
            fillRect(g, 0, yBottom - 1, state.viewWidth, 2, greenBrush);
        } catch (drawGuideError) {}
    }

    function fillRect(graphics, x, y, width, height, brush) {
        graphics.newPath();
        graphics.rectPath(x, y, width, height);
        graphics.fillPath(brush);
    }

    function setStateInsets(state, insets, changedGuide) {
        var next = {
            top: clampInt(insets.top, 0, state.sourceHeight),
            bottom: clampInt(insets.bottom, 0, state.sourceHeight),
            left: clampInt(insets.left, 0, state.sourceWidth),
            right: clampInt(insets.right, 0, state.sourceWidth)
        };

        if (changedGuide === "left") {
            next.left = clampInt(next.left, 0, state.sourceWidth - next.right);
        } else if (changedGuide === "right") {
            next.right = clampInt(next.right, 0, state.sourceWidth - next.left);
        } else if (changedGuide === "top") {
            next.top = clampInt(next.top, 0, state.sourceHeight - next.bottom);
        } else if (changedGuide === "bottom") {
            next.bottom = clampInt(next.bottom, 0, state.sourceHeight - next.top);
        } else {
            next.right = clampInt(next.right, 0, state.sourceWidth - next.left);
            next.bottom = clampInt(next.bottom, 0, state.sourceHeight - next.top);
        }

        state.insets = next;
    }

    function writeInsetsToInputs(insets, topInput, bottomInput, leftInput, rightInput) {
        topInput.text = String(insets.top);
        bottomInput.text = String(insets.bottom);
        leftInput.text = String(insets.left);
        rightInput.text = String(insets.right);
    }

    function cloneInsets(insets) {
        return { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right };
    }

    function getInsetKey(insets) {
        return [insets.top, insets.bottom, insets.left, insets.right].join("_");
    }

    function clampInt(value, min, max) {
        var next = Math.round(Number(value));
        if (isNaN(next)) next = min;
        if (max < min) max = min;
        if (next < min) return min;
        if (next > max) return max;
        return next;
    }

    function requestPreviewRedraw(control, state, fullRefresh) {
        var key = getInsetKey(state.insets);
        if (state.lastDrawKey === key) return;
        state.lastDrawKey = key;
        redrawControl(control, fullRefresh);
    }

    function redrawControl(control, fullRefresh) {
        if (fullRefresh) {
            try {
                control.visible = false;
                control.visible = true;
            } catch (e) {}
            try {
                if (control.parent && control.parent.layout) control.parent.layout.layout(true);
            } catch (e2) {}
        }
        try {
            if (control.onDraw) control.onDraw.call(control);
        } catch (e3) {}
        try {
            if (control.update) control.update();
        } catch (e4) {}
        if (fullRefresh) {
            try {
                if (control.window && control.window.layout) control.window.layout.layout(true);
                if (control.window) control.window.update();
            } catch (e5) {}
        } else {
            try {
                if (control.window) control.window.update();
            } catch (e6) {}
        }
    }

    function cleanupScale9Preview(preview) {
        if (!preview || !preview.cleanup) return;
        preview.cleanup();
    }

    function removePreviewFile(file) {
        if (!file) return;
        try {
            if (file.exists) file.remove();
        } catch (e) {}
    }

    function runExtendScriptGc() {
        try {
            if (typeof $ !== "undefined" && $.gc) $.gc();
        } catch (e) {}
    }

    function cleanupDialogPreview() {
        if (previewCleaned) return;
        previewCleaned = true;
        cleanupScale9Preview(scale9Preview);
        scale9Preview = null;
        previewData = null;
    }

    function batchRename(layerInfos, makeName) {
        var result = { total: layerInfos.length, changed: 0, unchanged: 0, failed: 0 };
        for (var i = 0; i < layerInfos.length; i++) {
            try {
                var info = layerInfos[i];
                var currentName = getLayerNameById(info.id) || info.name;
                var newName = makeName(currentName);
                if (currentName === newName) {
                    result.unchanged++;
                    continue;
                }
                if (setLayerNameById(info.id, newName)) {
                    result.changed++;
                } else {
                    result.failed++;
                }
            } catch (e) {
                result.failed++;
            }
        }
        return result;
    }

    function showResult(tag, result) {
        var message = "标签处理完成: " + tag + "\n" +
            "已修改: " + result.changed + "\n" +
            "未变化: " + result.unchanged;
        if (result.failed > 0) message += "\n失败: " + result.failed;
        alert(message);
    }

    function saveSelection() {
        var selection = { layerIDs: [] };
        try {
            var ref = new ActionReference();
            ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("targetLayersIDs"));
            ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            var desc = executeActionGet(ref);
            if (desc.hasKey(stringIDToTypeID("targetLayersIDs"))) {
                var list = desc.getList(stringIDToTypeID("targetLayersIDs"));
                for (var i = 0; i < list.count; i++) {
                    selection.layerIDs.push(list.getReference(i).getIdentifier());
                }
            }
        } catch (e) {}

        if (!selection.layerIDs.length) {
            try {
                var refSingle = new ActionReference();
                refSingle.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
                var descSingle = executeActionGet(refSingle);
                selection.layerIDs.push(descSingle.getInteger(stringIDToTypeID("layerID")));
            } catch (e2) {}
        }
        return selection;
    }

    function restoreSelection(selection) {
        if (!selection || !selection.layerIDs || !selection.layerIDs.length) return;
        try {
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putIdentifier(charIDToTypeID("Lyr "), selection.layerIDs[0]);
            desc.putReference(charIDToTypeID("null"), ref);
            desc.putBoolean(charIDToTypeID("MkVs"), false);
            executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);

            for (var i = 1; i < selection.layerIDs.length; i++) {
                var descAdd = new ActionDescriptor();
                var refAdd = new ActionReference();
                refAdd.putIdentifier(charIDToTypeID("Lyr "), selection.layerIDs[i]);
                descAdd.putReference(charIDToTypeID("null"), refAdd);
                descAdd.putEnumerated(
                    stringIDToTypeID("selectionModifier"),
                    stringIDToTypeID("selectionModifierType"),
                    stringIDToTypeID("addToSelection")
                );
                descAdd.putBoolean(charIDToTypeID("MkVs"), false);
                executeAction(charIDToTypeID("slct"), descAdd, DialogModes.NO);
            }
        } catch (e) {}
    }

    function getSelectedLayerInfosFast() {
        var infos = [];
        try {
            var ref = new ActionReference();
            ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("targetLayersIDs"));
            ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            var desc = executeActionGet(ref);
            if (desc.hasKey(stringIDToTypeID("targetLayersIDs"))) {
                var list = desc.getList(stringIDToTypeID("targetLayersIDs"));
                for (var i = 0; i < list.count; i++) {
                    var layerID = list.getReference(i).getIdentifier();
                    infos.push({ id: layerID, name: getLayerNameById(layerID) || ("Layer " + layerID) });
                }
                return infos;
            }
        } catch (e) {}

        try {
            var refSingle = new ActionReference();
            refSingle.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            var descSingle = executeActionGet(refSingle);
            var id = descSingle.getInteger(stringIDToTypeID("layerID"));
            infos.push({ id: id, name: app.activeDocument.activeLayer.name });
        } catch (e2) {}
        return infos;
    }

    function getLayerNameById(layerId) {
        try {
            var ref = new ActionReference();
            ref.putIdentifier(charIDToTypeID("Lyr "), layerId);
            var desc = executeActionGet(ref);
            return desc.getString(charIDToTypeID("Nm  "));
        } catch (e) {}
        return null;
    }

    function setLayerNameById(layerId, newName) {
        if (trySetLayerNameByIdAM(layerId, newName)) return true;
        var selection = saveSelection();
        try {
            selectLayerById(layerId);
            var layer = app.activeDocument.activeLayer;
            if (!layer) return false;
            if (layer.name === newName) return true;

            var parentLocks = unlockParents(layer);
            var layerLocks = unlockLayer(layer);
            var wasBackground = false;
            try {
                wasBackground = layer.isBackgroundLayer;
                if (wasBackground) layer.isBackgroundLayer = false;
            } catch (e) {}

            try { layer.name = newName; } catch (e2) {}

            restoreLayerLocks(layer, layerLocks);
            if (wasBackground) {
                try { layer.isBackgroundLayer = true; } catch (e3) {}
            }
            restoreParentLocks(parentLocks);
            return layer.name === newName;
        } catch (e4) {
            return false;
        } finally {
            restoreSelection(selection);
        }
    }

    function trySetLayerNameByIdAM(layerId, newName) {
        var oldDialogs = null;
        try { oldDialogs = app.displayDialogs; app.displayDialogs = DialogModes.NO; } catch (e) {}
        try {
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putIdentifier(charIDToTypeID("Lyr "), layerId);
            desc.putReference(charIDToTypeID("null"), ref);

            var nameDesc = new ActionDescriptor();
            nameDesc.putString(charIDToTypeID("Nm  "), newName);
            desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), nameDesc);
            executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
            return true;
        } catch (e2) {
            return false;
        } finally {
            try {
                if (oldDialogs !== null && oldDialogs !== undefined) app.displayDialogs = oldDialogs;
            } catch (e3) {}
        }
    }

    function selectLayerById(layerId) {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putIdentifier(charIDToTypeID("Lyr "), layerId);
        desc.putReference(charIDToTypeID("null"), ref);
        desc.putBoolean(charIDToTypeID("MkVs"), false);
        executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
    }

    function unlockParents(layer) {
        var locks = [];
        try {
            var parent = layer.parent;
            while (parent && parent.typename !== "Document") {
                if (parent.typename === "LayerSet") {
                    var allLocked = null;
                    try { allLocked = parent.allLocked; } catch (e) {}
                    locks.push({ layer: parent, allLocked: allLocked });
                    try { if (allLocked) parent.allLocked = false; } catch (e2) {}
                }
                parent = parent.parent;
            }
        } catch (e3) {}
        return locks;
    }

    function unlockLayer(layer) {
        var locks = {};
        try { locks.allLocked = layer.allLocked; if (layer.allLocked) layer.allLocked = false; } catch (e) {}
        try { locks.positionLocked = layer.positionLocked; if (layer.positionLocked) layer.positionLocked = false; } catch (e2) {}
        try { locks.transparentPixelsLocked = layer.transparentPixelsLocked; if (layer.transparentPixelsLocked) layer.transparentPixelsLocked = false; } catch (e3) {}
        try { locks.pixelsLocked = layer.pixelsLocked; if (layer.pixelsLocked) layer.pixelsLocked = false; } catch (e4) {}
        return locks;
    }

    function restoreLayerLocks(layer, locks) {
        try { if (locks.allLocked !== undefined) layer.allLocked = locks.allLocked; } catch (e) {}
        try { if (locks.positionLocked !== undefined) layer.positionLocked = locks.positionLocked; } catch (e2) {}
        try { if (locks.transparentPixelsLocked !== undefined) layer.transparentPixelsLocked = locks.transparentPixelsLocked; } catch (e3) {}
        try { if (locks.pixelsLocked !== undefined) layer.pixelsLocked = locks.pixelsLocked; } catch (e4) {}
    }

    function restoreParentLocks(locks) {
        for (var i = locks.length - 1; i >= 0; i--) {
            try {
                if (locks[i].allLocked !== null && locks[i].allLocked !== undefined) {
                    locks[i].layer.allLocked = locks[i].allLocked;
                }
            } catch (e) {}
        }
    }
})();

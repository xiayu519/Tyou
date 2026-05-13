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

    var w = new Window("dialog", "Psd2CCC - PSD 标签");
    w.alignChildren = "fill";
    w.spacing = 12;
    w.margins = 16;

    var infoPanel = w.add("panel", undefined, "选中的图层");
    infoPanel.alignChildren = "left";
    infoPanel.margins = 10;

    if (layerInfos.length === 1) {
        var nameText = infoPanel.add("statictext", undefined, layerInfos[0].name);
        nameText.preferredSize.width = 320;
    } else {
        infoPanel.add("statictext", undefined, "已选择 " + layerInfos.length + " 个图层");
        var displayCount = Math.min(layerInfos.length, 6);
        for (var i = 0; i < displayCount; i++) {
            var item = infoPanel.add("statictext", undefined, "  - " + layerInfos[i].name);
            item.preferredSize.width = 320;
        }
        if (layerInfos.length > displayCount) {
            infoPanel.add("statictext", undefined, "  ... 还有 " + (layerInfos.length - displayCount) + " 个");
        }
    }

    var imgPanel = w.add("panel", undefined, "合图标签");
    imgPanel.alignChildren = "fill";
    imgPanel.margins = 10;
    var imgTip = imgPanel.add("statictext", undefined, "追加 .img，导出时按 Photoshop 视觉结果合成一张 PNG");
    imgTip.preferredSize.width = 360;
    var imgButton = imgPanel.add("button", undefined, "添加 .img");
    imgButton.preferredSize.height = 30;
    imgButton.onClick = function () {
        var result = batchRename(layerInfos, function (name) {
            return makeImgName(name);
        });
        restoreSelection(savedSelection);
        w.close();
        showResult(".img", result);
    };

    var scale9Panel = w.add("panel", undefined, "九宫格标签");
    scale9Panel.alignChildren = "fill";
    scale9Panel.margins = 10;
    var scale9Tip = scale9Panel.add("statictext", undefined, "填写上/下/左/右像素，确认后追加 _9s_上_下_左_右");
    scale9Tip.preferredSize.width = 360;

    var inputRow = scale9Panel.add("group");
    inputRow.orientation = "row";
    inputRow.alignChildren = "center";
    inputRow.spacing = 6;

    var topInput = addNumberInput(inputRow, "上", "10");
    var bottomInput = addNumberInput(inputRow, "下", "10");
    var leftInput = addNumberInput(inputRow, "左", "10");
    var rightInput = addNumberInput(inputRow, "右", "10");

    var scale9Button = scale9Panel.add("button", undefined, "确定九宫格");
    scale9Button.preferredSize.height = 30;
    scale9Button.onClick = function () {
        var insets = readInsets(topInput, bottomInput, leftInput, rightInput);
        if (!insets) {
            alert("九宫格参数必须是非负整数");
            restoreSelection(savedSelection);
            return;
        }

        var suffix = SCALE9_PREFIX + "_" + insets.top + "_" + insets.bottom + "_" + insets.left + "_" + insets.right;
        var result = batchRename(layerInfos, function (name) {
            return makeScale9Name(name, suffix);
        });
        restoreSelection(savedSelection);
        w.close();
        showResult(suffix, result);
    };

    var bottomGroup = w.add("group");
    bottomGroup.alignment = "center";
    var cancelBtn = bottomGroup.add("button", undefined, "取消", { name: "cancel" });
    cancelBtn.preferredSize = [100, 28];

    w.center();
    w.show();

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
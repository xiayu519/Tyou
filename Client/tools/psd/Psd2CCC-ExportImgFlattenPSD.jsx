/*
 * Psd2CCC Export Img Flatten PSD
 * Photoshop helper: duplicate the current PSD, flatten only groups whose names
 * end with ".img" into single image layers, then save the duplicate as a PSD.
 *
 * This script does not export PNG/JSON and does not modify the original PSD.
 */

#target photoshop

(function () {
    var EXPORT_SUFFIX = "_ImgFlatten";
    var IMG_GROUP_RE = /\.img$/i;

    if (app.documents.length === 0) {
        alert("请先打开一个 PSD 文件！");
        return;
    }

    var originalDoc = app.activeDocument;
    var duplicateDoc = null;
    var savedDialogs = app.displayDialogs;

    var stats = {
        flattened: 0,
        failed: 0,
        errors: []
    };

    try {
        app.displayDialogs = DialogModes.NO;

        duplicateDoc = originalDoc.duplicate(originalDoc.name, false);
        app.activeDocument = duplicateDoc;

        flattenImgGroups(duplicateDoc.layers, stats);

        app.displayDialogs = savedDialogs;
        var savedFile = saveFlattenedPSD(duplicateDoc, originalDoc);

        duplicateDoc.close(SaveOptions.DONOTSAVECHANGES);
        duplicateDoc = null;
        app.activeDocument = originalDoc;

        if (savedFile) {
            alert(formatDoneMessage(savedFile, stats));
        } else {
            alert("已取消导出。\n\n已在临时副本中压平 .img 组合: " + stats.flattened + " 个\n原始 PSD 未被修改。");
        }
    } catch (error) {
        try {
            if (duplicateDoc) {
                duplicateDoc.close(SaveOptions.DONOTSAVECHANGES);
            }
        } catch (closeError) {}

        try { app.activeDocument = originalDoc; } catch (activeError) {}
        try { app.displayDialogs = savedDialogs; } catch (dialogError) {}

        alert("导出 .img 压平 PSD 失败:\n\n" + (error.message || String(error)) + "\n\n原始 PSD 未被修改。");
    }

    function flattenImgGroups(layers, stats) {
        for (var i = layers.length - 1; i >= 0; i--) {
            var layer = layers[i];
            try {
                if (layer.typename !== "LayerSet") {
                    continue;
                }

                if (isImgGroupName(layer.name)) {
                    if (flattenOneGroup(layer, stats)) {
                        stats.flattened++;
                    } else {
                        stats.failed++;
                    }
                    continue;
                }

                flattenImgGroups(layer.layers, stats);
            } catch (error) {
                stats.failed++;
                stats.errors.push("处理失败: " + safeLayerName(layer) + " - " + (error.message || String(error)));
            }
        }
    }

    function flattenOneGroup(group, stats) {
        var groupName = group.name;
        var groupVisible = true;
        try { groupVisible = group.visible; } catch (ignoredVisible) {}

        var ancestors = collectLayerSetAncestors(group);
        var ancestorStates = makeAncestorsVisibleAndUnlocked(ancestors);

        try {
            unlockLayerTree(group);
            try { group.visible = true; } catch (ignoredShowGroup) {}

            app.activeDocument.activeLayer = group;
            var merged = group.merge();
            if (merged) {
                try { merged.name = groupName; } catch (ignoredName) {}
                try { merged.visible = groupVisible; } catch (ignoredLayerVisible) {}
            }

            restoreAncestorStates(ancestorStates);
            return true;
        } catch (error) {
            restoreAncestorStates(ancestorStates);
            stats.errors.push("合并失败: " + groupName + " - " + (error.message || String(error)));
            return false;
        }
    }

    function isImgGroupName(name) {
        return IMG_GROUP_RE.test(String(name || ""));
    }

    function collectLayerSetAncestors(layer) {
        var ancestors = [];
        try {
            var parent = layer.parent;
            while (parent && parent.typename === "LayerSet") {
                ancestors.push(parent);
                parent = parent.parent;
            }
        } catch (ignored) {}
        return ancestors;
    }

    function makeAncestorsVisibleAndUnlocked(ancestors) {
        var states = [];
        for (var i = 0; i < ancestors.length; i++) {
            var layerSet = ancestors[i];
            var state = { layer: layerSet, visible: null, allLocked: null };
            try { state.allLocked = layerSet.allLocked; if (layerSet.allLocked) layerSet.allLocked = false; } catch (ignoredLock) {}
            try { state.visible = layerSet.visible; layerSet.visible = true; } catch (ignoredVisible) {}
            states.push(state);
        }
        return states;
    }

    function restoreAncestorStates(states) {
        for (var i = states.length - 1; i >= 0; i--) {
            var state = states[i];
            try {
                if (state.visible !== null && state.visible !== undefined) {
                    state.layer.visible = state.visible;
                }
            } catch (ignoredVisible) {}
            try {
                if (state.allLocked !== null && state.allLocked !== undefined) {
                    state.layer.allLocked = state.allLocked;
                }
            } catch (ignoredLock) {}
        }
    }

    function unlockLayerTree(layer) {
        try { if (layer.allLocked) layer.allLocked = false; } catch (ignoredAll) {}

        if (layer.typename === "ArtLayer") {
            try { if (layer.positionLocked) layer.positionLocked = false; } catch (ignoredPosition) {}
            try { if (layer.transparentPixelsLocked) layer.transparentPixelsLocked = false; } catch (ignoredTransparent) {}
            try { if (layer.pixelsLocked) layer.pixelsLocked = false; } catch (ignoredPixels) {}
            return;
        }

        if (layer.typename === "LayerSet") {
            for (var i = 0; i < layer.layers.length; i++) {
                unlockLayerTree(layer.layers[i]);
            }
        }
    }

    function saveFlattenedPSD(doc, originalDoc) {
        var originalName = originalDoc.name || doc.name || "Untitled.psd";
        var baseName = originalName.replace(/\.psd$/i, "");
        var defaultFolder = null;

        try {
            defaultFolder = originalDoc.path;
        } catch (ignoredPath) {
            defaultFolder = Folder.myDocuments;
        }

        var saveFile = new File(defaultFolder + "/" + baseName + EXPORT_SUFFIX + ".psd");
        saveFile = saveFile.saveDlg("选择 .img 压平 PSD 导出文件");
        if (saveFile === null) {
            return null;
        }

        if (!/\.psd$/i.test(saveFile.name)) {
            saveFile = new File(saveFile.fsName + ".psd");
        }

        var options = new PhotoshopSaveOptions();
        options.embedColorProfile = true;
        options.alphaChannels = true;
        options.layers = true;
        options.maximizeCompatibility = true;

        doc.saveAs(saveFile, options, true, Extension.LOWERCASE);
        return saveFile;
    }

    function formatDoneMessage(savedFile, stats) {
        var message = ".img 压平 PSD 导出完成！\n\n";
        message += "压平 .img 组合: " + stats.flattened + " 个\n";
        if (stats.failed > 0) {
            message += "失败: " + stats.failed + " 个\n";
        }
        if (stats.errors.length > 0) {
            message += "\n警告:\n";
            for (var i = 0; i < Math.min(stats.errors.length, 8); i++) {
                message += "- " + stats.errors[i] + "\n";
            }
            if (stats.errors.length > 8) {
                message += "... 还有 " + (stats.errors.length - 8) + " 条\n";
            }
        }
        message += "\n保存路径:\n" + savedFile.fsName + "\n\n";
        message += "原始 PSD 未被修改。";
        return message;
    }

    function safeLayerName(layer) {
        try { return layer.name; } catch (ignored) {}
        return "<unknown>";
    }
})();

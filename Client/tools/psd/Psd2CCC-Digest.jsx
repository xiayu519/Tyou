/*
 * Psd2CCC-Digest — PSD → Cocos Creator 资源导出
 * 兼容 Adobe Photoshop CC 2018+
 *
 * 用法：在 Photoshop 中打开 PSD（位于 assets/asset-art/psd/ 目录下），
 *       运行此脚本。
 *
 * 输出：
 *   PNG  → {Client}/assets/asset-art/atlas/{psdName}/
 *   JSON → {psdFolder}/tool/{psdName}/{psdName}-structure.json
 *   报告 → {psdFolder}/tool/{psdName}/{psdName}-report.json
 *
 * 导出规则：
 *   - 文字层 → text 节点（仅导出文本属性，不导出图片）
 *   - 普通可见 ArtLayer（非文字）→ 导出 PNG
 *   - LayerSet（组）→ 仅导出结构信息（type:"group"），默认不导出组 PNG
 *     如需导出组 PNG，设置下方 EXPORT_GROUP_AS_PNG = true
 *
 * JSON 定位协议：
 *   - offset      : 图层在 PSD 画布中的 left/top（原始坐标）
 *   - sourceBounds : 图层在 PSD 画布中的 left/top/right/bottom
 *   - trimmedSize  : 裁切透明后实际导出图的 width/height
 *
 * 不修改 PSD 任何内容（栅格化后自动恢复）。
 */

#target photoshop

// ===========================
// 配置项
// ===========================
var EXPORT_GROUP_AS_PNG  = false;  // 是否将组合并导出为一张 PNG
var EXPAND_SMART_OBJECTS = true;   // 是否默认展开智能对象内部结构
var SMART_OBJECT_MAX_DEPTH = 5;    // 智能对象递归展开最大深度
var TEMP_DOC_MARGIN      = 200;   // 导出临时文档裁切边距（像素），兼容图层效果溢出
var SCALE9_KEEP_CENTER   = 2;     // 九宫格裁切后中间保留的拉伸像素数

// ===========================
// JSON polyfill
// ===========================
if (typeof JSON === 'undefined') { JSON = {}; }
(function () {
    if (typeof JSON.stringify === 'function') return;
    var escMap = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
    function esc(s) {
        return '"' + s.replace(/["\\\b\f\n\r\t]/g, function (m) { return escMap[m]; })
                      .replace(/[\x00-\x1f]/g, function (m) {
                          return '\\u' + ('0000' + m.charCodeAt(0).toString(16)).slice(-4);
                      }) + '"';
    }
    function ser(v) {
        if (v === null || typeof v === 'undefined') return 'null';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (typeof v === 'number') return isFinite(v) ? String(v) : 'null';
        if (typeof v === 'string') return esc(v);
        if (v instanceof Array) {
            var a = [];
            for (var i = 0; i < v.length; i++) a.push(ser(v[i]));
            return '[' + a.join(',') + ']';
        }
        if (typeof v === 'object') {
            var p = [];
            for (var k in v) {
                if (v.hasOwnProperty(k)) p.push(esc(k) + ':' + ser(v[k]));
            }
            return '{' + p.join(',') + '}';
        }
        return 'null';
    }
    JSON.stringify = function (obj) { return ser(obj); };
})();

// ===========================
// 工具函数
// ===========================
function ensureFolder(p) { var f = new Folder(p); if (!f.exists) f.create(); return f; }

// 文件名清洗：只移除文件系统非法字符，保留美术命名中的中文、空格和普通符号。
function sanitizeFileName(s) {
    return String(s || "")
        .replace(/[\\\/:\*\?"<>\|\x00-\x1f]/g, "_")
        .replace(/[\. ]+$/g, "");
}

// DOM 检测文字层
function isText(ly) {
    try { var t = ly.textItem; return (t != null); }
    catch (e) { return false; }
}

// 检测图层是否处于剪贴蒙版链中（Fix #8）
function isClipped(ly) {
    try { return ly.grouped; } catch (e) { return false; }
}

// AM 获取 layerKind  0像素 1文字 2调整 3填充 4形状 5智能对象 7视频 8三D
function lkind(doc, ly) {
    try {
        var r = new ActionReference();
        r.putIdentifier(charIDToTypeID("Lyr "), ly.id);
        var d = executeActionGet(r);
        if (d.hasKey(stringIDToTypeID("layerKind")))
            return d.getInteger(stringIDToTypeID("layerKind"));
    } catch (e) {}
    try {
        doc.activeLayer = ly;
        var r2 = new ActionReference();
        r2.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var d2 = executeActionGet(r2);
        if (d2.hasKey(stringIDToTypeID("layerKind")))
            return d2.getInteger(stringIDToTypeID("layerKind"));
    } catch (e) {}
    return -1;
}

// 判断是否需要跳过（调整层/空bounds）
function shouldSkip(doc, ly) {
    var k = lkind(doc, ly);
    if (k == 2) return true; // 调整层
    var b = ly.bounds;
    if (parseFloat(b[2]) - parseFloat(b[0]) <= 0) return true;
    if (parseFloat(b[3]) - parseFloat(b[1]) <= 0) return true;
    return false;
}

// AM 栅格化
function rasterize(doc, ly) {
    try {
        var d = new ActionDescriptor();
        var r = new ActionReference();
        r.putIdentifier(charIDToTypeID("Lyr "), ly.id);
        d.putReference(charIDToTypeID("null"), r);
        executeAction(stringIDToTypeID("rasterizeLayer"), d, DialogModes.NO);
        return true;
    } catch (e) {}
    try {
        doc.activeLayer = ly;
        var d2 = new ActionDescriptor();
        var r2 = new ActionReference();
        r2.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        d2.putReference(charIDToTypeID("null"), r2);
        executeAction(stringIDToTypeID("rasterizeLayer"), d2, DialogModes.NO);
        return true;
    } catch (e) { return false; }
}

// ===========================
// 统计 & 警告（Fix #10, #14）
// ===========================
var stat = {
    raster: 0, png: 0, text: 0, skip: 0,
    groupCount: 0, emptyGroupCount: 0,
    clippingLayerCount: 0, unsupportedCount: 0,
    smartObjectExpanded: 0, smartObjectFallback: 0,
    scale9Count: 0,
    warnings: 0, errors: 0
};
var warnings = [];

function addWarning(layerPath, step, message) {
    warnings.push({ layer: layerPath, step: step, message: message });
    stat.warnings++;
}

function makeVisualFeatureStats() {
    return { clipped: 0, adjustment: 0 };
}

function countVisualFeatures(doc, layers, stats) {
    stats = stats || makeVisualFeatureStats();
    for (var i = 0; i < layers.length; i++) {
        try {
            var ly = layers[i];
            if (!ly.visible) continue;
            if (ly.typename === "LayerSet") {
                countVisualFeatures(doc, ly.layers, stats);
            } else if (ly.typename === "ArtLayer") {
                if (isClipped(ly)) stats.clipped++;
                if (lkind(doc, ly) == 2) stats.adjustment++;
            }
        } catch (e) {}
    }
    return stats;
}

function isImageGroupName(name) {
    return /\.img$/i.test(name || "");
}

// ===========================
// 栅格化智能对象/视频/3D/形状/填充
// ===========================
function doRasterize(doc, layers) {
    for (var i = 0; i < layers.length; i++) {
        try {
            var ly = layers[i];
            if (!ly.visible) continue;
            if (ly.typename === "LayerSet") {
                doRasterize(doc, ly.layers);
            } else if (ly.typename === "ArtLayer") {
                if (isText(ly)) continue;
                var k = lkind(doc, ly);
                if (EXPAND_SMART_OBJECTS && k == 5) continue;
                if (k == 3 || k == 4 || k == 5 || k == 7 || k == 8) {
                    if (rasterize(doc, ly)) stat.raster++;
                }
            }
        } catch (e) {
            addWarning("doRasterize[" + i + "]", "rasterize", e.message || String(e));
        }
    }
}

// ===========================
// 九宫格（Scale9）命名约定解析
// ===========================
// 支持的命名后缀：
//   _9s              → 标记为九宫格，使用像素扫描自动推算 insets
//   _scale9           → 同上
//   _9s_T_B_L_R       → 显式指定 insets（上_下_左_右，单位 px）
//   _scale9_T_B_L_R   → 同上
function parseScale9(layerName) {
    // 带参数：_9s_10_10_20_20 或 _scale9_10_10_20_20（上_下_左_右）
    var mParams = layerName.match(/[_](9s|scale9)[_](\d+)[_](\d+)[_](\d+)[_](\d+)$/);
    if (mParams) {
        return {
            enabled: true,
            top:    parseInt(mParams[2], 10),
            bottom: parseInt(mParams[3], 10),
            left:   parseInt(mParams[4], 10),
            right:  parseInt(mParams[5], 10),
            source: "name_params"
        };
    }
    // 无参数：_9s 或 _scale9
    var mFlag = layerName.match(/[_](9s|scale9)$/);
    if (mFlag) {
        return { enabled: true, top: 0, right: 0, bottom: 0, left: 0, source: "name_flag" };
    }
    return null;
}

// 从九宫格命名中去掉后缀，得到干净的图层名用于导出
function stripScale9Suffix(layerName) {
    return layerName
        .replace(/[_](9s|scale9)[_]\d+[_]\d+[_]\d+[_]\d+$/, "")
        .replace(/[_](9s|scale9)$/, "");
}

function stripToolSuffixes(layerName) {
    return stripScale9Suffix(String(layerName || "")).replace(/\.img$/i, "");
}

function buildNodeName(layerName, fallback) {
    return stripToolSuffixes(layerName) || fallback || "node";
}

// 像素扫描推算九宫格 insets：取图片短边的 1/3 作为默认值
function guessScale9Insets(w, h) {
    var s = Math.min(w, h);
    var d = Math.max(1, Math.round(s / 3));
    return { top: d, right: d, bottom: d, left: d };
}

// ===========================
// 九宫格中间裁切（保留四边 inset + 中间 KEEP 像素，删除多余区域）
// ===========================
function cropScale9(tmpDoc, s9) {
    var keep = SCALE9_KEEP_CENTER;
    var tw = Math.round(parseFloat(tmpDoc.width));
    var th = Math.round(parseFloat(tmpDoc.height));
    var newW = s9.left + keep + s9.right;
    var newH = s9.top + keep + s9.bottom;
    if (newW >= tw && newH >= th) return;

    try { tmpDoc.activeLayer.isBackgroundLayer = false; } catch (e) {}

    // 水平裁切
    if (newW < tw) {
        _s9CropAxis(tmpDoc, true, tw, th, s9.left, s9.right, keep);
        tw = Math.round(parseFloat(tmpDoc.width));
    }
    // 垂直裁切
    th = Math.round(parseFloat(tmpDoc.height));
    if (newH < th) {
        _s9CropAxis(tmpDoc, false, tw, th, s9.top, s9.bottom, keep);
    }
}

// 用文档副本 + crop 实现单轴裁切，避免 selection.clear() 的 Background 层白色填充问题
function _s9CropAxis(doc, isH, tw, th, startInset, endInset, keep) {
    var newSize = startInset + keep + endInset;
    try { doc.activeLayer.isBackgroundLayer = false; } catch (e) {}

    // 1. 复制文档，crop 出末端区域（右侧/底部 endInset 像素）
    var endDoc = doc.duplicate("__s9end__");
    if (isH) {
        endDoc.crop([UnitValue(tw - endInset, "px"), UnitValue(0, "px"),
                     UnitValue(tw, "px"), UnitValue(th, "px")]);
    } else {
        endDoc.crop([UnitValue(0, "px"), UnitValue(th - endInset, "px"),
                     UnitValue(tw, "px"), UnitValue(th, "px")]);
    }

    // 2. 主文档 crop 保留起始区域（startInset + keep 像素）
    app.activeDocument = doc;
    if (isH) {
        doc.crop([UnitValue(0, "px"), UnitValue(0, "px"),
                  UnitValue(startInset + keep, "px"), UnitValue(th, "px")]);
    } else {
        doc.crop([UnitValue(0, "px"), UnitValue(0, "px"),
                  UnitValue(tw, "px"), UnitValue(startInset + keep, "px")]);
    }

    // 3. 扩展画布到最终尺寸
    try { doc.activeLayer.isBackgroundLayer = false; } catch (e) {}
    if (isH) {
        doc.resizeCanvas(UnitValue(newSize, "px"), UnitValue(th, "px"), AnchorPosition.TOPLEFT);
    } else {
        doc.resizeCanvas(UnitValue(tw, "px"), UnitValue(newSize, "px"), AnchorPosition.TOPLEFT);
    }

    // 4. 从副本中全选+复制末端区域，粘贴到主文档
    app.activeDocument = endDoc;
    try { endDoc.activeLayer.isBackgroundLayer = false; } catch (e) {}
    endDoc.selection.selectAll();
    endDoc.selection.copy();
    endDoc.close(SaveOptions.DONOTSAVECHANGES);

    app.activeDocument = doc;
    doc.paste();
    var pasted = doc.activeLayer;
    var pb = pasted.bounds;
    if (isH) {
        pasted.translate(
            UnitValue((startInset + keep) - parseFloat(pb[0]), "px"),
            UnitValue(0 - parseFloat(pb[1]), "px"));
    } else {
        pasted.translate(
            UnitValue(0 - parseFloat(pb[0]), "px"),
            UnitValue((startInset + keep) - parseFloat(pb[1]), "px"));
    }

    // 5. 合并图层
    doc.mergeVisibleLayers();
}

// 构建导出文件名：只使用图片图层名，不拼父级路径、不转拼音、不追加 hash。
function buildExportName(layerPath) {
    var segments = String(layerPath || "").split("/");
    var layerName = stripToolSuffixes(segments[segments.length - 1]);
    return sanitizeFileName(layerName) || "image";
}

// ===========================
// 导出单个图层/组为 PNG（Fix #7: sourceBounds/trimmedSize, Fix #9: 裁切优化, Fix #10: 警告记录）
// ===========================
function savePNG(doc, layer, path, relPath, layerRelPath, s9) {
    try {
        var b = layer.bounds;
        var bL = parseFloat(b[0]), bT = parseFloat(b[1]);
        var bR = parseFloat(b[2]), bB = parseFloat(b[3]);
        var bW = bR - bL, bH = bB - bT;
        if (bW <= 0 || bH <= 0) return false;

        var docW = parseFloat(doc.width), docH = parseFloat(doc.height);

        var tmp = app.documents.add(doc.width, doc.height, doc.resolution,
            "__t__", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

        app.activeDocument = doc;
        doc.activeLayer = layer;
        layer.duplicate(tmp, ElementPlacement.INSIDE);

        app.activeDocument = tmp;

        // 合并前裁切到图层真实 bounds。
        // 旧逻辑额外保留 TEMP_DOC_MARGIN，遇到剪贴蒙版/智能对象栅格层时会把 bounds 外的大图也 trim 出来，
        // 导致 Cocos 节点按小 sourceBounds 定位、却按大 PNG 显示，出现偏移和遮挡。
        var cL = Math.max(0, bL);
        var cT = Math.max(0, bT);
        var cR = Math.min(docW, bR);
        var cB = Math.min(docH, bB);
        if (cR - cL < docW || cB - cT < docH) {
            try {
                tmp.crop([UnitValue(cL, "px"), UnitValue(cT, "px"),
                          UnitValue(cR, "px"), UnitValue(cB, "px")]);
            } catch (e) { /* 裁切失败时继续使用全尺寸 */ }
        }

        tmp.mergeVisibleLayers();
        var visibleBounds = null;
        try {
            var vb = tmp.activeLayer.bounds;
            var vL = parseFloat(vb[0]), vT = parseFloat(vb[1]);
            var vR = parseFloat(vb[2]), vB = parseFloat(vb[3]);
            if (vR > vL && vB > vT) {
                visibleBounds = {
                    left: Math.round(cL + vL),
                    top: Math.round(cT + vT),
                    right: Math.round(cL + vR),
                    bottom: Math.round(cT + vB)
                };
            }
        } catch (e) {}

        try { tmp.trim(TrimType.TRANSPARENT); } catch (e) {
            tmp.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = doc;
            addWarning(layerRelPath || relPath, "trim", "trim 失败: " + (e.message || String(e)));
            return false;
        }

        var tw = Math.round(parseFloat(tmp.width));
        var th = Math.round(parseFloat(tmp.height));

        // 九宫格裁切：保留四边 inset 像素 + 中间 SCALE9_KEEP_CENTER 像素
        var preScale9Size = null;
        if (s9 && s9.left + s9.right + SCALE9_KEEP_CENTER < tw
              && s9.top + s9.bottom + SCALE9_KEEP_CENTER < th) {
            preScale9Size = { width: tw, height: th };
            try {
                cropScale9(tmp, s9);
                tw = Math.round(parseFloat(tmp.width));
                th = Math.round(parseFloat(tmp.height));
            } catch (e) {
                addWarning(layerRelPath || relPath, "cropScale9",
                    "九宫格裁切失败: " + (e.message || String(e)));
                preScale9Size = null;
            }
        }

        var f = new File(path);
        var o = new PNGSaveOptions();
        o.interlaced = false;
        tmp.saveAs(f, o, true, Extension.LOWERCASE);
        tmp.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;

        return { ok: true, width: tw, height: th, relPath: relPath,
            sourceBounds: visibleBounds || { left: Math.round(bL), top: Math.round(bT), right: Math.round(bR), bottom: Math.round(bB) },
            trimmedSize: { width: tw, height: th },
            preScale9Size: preScale9Size };
    } catch (e) {
        addWarning(layerRelPath || relPath || "unknown", "savePNG", e.message || String(e));
        stat.errors++;
        try {
            for (var i = 0; i < app.documents.length; i++) {
                var dn = app.documents[i].name;
                if (dn === "__t__" || dn === "__s9end__") {
                    app.documents[i].close(SaveOptions.DONOTSAVECHANGES);
                }
            }
            app.activeDocument = doc;
        } catch (e2) {}
        return false;
    }
}

// ===========================
// bounds（Fix #7: 增加 right/bottom）和 textInfo（Fix #6: 完整文字属性）
// ===========================
function getBounds(ly) {
    var b = ly.bounds;
    var l = Math.round(parseFloat(b[0])), t = Math.round(parseFloat(b[1]));
    var r = Math.round(parseFloat(b[2])), bt = Math.round(parseFloat(b[3]));
    return { left: l, top: t, width: r - l, height: bt - t, right: r, bottom: bt };
}

function clampByte(v) {
    v = Math.round(Number(v));
    if (!isFinite(v)) v = 0;
    if (v < 0) return 0;
    if (v > 255) return 255;
    return v;
}

function rgbColor(r, g, b) {
    return { red: clampByte(r), green: clampByte(g), blue: clampByte(b) };
}

function descriptorHasKey(desc, id) {
    try { return desc && desc.hasKey(id); } catch (e) { return false; }
}

function descriptorNumber(desc, ids) {
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!descriptorHasKey(desc, id)) continue;
        try { return desc.getDouble(id); } catch (e1) {}
        try { return desc.getUnitDoubleValue(id); } catch (e2) {}
        try { return desc.getInteger(id); } catch (e3) {}
    }
    return null;
}

function descriptorBoolean(desc, ids, defaultValue) {
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!descriptorHasKey(desc, id)) continue;
        try { return desc.getBoolean(id); } catch (e) {}
    }
    return defaultValue;
}

function descriptorObject(desc, ids) {
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!descriptorHasKey(desc, id)) continue;
        try { return desc.getObjectValue(id); } catch (e) {}
    }
    return null;
}

function descriptorRGB(desc) {
    if (!desc) return null;
    var r = descriptorNumber(desc, [charIDToTypeID("Rd  "), stringIDToTypeID("red")]);
    var g = descriptorNumber(desc, [charIDToTypeID("Grn "), stringIDToTypeID("green")]);
    var b = descriptorNumber(desc, [charIDToTypeID("Bl  "), stringIDToTypeID("blue")]);
    if (r === null || g === null || b === null) return null;
    return rgbColor(r, g, b);
}

function firstTextStyle(ly) {
    try {
        var ref = new ActionReference();
        ref.putIdentifier(charIDToTypeID("Lyr "), ly.id);
        var desc = executeActionGet(ref);
        if (!descriptorHasKey(desc, stringIDToTypeID("textKey"))) return null;

        var textDesc = desc.getObjectValue(stringIDToTypeID("textKey"));
        if (descriptorHasKey(textDesc, stringIDToTypeID("textStyleRange"))) {
            var tsrList = textDesc.getList(stringIDToTypeID("textStyleRange"));
            if (tsrList.count > 0) {
                var tsr = tsrList.getObjectValue(0);
                if (descriptorHasKey(tsr, stringIDToTypeID("textStyle"))) {
                    return tsr.getObjectValue(stringIDToTypeID("textStyle"));
                }
            }
        }

        if (descriptorHasKey(textDesc, stringIDToTypeID("textStyle"))) {
            return textDesc.getObjectValue(stringIDToTypeID("textStyle"));
        }
    } catch (e) {}
    return null;
}

function textStyleColor(ly) {
    var style = firstTextStyle(ly);
    if (!style) return null;
    var colorDesc = descriptorObject(style, [stringIDToTypeID("color"), charIDToTypeID("Clr ")]);
    return descriptorRGB(colorDesc);
}

function blendRGB(base, overlay, opacityPercent) {
    if (!base) return overlay;
    var a = Math.max(0, Math.min(100, opacityPercent)) / 100;
    return rgbColor(
        base.red * (1 - a) + overlay.red * a,
        base.green * (1 - a) + overlay.green * a,
        base.blue * (1 - a) + overlay.blue * a
    );
}

function colorOverlayTextColor(fx, baseColor) {
    var solidFill = descriptorObject(fx, [stringIDToTypeID("solidFill"), charIDToTypeID("SoFi")]);
    if (!solidFill) return null;

    var enabled = descriptorBoolean(solidFill, [stringIDToTypeID("enabled")], true);
    if (!enabled) return null;

    var colorDesc = descriptorObject(solidFill, [stringIDToTypeID("color"), charIDToTypeID("Clr ")]);
    var overlayColor = descriptorRGB(colorDesc);
    if (!overlayColor) return null;

    var opacity = descriptorNumber(solidFill, [stringIDToTypeID("opacity"), charIDToTypeID("Opct")]);
    if (opacity === null) opacity = 100;
    if (opacity >= 99.5) return overlayColor;
    return blendRGB(baseColor, overlayColor, opacity);
}

function textInfo(ly) {
    var r = {
        textContents: "", textFont: "Arial", textSize: 14,
        textColor: { red: 0, green: 0, blue: 0 },
        justification: "LEFT",
        leading: 0,
        tracking: 0,
        antiAliasMethod: "SHARP",
        opacity: 100,
        blendMode: "NORMAL",
        fauxBold: false,
        fauxItalic: false,
        textBoxBounds: null,
        outline: null,
        shadow: null
    };
    try {
        var t = ly.textItem;
        r.textContents = t.contents;
        try { r.textFont = t.font; } catch (e) {}
        try { r.textSize = Math.round(parseFloat(t.size)); } catch (e) {}
        try {
            var c = t.color.rgb;
            r.textColor = rgbColor(c.red, c.green, c.blue);
        } catch (e) {}
        var styleColor = textStyleColor(ly);
        if (styleColor) r.textColor = styleColor;
        // 对齐方式
        try { r.justification = String(t.justification).replace("Justification.", ""); } catch (e) {}
        // 行高
        try { r.leading = Math.round(parseFloat(t.leading)); } catch (e) { r.leading = 0; }
        // 字间距
        try { r.tracking = Math.round(parseFloat(t.tracking)); } catch (e) {}
        // 抗锯齿
        try { r.antiAliasMethod = String(t.antiAliasMethod).replace("AntiAlias.", ""); } catch (e) {}
        // 透明度
        try { r.opacity = Math.round(ly.opacity); } catch (e) {}
        // 混合模式
        try { r.blendMode = String(ly.blendMode).replace("BlendMode.", ""); } catch (e) {}
        // faux 样式（通过 AM 读取）
        try {
            var ts = firstTextStyle(ly);
            if (ts) {
                if (descriptorHasKey(ts, stringIDToTypeID("syntheticBold")))
                    r.fauxBold = ts.getBoolean(stringIDToTypeID("syntheticBold"));
                if (descriptorHasKey(ts, stringIDToTypeID("syntheticItalic")))
                    r.fauxItalic = ts.getBoolean(stringIDToTypeID("syntheticItalic"));
            }
        } catch (e) {}
        // 文本框尺寸（段落文本）
        try {
            if (t.kind === TextType.PARAGRAPHTEXT) {
                r.textBoxBounds = {
                    width: Math.round(parseFloat(t.width)),
                    height: Math.round(parseFloat(t.height))
                };
            }
        } catch (e) {}
        // 图层样式：颜色叠加(Color Overlay)、描边(Stroke)和投影(DropShadow) 通过 AM 读取 layerEffects
        try {
            var lref = new ActionReference();
            lref.putIdentifier(charIDToTypeID("Lyr "), ly.id);
            var ldesc = executeActionGet(lref);
            if (ldesc.hasKey(stringIDToTypeID("layerEffects"))) {
                var fx = ldesc.getObjectValue(stringIDToTypeID("layerEffects"));
                var overlayTextColor = colorOverlayTextColor(fx, r.textColor);
                if (overlayTextColor) r.textColor = overlayTextColor;
                // 描边 (frameFX)
                if (fx.hasKey(stringIDToTypeID("frameFX"))) {
                    var stroke = fx.getObjectValue(stringIDToTypeID("frameFX"));
                    var strokeEnabled = true;
                    if (stroke.hasKey(stringIDToTypeID("enabled")))
                        strokeEnabled = stroke.getBoolean(stringIDToTypeID("enabled"));
                    if (strokeEnabled) {
                        var strokeWidth = 1;
                        if (stroke.hasKey(stringIDToTypeID("size")))
                            strokeWidth = Math.round(stroke.getUnitDoubleValue(stringIDToTypeID("size")));
                        var strokeColor = { red: 0, green: 0, blue: 0 };
                        if (stroke.hasKey(stringIDToTypeID("color"))) {
                            var sc = stroke.getObjectValue(stringIDToTypeID("color"));
                            strokeColor.red = Math.round(sc.getDouble(charIDToTypeID("Rd  ")));
                            strokeColor.green = Math.round(sc.getDouble(charIDToTypeID("Grn ")));
                            strokeColor.blue = Math.round(sc.getDouble(charIDToTypeID("Bl  ")));
                        }
                        r.outline = { width: strokeWidth, color: strokeColor };
                    }
                }
                // 投影 (dropShadow)
                if (fx.hasKey(stringIDToTypeID("dropShadow"))) {
                    var ds = fx.getObjectValue(stringIDToTypeID("dropShadow"));
                    var dsEnabled = true;
                    if (ds.hasKey(stringIDToTypeID("enabled")))
                        dsEnabled = ds.getBoolean(stringIDToTypeID("enabled"));
                    if (dsEnabled) {
                        var dsColor = { red: 0, green: 0, blue: 0 };
                        if (ds.hasKey(stringIDToTypeID("color"))) {
                            var dc = ds.getObjectValue(stringIDToTypeID("color"));
                            dsColor.red = Math.round(dc.getDouble(charIDToTypeID("Rd  ")));
                            dsColor.green = Math.round(dc.getDouble(charIDToTypeID("Grn ")));
                            dsColor.blue = Math.round(dc.getDouble(charIDToTypeID("Bl  ")));
                        }
                        var dsOpacity = 75;
                        if (ds.hasKey(stringIDToTypeID("opacity")))
                            dsOpacity = Math.round(ds.getUnitDoubleValue(stringIDToTypeID("opacity")));
                        var dsAngle = 120, dsDistance = 5, dsBlur = 5;
                        if (ds.hasKey(stringIDToTypeID("localLightingAngle")))
                            dsAngle = Math.round(ds.getUnitDoubleValue(stringIDToTypeID("localLightingAngle")));
                        if (ds.hasKey(stringIDToTypeID("distance")))
                            dsDistance = Math.round(ds.getUnitDoubleValue(stringIDToTypeID("distance")));
                        if (ds.hasKey(stringIDToTypeID("blur")))
                            dsBlur = Math.round(ds.getUnitDoubleValue(stringIDToTypeID("blur")));
                        // 角度转 XY 偏移
                        var rad = dsAngle * Math.PI / 180;
                        var offsetX = Math.round(Math.cos(rad) * dsDistance);
                        var offsetY = -Math.round(Math.sin(rad) * dsDistance);
                        r.shadow = { color: dsColor, opacity: dsOpacity, offsetX: offsetX, offsetY: offsetY, blur: dsBlur };
                    }
                }
            }
        } catch (e) {}
    } catch (e) {}
    return r;
}

// ===========================
// 坐标变换：用于把智能对象内部文档坐标映射回主 PSD 坐标
// ===========================
function identityTransform() {
    return { offsetLeft: 0, offsetTop: 0, scaleX: 1, scaleY: 1 };
}

function mapBounds(b, tx) {
    tx = tx || identityTransform();
    var l = tx.offsetLeft + b.left * tx.scaleX;
    var t = tx.offsetTop + b.top * tx.scaleY;
    var r = tx.offsetLeft + b.right * tx.scaleX;
    var bt = tx.offsetTop + b.bottom * tx.scaleY;
    l = Math.round(l); t = Math.round(t); r = Math.round(r); bt = Math.round(bt);
    return { left: l, top: t, right: r, bottom: bt, width: r - l, height: bt - t };
}

function mapSize(size, tx) {
    tx = tx || identityTransform();
    return {
        width: Math.max(1, Math.round(size.width * Math.abs(tx.scaleX))),
        height: Math.max(1, Math.round(size.height * Math.abs(tx.scaleY)))
    };
}

function scaleTextInfo(ti, tx) {
    tx = tx || identityTransform();
    var sy = Math.abs(tx.scaleY);
    var sx = Math.abs(tx.scaleX);
    var s = (sx + sy) * 0.5;
    if (s === 1) return ti;
    try { ti.textSize = Math.max(1, Math.round(ti.textSize * sy)); } catch (e) {}
    try { if (ti.leading > 0) ti.leading = Math.max(1, Math.round(ti.leading * sy)); } catch (e) {}
    try {
        if (ti.textBoxBounds) {
            ti.textBoxBounds.width = Math.max(1, Math.round(ti.textBoxBounds.width * sx));
            ti.textBoxBounds.height = Math.max(1, Math.round(ti.textBoxBounds.height * sy));
        }
    } catch (e) {}
    try { if (ti.outline) ti.outline.width = Math.max(1, Math.round(ti.outline.width * s)); } catch (e) {}
    try {
        if (ti.shadow) {
            ti.shadow.offsetX = Math.round(ti.shadow.offsetX * sx);
            ti.shadow.offsetY = Math.round(ti.shadow.offsetY * sy);
            ti.shadow.blur = Math.max(1, Math.round(ti.shadow.blur * s));
        }
    } catch (e) {}
    return ti;
}

function mapPNGResult(res, tx) {
    if (!res || !tx) return res;
    var mappedSource = mapBounds({
        left: res.sourceBounds.left,
        top: res.sourceBounds.top,
        right: res.sourceBounds.right,
        bottom: res.sourceBounds.bottom
    }, tx);
    var mappedTrim = mapSize(res.trimmedSize, tx);
    res.sourceBounds = {
        left: mappedSource.left,
        top: mappedSource.top,
        right: mappedSource.right,
        bottom: mappedSource.bottom
    };
    res.trimmedSize = mappedTrim;
    res.width = mappedTrim.width;
    res.height = mappedTrim.height;
    if (res.preScale9Size) res.preScale9Size = mapSize(res.preScale9Size, tx);
    return res;
}

function getDocSize(doc) {
    return {
        width: Math.round(parseFloat(doc.width)),
        height: Math.round(parseFloat(doc.height))
    };
}

function descriptorList(desc, ids) {
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!descriptorHasKey(desc, id)) continue;
        try { return desc.getList(id); } catch (e) {}
    }
    return null;
}

function descriptorEnumName(desc, ids) {
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!descriptorHasKey(desc, id)) continue;
        try { return typeIDToStringID(desc.getEnumerationValue(id)); } catch (e1) {}
        try { return typeIDToCharID(desc.getEnumerationValue(id)); } catch (e2) {}
    }
    return "";
}

function actionListNumber(list, index) {
    try { return list.getUnitDoubleValue(index); } catch (e1) {}
    try { return list.getDouble(index); } catch (e2) {}
    try { return list.getInteger(index); } catch (e3) {}
    return null;
}

function readTransformPoints(list) {
    if (!list || list.count < 8) return null;
    var pts = [];
    for (var i = 0; i < 8; i++) {
        var v = actionListNumber(list, i);
        if (v === null) return null;
        pts.push(v);
    }
    return pts;
}

function hasUnsupportedWarp(warpDesc) {
    if (!warpDesc) return false;

    var style = descriptorEnumName(warpDesc, [stringIDToTypeID("warpStyle")]);
    if (style && style !== "warpNone" && style !== "none") return true;

    var warpValue = descriptorNumber(warpDesc, [stringIDToTypeID("warpValue")]);
    var warpPerspective = descriptorNumber(warpDesc, [stringIDToTypeID("warpPerspective")]);
    var warpPerspectiveOther = descriptorNumber(warpDesc, [stringIDToTypeID("warpPerspectiveOther")]);
    if ((warpValue && Math.abs(warpValue) > 0.001)
            || (warpPerspective && Math.abs(warpPerspective) > 0.001)
            || (warpPerspectiveOther && Math.abs(warpPerspectiveOther) > 0.001)) {
        return true;
    }

    return descriptorHasKey(warpDesc, stringIDToTypeID("customEnvelopeWarp"));
}

function hasNonRectTransform(points) {
    if (!points || points.length < 8) return false;
    var eps = 0.5;
    var x0 = points[0], y0 = points[1];
    var x1 = points[2], y1 = points[3];
    var x2 = points[4], y2 = points[5];
    var x3 = points[6], y3 = points[7];
    return Math.abs(y0 - y1) > eps
        || Math.abs(x1 - x2) > eps
        || Math.abs(y2 - y3) > eps
        || Math.abs(x3 - x0) > eps;
}

function getSmartObjectPlacementInfo(doc, ly) {
    var info = { unsupported: false, reason: "", transform: null };
    try {
        var ref = new ActionReference();
        ref.putIdentifier(charIDToTypeID("Lyr "), ly.id);
        var desc = executeActionGet(ref);
        var more = descriptorObject(desc, [stringIDToTypeID("smartObjectMore")]);
        if (!more) return info;

        info.transform = readTransformPoints(descriptorList(more, [stringIDToTypeID("transform"), charIDToTypeID("Trnf")]));
        if (hasNonRectTransform(info.transform)) {
            info.unsupported = true;
            info.reason = "非轴对齐 transform";
            return info;
        }

        var warp = descriptorObject(more, [stringIDToTypeID("warp")]);
        if (hasUnsupportedWarp(warp)) {
            info.unsupported = true;
            info.reason = "warp/customEnvelopeWarp";
            return info;
        }
    } catch (e) {}
    return info;
}

function makeBounds(l, t, r, b) {
    l = Math.round(l); t = Math.round(t); r = Math.round(r); b = Math.round(b);
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
}

function isValidBounds(b) {
    return b && isFinite(b.left) && isFinite(b.top) && isFinite(b.right) && isFinite(b.bottom)
        && b.width > 0 && b.height > 0;
}

function cloneBounds(b) {
    return makeBounds(b.left, b.top, b.right, b.bottom);
}

function unionBounds(a, b) {
    if (!isValidBounds(a)) return isValidBounds(b) ? cloneBounds(b) : null;
    if (!isValidBounds(b)) return cloneBounds(a);
    return makeBounds(
        Math.min(a.left, b.left),
        Math.min(a.top, b.top),
        Math.max(a.right, b.right),
        Math.max(a.bottom, b.bottom)
    );
}

function getMergedVisibleBounds(doc) {
    var before = app.activeDocument;
    var tmp = null;
    try {
        app.activeDocument = doc;
        tmp = doc.duplicate("__smart_bounds__", true);
        app.activeDocument = tmp;
        try { tmp.mergeVisibleLayers(); } catch (eMerge) {}
        var b = getBounds(tmp.activeLayer);
        if (isValidBounds(b)) {
            tmp.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = before;
            return b;
        }
    } catch (e) {
    }
    try {
        if (tmp) tmp.close(SaveOptions.DONOTSAVECHANGES);
    } catch (e2) {}
    try { app.activeDocument = before; } catch (e3) {}
    return null;
}

function collectVisibleLayerBounds(doc, layers) {
    var result = null;
    for (var i = 0; i < layers.length; i++) {
        try {
            var ly = layers[i];
            if (!ly.visible) continue;
            var b = null;
            if (ly.typename === "LayerSet") {
                b = collectVisibleLayerBounds(doc, ly.layers);
                if (!isValidBounds(b)) b = getBounds(ly);
            } else if (ly.typename === "ArtLayer") {
                if (lkind(doc, ly) == 2) continue;
                b = getBounds(ly);
            }
            result = unionBounds(result, b);
        } catch (e) {}
    }
    return result;
}

function getSmartObjectContentBounds(smartDoc) {
    var merged = getMergedVisibleBounds(smartDoc);
    if (isValidBounds(merged)) {
        return { bounds: merged, source: "mergedVisible", fallback: false };
    }

    var union = collectVisibleLayerBounds(smartDoc, smartDoc.layers);
    if (isValidBounds(union)) {
        return { bounds: union, source: "layerUnion", fallback: false };
    }

    var ds = getDocSize(smartDoc);
    if (ds.width > 0 && ds.height > 0) {
        return { bounds: makeBounds(0, 0, ds.width, ds.height), source: "documentCanvas", fallback: true };
    }
    return null;
}

function makeSmartObjectTransform(parentTx, layerBounds, smartDoc, contentBounds) {
    parentTx = parentTx || identityTransform();
    var ds = getDocSize(smartDoc);
    var cb = isValidBounds(contentBounds) ? contentBounds : makeBounds(0, 0, ds.width, ds.height);
    if (ds.width <= 0 || ds.height <= 0 || layerBounds.width <= 0 || layerBounds.height <= 0
            || !isValidBounds(cb)) return null;
    var sx = parentTx.scaleX * (layerBounds.width / cb.width);
    var sy = parentTx.scaleY * (layerBounds.height / cb.height);
    return {
        offsetLeft: parentTx.offsetLeft + layerBounds.left * parentTx.scaleX - cb.left * sx,
        offsetTop: parentTx.offsetTop + layerBounds.top * parentTx.scaleY - cb.top * sy,
        scaleX: sx,
        scaleY: sy
    };
}

function openSmartObjectContents(doc, ly) {
    var before = app.activeDocument;
    app.activeDocument = doc;
    doc.activeLayer = ly;
    var savedDialogs = app.displayDialogs;
    try { app.displayDialogs = DialogModes.NO; } catch (e0) {}
    try {
        executeAction(stringIDToTypeID("placedLayerEditContents"), new ActionDescriptor(), DialogModes.NO);
    } catch (e1) {
        try { app.displayDialogs = savedDialogs; } catch (e2) {}
        throw e1;
    }
    try { app.displayDialogs = savedDialogs; } catch (e3) {}
    if (app.activeDocument === doc) {
        app.activeDocument = before;
        return null;
    }
    return app.activeDocument;
}

function tryExpandSmartObject(doc, ly, rel, assetsDir, psdPrefix, tx, smartDepth) {
    if (!EXPAND_SMART_OBJECTS) return null;
    if (smartDepth >= SMART_OBJECT_MAX_DEPTH) {
        addWarning(rel, "smartObject", "智能对象嵌套超过最大深度，已回退为 PNG");
        return null;
    }

    var bdRaw = getBounds(ly);
    var bd = mapBounds(bdRaw, tx);
    var smartDoc = null;
    try {
        var placementInfo = getSmartObjectPlacementInfo(doc, ly);
        if (placementInfo.unsupported) {
            stat.smartObjectFallback++;
            addWarning(rel, "smartObjectTransform",
                "智能对象包含 " + placementInfo.reason + "，当前拆节点无法还原，已回退为 PNG");
            return null;
        }

        smartDoc = openSmartObjectContents(doc, ly);
        if (!smartDoc) throw new Error("无法打开智能对象内容");

        var visualFeatures = countVisualFeatures(smartDoc, smartDoc.layers);
        if (visualFeatures.clipped > 0 || visualFeatures.adjustment > 0) {
            stat.smartObjectFallback++;
            addWarning(rel, "smartObjectComposite",
                "智能对象内容包含剪贴蒙版/调整层（clipped=" + visualFeatures.clipped
                + ", adjustment=" + visualFeatures.adjustment + "），当前拆节点无法保持 Photoshop 合成语义，已回退为 PNG");
            smartDoc.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = doc;
            return null;
        }

        var contentInfo = getSmartObjectContentBounds(smartDoc);
        if (contentInfo && contentInfo.fallback) {
            addWarning(rel, "smartObjectBounds", "无法计算智能对象内部可见 bounds，已回退为文档画布映射");
        }
        var smartDocSize = getDocSize(smartDoc);

        var smartTx = makeSmartObjectTransform(tx, bdRaw, smartDoc, contentInfo ? contentInfo.bounds : null);
        if (!smartTx) throw new Error("智能对象尺寸无效，无法映射坐标");

        doRasterize(smartDoc, smartDoc.layers);
        var sub = walk(smartDoc, smartDoc.layers, rel, assetsDir, psdPrefix, smartTx, smartDepth + 1);
        smartDoc.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;

        stat.smartObjectExpanded++;
        return {
            name: buildNodeName(ly.name, "group"),
            type: "group",
            options: {
                smartObject: true,
                smartContentBounds: contentInfo ? contentInfo.bounds : null,
                smartContentBoundsSource: contentInfo ? contentInfo.source : "unknown",
                smartDocSize: smartDocSize
            },
            offset: { left: bd.left, top: bd.top },
            size: { width: bd.width, height: bd.height },
            sourceBounds: { left: bd.left, top: bd.top, right: bd.right, bottom: bd.bottom },
            relativePath: rel,
            children: sub
        };
    } catch (e) {
        stat.smartObjectFallback++;
        addWarning(rel, "smartObjectFallback", e.message || String(e));
        try {
            if (smartDoc && app.documents.length > 0) smartDoc.close(SaveOptions.DONOTSAVECHANGES);
        } catch (e2) {}
        try { app.activeDocument = doc; } catch (e3) {}
        return null;
    }
}

// ===========================
// 文件名去重
// ===========================
var usedNames = {};
var usedNameCounts = {};
function uniqueName(fp) {
    var base = sanitizeFileName(fp) || "image";
    var count = usedNameCounts[base] || 0;
    var candidate = count === 0 ? base : base + count;
    while (usedNames[String(candidate).toLowerCase()]) {
        count++;
        candidate = base + count;
    }
    usedNames[String(candidate).toLowerCase()] = true;
    usedNameCounts[base] = count + 1;
    return candidate;
}

// ===========================
// 导出组为 PNG（当 EXPORT_GROUP_AS_PNG 为 true 时使用，Fix #1）
// ===========================
function saveGroupPNG(doc, layerSet, path, relPath, layerRelPath) {
    try {
        var b = layerSet.bounds;
        var bL = parseFloat(b[0]), bT = parseFloat(b[1]);
        var bR = parseFloat(b[2]), bB = parseFloat(b[3]);
        var bW = bR - bL, bH = bB - bT;
        if (bW <= 0 || bH <= 0) return false;

        var docW = parseFloat(doc.width), docH = parseFloat(doc.height);
        var tmp = app.documents.add(doc.width, doc.height, doc.resolution,
            "__t__", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

        app.activeDocument = doc;
        layerSet.duplicate(tmp, ElementPlacement.INSIDE);
        app.activeDocument = tmp;

        var cL = Math.max(0, bL);
        var cT = Math.max(0, bT);
        var cR = Math.min(docW, bR);
        var cB = Math.min(docH, bB);
        if (cR - cL < docW || cB - cT < docH) {
            try {
                tmp.crop([UnitValue(cL, "px"), UnitValue(cT, "px"),
                          UnitValue(cR, "px"), UnitValue(cB, "px")]);
            } catch (e) {}
        }

        tmp.mergeVisibleLayers();
        var visibleBounds = null;
        try {
            var vb = tmp.activeLayer.bounds;
            var vL = parseFloat(vb[0]), vT = parseFloat(vb[1]);
            var vR = parseFloat(vb[2]), vB = parseFloat(vb[3]);
            if (vR > vL && vB > vT) {
                visibleBounds = {
                    left: Math.round(cL + vL),
                    top: Math.round(cT + vT),
                    right: Math.round(cL + vR),
                    bottom: Math.round(cT + vB)
                };
            }
        } catch (e) {}

        try { tmp.trim(TrimType.TRANSPARENT); } catch (e) {
            tmp.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = doc;
            addWarning(layerRelPath, "trim", "组 trim 失败: " + (e.message || String(e)));
            return false;
        }

        var tw = Math.round(parseFloat(tmp.width));
        var th = Math.round(parseFloat(tmp.height));

        var f = new File(path);
        var o = new PNGSaveOptions();
        o.interlaced = false;
        tmp.saveAs(f, o, true, Extension.LOWERCASE);
        tmp.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;

        return { ok: true, width: tw, height: th, relPath: relPath,
            sourceBounds: visibleBounds || { left: Math.round(bL), top: Math.round(bT), right: Math.round(bR), bottom: Math.round(bB) },
            trimmedSize: { width: tw, height: th } };
    } catch (e) {
        addWarning(layerRelPath, "saveGroupPNG", e.message || String(e));
        stat.errors++;
        try {
            for (var i = 0; i < app.documents.length; i++) {
                if (app.documents[i].name === "__t__") {
                    app.documents[i].close(SaveOptions.DONOTSAVECHANGES);
                }
            }
            app.activeDocument = doc;
        } catch (e2) {}
        return false;
    }
}

// ===========================
// 遍历 + 导出 + 构建 JSON（Fix #1, #7, #8, #10, #14）
// ===========================
function walk(doc, layers, parent, assetsDir, psdPrefix, tx, smartDepth) {
    tx = tx || identityTransform();
    smartDepth = smartDepth || 0;
    var out = [];
    for (var i = 0; i < layers.length; i++) {
        var rel = "";
        try {
            var ly = layers[i];
            if (!ly.visible) continue;
            var nm  = ly.name;
            rel = parent ? (parent + "/" + nm) : nm;
            var bdRaw = getBounds(ly);
            var bd  = mapBounds(bdRaw, tx);

            // 检测剪贴蒙版（Fix #8）
            if (ly.typename === "ArtLayer" && isClipped(ly)) {
                stat.clippingLayerCount++;
                addWarning(rel, "clippingMask",
                    "图层处于剪贴蒙版链中，单独导出可能与 PSD 显示不一致");
            }

            if (ly.typename === "LayerSet") {
                stat.groupCount++;
                if (ly.layers.length === 0) { stat.emptyGroupCount++; stat.skip++; continue; }
                if (isImageGroupName(nm)) {
                    var imageGroupFp = uniqueName(buildExportName(rel));
                    var imageGroupRes = saveGroupPNG(doc, ly, assetsDir + "/" + imageGroupFp + ".png", imageGroupFp, rel);
                    imageGroupRes = mapPNGResult(imageGroupRes, tx);
                    if (imageGroupRes) {
                        stat.png++;
                        out.push({
                            name: buildNodeName(nm, "image"),
                            type: "png",
                            options: {},
                            offset: { left: imageGroupRes.sourceBounds.left, top: imageGroupRes.sourceBounds.top },
                            size: { width: imageGroupRes.width, height: imageGroupRes.height },
                            sourceBounds: imageGroupRes.sourceBounds,
                            trimmedSize: imageGroupRes.trimmedSize,
                            relativePath: imageGroupRes.relPath,
                            children: []
                        });
                        continue;
                    }
                    addWarning(rel, "imageGroupFallback", ".img 组合导出 PNG 失败，已跳过，避免拆分 .img 内容");
                    stat.skip++;
                    continue;
                }
                var sub = walk(doc, ly.layers, rel, assetsDir, psdPrefix, tx, smartDepth);
                var groupNode = {
                    name: buildNodeName(nm, "group"), type: "group", options: {},
                    offset: { left: bd.left, top: bd.top },
                    size: { width: bd.width, height: bd.height },
                    sourceBounds: { left: bd.left, top: bd.top, right: bd.right, bottom: bd.bottom },
                    relativePath: rel, children: sub
                };

                // 可选：导出组 PNG（Fix #1）
                if (EXPORT_GROUP_AS_PNG) {
                    var groupFp = uniqueName(buildExportName(rel));
                    var groupRes = saveGroupPNG(doc, ly, assetsDir + "/" + groupFp + ".png", groupFp, rel);
                    groupRes = mapPNGResult(groupRes, tx);
                    if (groupRes) {
                        groupNode.groupImage = {
                            relPath: groupRes.relPath,
                            width: groupRes.width,
                            height: groupRes.height,
                            sourceBounds: groupRes.sourceBounds,
                            trimmedSize: groupRes.trimmedSize
                        };
                        stat.png++;
                    }
                }
                out.push(groupNode);
            } else if (ly.typename === "ArtLayer") {
                if (isImageGroupName(nm)) {
                    var imageLayerFp = uniqueName(buildExportName(rel));
                    var imageLayerRes = savePNG(doc, ly, assetsDir + "/" + imageLayerFp + ".png", imageLayerFp, rel, null);
                    imageLayerRes = mapPNGResult(imageLayerRes, tx);
                    if (imageLayerRes) {
                        stat.png++;
                        var imageLayerOpacity = 100;
                        try { imageLayerOpacity = Math.round(ly.opacity); } catch (e) {}
                        out.push({
                            name: buildNodeName(nm, "image"),
                            type: "png",
                            options: { opacity: imageLayerOpacity },
                            offset: { left: imageLayerRes.sourceBounds.left, top: imageLayerRes.sourceBounds.top },
                            size: { width: imageLayerRes.width, height: imageLayerRes.height },
                            sourceBounds: imageLayerRes.sourceBounds,
                            trimmedSize: imageLayerRes.trimmedSize,
                            relativePath: imageLayerRes.relPath,
                            children: []
                        });
                        continue;
                    }
                    addWarning(rel, "imageLayerFallback", ".img 图层导出 PNG 失败，已跳过，避免拆分 .img 内容");
                    stat.skip++;
                    continue;
                }
                if (isText(ly)) {
                    var ti = textInfo(ly);
                    ti = scaleTextInfo(ti, tx);
                    if (bd.width <= 0 && bd.height <= 0 && ti.textContents === "") {
                        stat.skip++; continue;
                    }
                    out.push({ name: buildNodeName(nm, "text"), type: "text",
                        options: {
                            textContents: ti.textContents,
                            textFont: ti.textFont,
                            textSize: ti.textSize,
                            textColor: ti.textColor,
                            justification: ti.justification,
                            leading: ti.leading,
                            tracking: ti.tracking,
                            antiAliasMethod: ti.antiAliasMethod,
                            opacity: ti.opacity,
                            blendMode: ti.blendMode,
                            fauxBold: ti.fauxBold,
                            fauxItalic: ti.fauxItalic,
                            textBoxBounds: ti.textBoxBounds,
                            outline: ti.outline,
                            shadow: ti.shadow
                        },
                        offset: { left: bd.left, top: bd.top },
                        size: { width: bd.width, height: bd.height },
                        sourceBounds: { left: bd.left, top: bd.top, right: bd.right, bottom: bd.bottom },
                        relativePath: rel, children: [] });
                    stat.text++;
                } else {
                    var kArt = lkind(doc, ly);
                    if (kArt == 5) {
                        var smartNode = tryExpandSmartObject(doc, ly, rel, assetsDir, psdPrefix, tx, smartDepth);
                        if (smartNode) {
                            out.push(smartNode);
                            continue;
                        }
                    }

                    if (shouldSkip(doc, ly)) {
                        var k = kArt;
                        if (k != 2 && k != -1) stat.unsupportedCount++;
                        stat.skip++;
                        continue;
                    }
                    // 九宫格检测
                    var s9 = parseScale9(nm);
                    var exportLayerName = s9 ? stripScale9Suffix(nm) : nm;
                    var exportRel = parent ? (parent + "/" + exportLayerName) : exportLayerName;
                    var fp2 = uniqueName(buildExportName(exportRel));
                    // 只有显式指定参数时才传 s9 给 savePNG 做裁切
                    var cropS9 = (s9 && s9.source === "name_params") ? s9 : null;
                    var res2 = savePNG(doc, ly, assetsDir + "/" + fp2 + ".png", fp2, rel, cropS9);
                    res2 = mapPNGResult(res2, tx);
                    if (res2) {
                        stat.png++;
                        var layerOpacity = 100;
                        try { layerOpacity = Math.round(ly.opacity); } catch (e) {}
                        var nodeOpts = { opacity: layerOpacity };
                        var node = { name: buildNodeName(nm, "image"), type: "png", options: nodeOpts,
                            offset: { left: bd.left, top: bd.top },
                            size: { width: res2.width, height: res2.height },
                            sourceBounds: res2.sourceBounds,
                            trimmedSize: res2.trimmedSize,
                            relativePath: res2.relPath, children: [] };
                        if (s9) {
                            stat.scale9Count++;
                            // 自动推算模式：基于导出尺寸计算 insets
                            if (s9.source === "name_flag" && res2.width > 0 && res2.height > 0) {
                                var gi = guessScale9Insets(res2.width, res2.height);
                                s9.top = gi.top; s9.right = gi.right;
                                s9.bottom = gi.bottom; s9.left = gi.left;
                            }
                            node.sliceBorder = {
                                top: s9.top, bottom: s9.bottom,
                                left: s9.left, right: s9.right
                            };
                            // originalSize = PSD 图层原始尺寸（最可靠，不受裁切影响）
                            node.originalSize = { width: bd.width, height: bd.height };
                        }
                        out.push(node);
                    } else { stat.skip++; }
                }
            } else {
                stat.unsupportedCount++;
                stat.skip++;
            }
        } catch (e) {
            stat.skip++;
            stat.errors++;
            addWarning(rel || ("layer[" + i + "]"), "walk", e.message || String(e));
        }
    }
    return out;
}

// ===========================
// 主流程
// ===========================
function main() {
    if (app.documents.length === 0) { alert("请先打开一个 PSD 文件！"); return; }

    var doc = app.activeDocument;
    var psdFolder = doc.fullName.parent.fsName;   // PSD 所在目录 (assets/asset-art/psd)
    var name      = doc.name;                      // e.g. "test_ui.psd"
    var rawPsdName = name.replace(/\.psd$/i, "");  // e.g. "test_ui"
    var psdPrefix  = sanitizeFileName(rawPsdName) || "psd";   // 保留 PSD 原名，仅替换非法文件名字符

    // 从 PSD 目录定位 Client 根目录：搜索 assets/asset-art/psd 标记
    var psdFolderNorm = psdFolder.replace(/\\/g, '/');
    var marker = '/assets/asset-art/psd';
    var markerIdx = psdFolderNorm.indexOf(marker);
    if (markerIdx < 0) { alert('PSD 不在 assets/asset-art/psd 目录下！'); return; }
    var clientRoot = psdFolderNorm.substring(0, markerIdx);

    // PNG 输出目录
    var assetsDir = clientRoot + "/assets/asset-art/atlas/" + psdPrefix;
    // JSON 输出目录
    var jsonDir   = psdFolder + "/tool/" + psdPrefix;
    var jsonPath  = jsonDir + "/" + psdPrefix + "-structure.json";
    var reportPath = jsonDir + "/" + psdPrefix + "-report.json";

    ensureFolder(assetsDir);
    ensureFolder(jsonDir);

    var savedDialogs = app.displayDialogs;
    try { app.displayDialogs = DialogModes.NO; } catch (e) {}

    var savedUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    var savedHistory = doc.activeHistoryState;

    try {
        // ① 栅格化智能对象/视频/3D
        doRasterize(doc, doc.layers);

        // ② 遍历 + 导出 PNG + 构建结构
        var ch = walk(doc, doc.layers, "", assetsDir, psdPrefix);

        var st = {
            type: "root", options: {},
            size: { width: Math.round(parseFloat(doc.width)),
                    height: Math.round(parseFloat(doc.height)) },
            psdName: rawPsdName,
            psdPrefix: psdPrefix,
            atlasPath: "asset-art/atlas/" + psdPrefix,
            children: ch
        };

        // ③ 保存 JSON
        var f = new File(jsonPath);
        f.encoding = "UTF-8";
        f.open("w");
        f.write(JSON.stringify(st));
        f.close();

        // ④ 保存报告（Fix #10）
        var report = {
            psdName: rawPsdName,
            exportTime: new Date().toString(),
            statistics: stat,
            warnings: warnings
        };
        var rf = new File(reportPath);
        rf.encoding = "UTF-8";
        rf.open("w");
        rf.write(JSON.stringify(report));
        rf.close();

    } catch (e) {
        alert("导出出错: " + e.message + "\n行: " + e.line);
        stat.errors++;
    }

    // ⑤ 恢复 PSD
    try { doc.activeHistoryState = savedHistory; } catch (e) {}

    try { app.displayDialogs = savedDialogs; } catch (e) {}
    app.preferences.rulerUnits = savedUnits;

    // 汇总（Fix #14：更详细的统计信息）
    var m = "Psd2CCC Digest 完成！\n\n";
    m += "导出PNG: " + stat.png + "  文字: " + stat.text + "\n";
    m += "组: " + stat.groupCount + "  空组: " + stat.emptyGroupCount + "\n";
    m += "去重: 已交由 Cocos 公共图集检查处理\n";
    if (stat.raster > 0) m += "栅格化: " + stat.raster + " 个特殊图层（已自动恢复）\n";
    if (stat.smartObjectExpanded > 0) m += "智能对象展开: " + stat.smartObjectExpanded + " 个\n";
    if (stat.smartObjectFallback > 0) m += "智能对象回退PNG: " + stat.smartObjectFallback + " 个\n";
    if (stat.clippingLayerCount > 0) m += "剪贴蒙版图层: " + stat.clippingLayerCount + " 个（可能失真）\n";
    if (stat.scale9Count > 0) m += "九宫格图层: " + stat.scale9Count + " 个\n";
    if (stat.unsupportedCount > 0) m += "不支持的图层: " + stat.unsupportedCount + "\n";
    if (stat.skip > 0) m += "跳过: " + stat.skip + "\n";
    if (stat.warnings > 0) m += "警告: " + stat.warnings + " 条\n";
    if (stat.errors > 0) m += "错误: " + stat.errors + " 条\n";
    m += "\nPNG: " + assetsDir;
    m += "\nJSON: " + jsonPath;
    if (stat.warnings > 0 || stat.errors > 0) m += "\n报告: " + reportPath;
    alert(m);
}

main();

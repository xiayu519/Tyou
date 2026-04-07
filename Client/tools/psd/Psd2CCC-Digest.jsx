/*
 * Psd2CCC-Digest — PSD → Cocos Creator 资源导出
 * 兼容 Adobe Photoshop CC 2018+
 *
 * 用法：在 Photoshop 中打开 PSD（位于 assets/asset-art/psd/ 目录下），
 *       运行此脚本。
 *
 * 输出：
 *   PNG → {Client}/assets/asset-art/atlas/{psdName}/
 *   JSON → {psdFolder}/tool/{psdName}/{psdName}-structure.json
 *
 * 文字层 → text 节点；其余可见图层/组 → png 导出。
 * 不修改 PSD 任何内容（栅格化后自动恢复）。
 */

#target photoshop

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

// DOM 检测文字层
function isText(ly) {
    try { var t = ly.textItem; return (t != null); }
    catch (e) { return false; }
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
// 统计
// ===========================
var stat = { raster: 0, png: 0, text: 0, skip: 0, dedup: 0 };

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
                if (k == 3 || k == 4 || k == 5 || k == 7 || k == 8) {
                    if (rasterize(doc, ly)) stat.raster++;
                }
            }
        } catch (e) {}
    }
}

// ===========================
// 指纹去重注册表
// ===========================
var dedupMap = {};

function getDocFingerprint(tmpDoc) {
    var w = Math.round(parseFloat(tmpDoc.width));
    var h = Math.round(parseFloat(tmpDoc.height));
    var hist = tmpDoc.histogram;
    var sig = w + "x" + h;
    for (var i = 0; i < 256; i++) sig += "," + hist[i];
    return sig;
}

// ===========================
// 中文 → 拼音首字母 查找表
// ===========================
var _pyMap = {};
(function () {
    var g = [
        ["A", "\u963F\u554A\u54C0\u550E\u57C3\u77EE\u7231\u788D\u5B89\u6697\u6309\u5CB8\u6848\u6697"],
        ["B", "\u516B\u628A\u7238\u5427\u62D4\u767D\u767E\u67CF\u8D25\u62DC\u73ED\u822C\u677F\u7248\u529E\u534A\u4F34\u626E\u62CC\u68D2\u5305\u8584\u4FDD\u5B9D\u62A5\u62B1\u66B4\u676F\u60B2\u7891\u5317\u8D1D\u5907\u80CC\u88AB\u500D\u5954\u672C\u9F3B\u6BD4\u5F7C\u7B14\u9119\u5E01\u5FC5\u6BD5\u58C1\u907F\u81C2\u8FB9\u7F16\u4FBF\u53D8\u904D\u8FA8\u8FA9\u6807\u8868\u522B\u5BBE\u51B0\u5175\u997C\u5E76\u75C5\u62E8\u6CE2\u73BB\u64AD\u4F2F\u9A73\u535A\u640F\u6CCA\u8865\u6355\u4E0D\u5E03\u6B65\u90E8"],
        ["C", "\u64E6\u731C\u624D\u6750\u8D22\u88C1\u91C7\u5F69\u8E29\u83DC\u53C2\u8695\u6B8B\u60ED\u60E8\u7060\u4ED3\u82CD\u8231\u85CF\u64CD\u66F9\u8349\u518C\u4FA7\u7B56\u5C42\u66FE\u53C9\u5DEE\u63D2\u67E5\u5BDF\u62C6\u67F4\u6398\u8749\u4EA7\u98A4\u660C\u7316\u957F\u5E38\u507F\u80A0\u5382\u573A\u7545\u5021\u5531\u8D85\u671D\u6F6E\u5435\u7092\u8F66\u626F\u5F7B\u64A4\u6C89\u9648\u6668\u81E3\u886C\u79F0\u8D81\u6491\u6210\u5448\u8BDA\u627F\u57CE\u4E58\u60E9\u7A0B\u5403\u6C60\u6301\u8FDF\u9A70\u803B\u5C3A\u9F7F\u4F88\u5145\u51B2\u866B\u5BA0\u62BD\u4EC7\u7EF8\u6101\u7B79\u4E11\u81ED\u521D\u51FA\u9664\u53A8\u6A71\u7840\u50A8\u695A\u755C\u5904\u89E6\u5DDD\u7A7F\u4F20\u8239\u5598\u4E32\u7A97\u5E8A\u95EF\u521B\u5439\u7092\u5782\u6625\u7EAF\u8822\u621B\u8BCD\u8328\u6148\u78C1\u6B21\u6B64\u523A\u4ECE\u5306\u8471\u806A\u6DC3\u51D1\u7C97\u4FC3\u918B\u7C07\u50AC\u6467\u8403\u8106\u7FE0\u6751\u5B58\u5BF8\u63AA\u632B\u9519"],
        ["D", "\u642D\u7B54\u8FBE\u6253\u5927\u5446\u4EE3\u5E26\u5F85\u888B\u6234\u4E39\u5355\u62C5\u80C6\u65E6\u4F46\u5F39\u6DE1\u86CB\u5F53\u6321\u515A\u8361\u5200\u5BFC\u5C9B\u5012\u8E48\u5230\u76D7\u60BC\u9053\u7A3B\u5F97\u5FB7\u7684\u706F\u767B\u7B49\u9093\u51F3\u77AA\u4F4E\u5824\u6EF4\u8FEA\u654C\u7B1B\u5E95\u62B5\u5730\u7B2C\u5E1D\u5F1F\u9012\u7F14\u98A0\u5178\u70B9\u7535\u5E97\u57AB\u60E6\u6BBF\u78C9\u53FC\u96D5\u540A\u9493\u8C03\u6389\u8DCC\u7239\u53E0\u8776\u4E01\u53EE\u76EF\u9489\u9876\u9F0E\u5B9A\u4E22\u4E1C\u51AC\u8463\u61C2\u51BB\u6D1E\u52A8\u90FD\u6597\u6296\u9661\u8C46\u9017\u7763\u6BD2\u8BFB\u72EC\u5835\u8D4C\u675C\u809A\u5EA6\u6E21\u7AEF\u77ED\u6BB5\u65AD\u953B\u5806\u5BF9\u961F\u6566\u8E72\u987F\u76FE\u949D\u591A\u593A\u6735\u8EB2\u60F0\u5815"],
        ["E", "\u86FE\u989D\u6069\u513F\u800C\u8033\u4E8C"],
        ["F", "\u53D1\u7F5A\u9600\u6CD5\u5E06\u756A\u7FFB\u51E1\u70E6\u7E41\u53CD\u8FD4\u72AF\u6CDB\u996D\u8303\u65B9\u574A\u82B3\u9632\u59A8\u623F\u4EFF\u8BBF\u7EBA\u653E\u98DE\u975E\u5561\u80A5\u532A\u5E9F\u5420\u80BA\u8D39\u5206\u7EB7\u82AC\u575F\u7C89\u4EFD\u7CAA\u594B\u6124\u4E30\u5C01\u67AB\u5CF0\u950B\u98CE\u75AF\u51AF\u9022\u7F1D\u51E4\u5949\u4F5B\u5426\u592B\u80A4\u4F0F\u6276\u670D\u5E45\u8F90\u798F\u629A\u5E9C\u8150\u8F85\u7236\u4ED8\u5987\u8D1F\u9644\u590D\u8D4B\u5BCC\u8986"],
        ["G", "\u5676\u8BE5\u6539\u6982\u5E72\u7518\u809D\u6746\u8D76\u6562\u611F\u521A\u94A2\u7F38\u7EB2\u5C97\u6E2F\u9AD8\u641E\u7A3F\u544A\u6208\u54E5\u80F3\u9E3D\u5272\u6B4C\u9601\u683C\u9769\u9694\u845B\u4E2A\u5404\u7ED9\u6839\u8DDF\u8015\u66F4\u5E9A\u5DE5\u516C\u529F\u653B\u4F9B\u5BAB\u5F13\u606D\u5DE9\u8D21\u5171\u72D7\u6784\u8D2D\u591F\u4F30\u5B64\u59D1\u53E4\u8C37\u80A1\u9AA8\u9F13\u56FA\u6545\u987E\u522E\u74DC\u6302\u62D0\u602A\u5173\u89C2\u5B98\u51A0\u9986\u7BA1\u60EF\u704C\u8D2F\u5149\u5E7F\u5F52\u9F9F\u89C4\u8F68\u67DC\u8D35\u6842\u8DEA\u6EDA\u68CD\u9505\u56FD\u679C\u88F9\u8FC7"],
        ["H", "\u54C8\u8FD8\u5B69\u6D77\u5BB3\u542B\u5BD2\u51FD\u97E9\u7F55\u558A\u6C57\u65F1\u6770\u822A\u6BEB\u8C6A\u597D\u53F7\u6D69\u8017\u5475\u559D\u5408\u4F55\u6CB3\u8377\u6838\u8D3A\u8D6B\u8910\u9E64\u6068\u54FC\u6A2A\u8861\u8F70\u54C4\u7EA2\u5B8F\u6D2A\u8679\u9E3F\u4FAF\u7334\u543C\u540E\u539A\u5019\u5FFD\u4E4E\u547C\u58F6\u80E1\u6E56\u864E\u4E92\u6237\u62A4\u82B1\u534E\u54D7\u6ED1\u5316\u5212\u753B\u8BDD\u6000\u6DEE\u574F\u6B22\u73AF\u8FD8\u6362\u5524\u60A3\u8352\u614C\u7687\u9EC4\u714C\u6643\u7070\u6062\u6325\u8F89\u56DE\u6BC1\u6094\u6C47\u4F1A\u60E0\u6167\u7ED8\u8D3F\u660F\u5A5A\u9B42\u6DF7\u6D3B\u706B\u4F19\u6216\u83B7\u8D27\u7978\u60D1\u970D"],
        ["J", "\u51FB\u9965\u573E\u673A\u808C\u9E21\u79EF\u57FA\u7E3E\u6FC0\u53CA\u5409\u7EA7\u6781\u5373\u6025\u75BE\u96C6\u8F91\u51E0\u5DF1\u6D4E\u8BA1\u8BB0\u9645\u5B63\u7EAA\u7EE7\u5BC2\u5BC4\u52A0\u4F73\u5BB6\u5609\u5939\u835A\u988A\u7532\u4EF7\u67B6\u67B6\u5047\u5AC1\u5978\u5C16\u575A\u714E\u95F4\u6361\u7B80\u51CF\u526A\u68C0\u5EFA\u4EF6\u5065\u6E10\u8DF5\u9274\u7BAD\u6C5F\u59DC\u5C06\u6D46\u50F5\u848B\u5956\u6868\u5320\u964D\u9171\u4EA4\u90CA\u5A07\u9A84\u6D47\u80F6\u6559\u7126\u811A\u641E\u53EB\u56BC\u8F7F\u8F83\u63A5\u63ED\u8857\u9636\u8282\u6770\u6D01\u7ED3\u622A\u7AED\u59D0\u89E3\u4ECB\u6212\u5C4A\u501F\u4ECA\u91D1\u6D25\u7B4B\u65A4\u4EC5\u7D27\u9526\u5C3D\u52B2\u8FD1\u8FDB\u664B\u6D78\u7981\u4EAC\u7ECF\u7CBE\u4E95\u9888\u666F\u8B66\u51C0\u5F84\u7ADE\u7ADF\u656C\u955C\u7EA0\u7A76\u4E5D\u4E45\u9152\u65E7\u6551\u5C31\u8205\u5C45\u97A0\u5C40\u83CA\u4E3E\u77E9\u53E5\u5DE8\u62D2\u5177\u8DDD\u805A\u5267\u6350\u9E20\u5377\u5026\u7EE2\u89C9\u51B3\u7EDD\u5747\u519B\u541B\u83CC\u4FCA"],
        ["K", "\u5F00\u63E9\u51EF\u5496\u5361\u520A\u582A\u574E\u780D\u770B\u5EB7\u6177\u7CD6\u625B\u6297\u8003\u70E4\u9760\u79D1\u68F5\u9897\u58F3\u54B3\u53EF\u6E34\u514B\u523B\u5BA2\u8BFE\u80AF\u6073\u5751\u7A7A\u5B54\u63A7\u53E3\u6263\u67AF\u54ED\u82E6\u5E93\u88E4\u9177\u5938\u8DE8\u5757\u5FEB\u7B77\u5BBD\u6B3E\u72C2\u51B5\u65F7\u6846\u77FF\u4E8F\u8475\u6127\u6E83\u56F0\u6269\u62EC\u9614"],
        ["L", "\u62C9\u5566\u5587\u8721\u8FA3\u6765\u8D56\u5170\u62E6\u680F\u84DD\u7BEE\u70C2\u6EE5\u90CE\u72FC\u5ECA\u6D6A\u6347\u52B3\u7262\u8001\u4E50\u52D2\u96F7\u857E\u7C7B\u7D2F\u6CEA\u51B7\u68F1\u611A\u9ECE\u79BB\u68A8\u7281\u5398\u7483\u7406\u91CC\u793C\u529B\u5386\u5389\u7ACB\u5229\u4F8B\u96B6\u6817\u7C92\u4FE9\u8FDE\u5E18\u601C\u83B2\u8054\u5EC9\u8138\u7EC3\u70BC\u604B\u94FE\u826F\u7CAE\u51C9\u6881\u91CF\u4EAE\u8F86\u8C05\u7597\u8FBD\u4E86\u6599\u5217\u52A3\u730E\u88C2\u70C8\u4E34\u90BB\u6797\u6DCB\u78F7\u7075\u96F6\u9F84\u94C3\u51CC\u53E6\u4EE4\u9886\u6E9C\u5218\u6D41\u7559\u516D\u9F99\u7B3C\u804B\u9686\u697C\u9732\u964B\u6F0F\u5362\u7089\u9C81\u5F55\u9646\u8DEF\u9E7F\u9A74\u65C5\u94DD\u5C61\u7F15\u7387\u5F8B\u7EFF\u6EE4\u8651\u4E71\u63A0\u7565\u4F26\u8BBA\u7F57\u841D\u903B\u87BA\u9A61\u88F8\u843D\u6D1B\u7EDC"],
        ["M", "\u5988\u9EBB\u9A6C\u7801\u8682\u9A82\u5417\u561B\u4E70\u5356\u8FC8\u9EA6\u8109\u86EE\u6EE1\u6F2B\u66FC\u6162\u5FD9\u8292\u76F2\u8305\u732B\u6BDB\u77DB\u87CA\u8302\u5192\u8D38\u5E3D\u4E48\u6CA1\u679A\u7384\u6885\u5A92\u6BCF\u7F8E\u59B9\u95E8\u95F7\u4EEC\u840C\u76DF\u731B\u8499\u68A6\u5F25\u8FF7\u8C1C\u7C73\u79D8\u5BC6\u871C\u7EF5\u68C9\u514D\u52C9\u9762\u82D7\u63CF\u7784\u79D2\u5999\u5E99\u706D\u8511\u6C11\u654F\u540D\u660E\u547D\u6A21\u6478\u78E8\u9B54\u672B\u6CAB\u6F20\u58A8\u6CA1\u9ED8\u8C0B\u67D0\u6BCD\u4EA9\u6728\u76EE\u7267\u5893\u5E55\u6155\u66AE"],
        ["N", "\u62FF\u54EA\u90A3\u7EB3\u4E43\u5976\u5948\u8010\u5357\u7537\u96BE\u8111\u607C\u95F9\u5462\u5AE9\u80FD\u5C3C\u6CE5\u4F60\u9006\u5E74\u5FF5\u5A18\u917F\u9E1F\u5C3F\u634F\u60A8\u5B81\u51DD\u725B\u7EBD\u626D\u519C\u6D53\u5F04\u5974\u52AA\u6012\u5973\u6696\u632A\u8BFA"],
        ["O", "\u54E6\u6B27\u5076"],
        ["P", "\u8DB4\u6252\u6015\u62CD\u6392\u724C\u6D3E\u6500\u76D8\u5224\u53DB\u76FC\u7554\u65C1\u5E9E\u80D6\u629B\u8DD1\u6CE1\u70AE\u966A\u57F9\u8D54\u4F69\u914D\u76C6\u55B7\u670B\u68DA\u84EC\u7BEE\u81A8\u6367\u78B0\u6279\u62AB\u76AE\u7591\u813E\u5339\u5C41\u7247\u504F\u7BC7\u4FBF\u9A97\u7968\u62FC\u54C1\u8D2B\u9891\u8058\u5E73\u8BC4\u51ED\u74F6\u82F9\u5761\u6CFC\u9887\u5A46\u7834\u8FEB\u9B44\u5256\u6251\u94FA\u8461\u6734\u4EC6\u6D66\u8C31"],
        ["Q", "\u4E03\u59BB\u67D2\u51C4\u671F\u6B3A\u6F06\u9F50\u5176\u5947\u5C90\u68CB\u65D7\u9A91\u7802\u4E5E\u8D77\u542F\u6C14\u5F03\u6C7D\u6CE3\u5668\u5343\u8FC1\u7275\u94C5\u8C26\u7B7E\u524D\u94B1\u6F5C\u6D45\u9063\u6B49\u67AA\u8154\u5899\u5F3A\u62A2\u6084\u6865\u4E54\u4FA8\u5DE7\u9798\u5207\u8304\u4E14\u602F\u7A83\u4EB2\u7434\u79BD\u52E4\u9752\u8F7B\u6C22\u503E\u6E05\u60C5\u6674\u8BF7\u5E86\u7A77\u4E18\u79CB\u90B1\u7403\u6C42\u56DA\u914B\u8D8B\u9A71\u533A\u66F2\u8EAF\u5C48\u6E20\u53D6\u8DA3\u53BB\u5708\u5168\u6743\u6CC9\u62F3\u72AC\u529D\u5238\u7F3A\u5374\u786E\u9E4A\u88D9\u7FA4"],
        ["R", "\u7136\u71C3\u67D3\u56B7\u58E4\u8BA9\u7ED5\u6270\u60F9\u70ED\u4EBA\u4EC1\u5FCD\u8BA4\u4EFB\u5203\u97E7\u6254\u4ECD\u65E5\u5BB9\u6EB6\u7194\u8363\u878D\u67D4\u63C9\u8089\u5982\u5112\u4E73\u8FB1\u5165\u8F6F\u745E\u6DA6\u82E5\u5F31"],
        ["S", "\u6492\u6D12\u8428\u585E\u8D5B\u4E09\u4F1E\u6563\u6851\u55D3\u4E27\u626B\u5AC2\u8272\u68EE\u6740\u6C99\u7EB1\u5239\u7802\u50BB\u5565\u53A6\u7B5B\u6652\u5C71\u5220\u6749\u95EA\u886B\u5584\u4F24\u5546\u8D4F\u4E0A\u5C1A\u6342\u70E7\u7A0D\u52FA\u5C11\u7ECD\u54E8\u5962\u820C\u86C7\u820D\u8BBE\u793E\u5C04\u6444\u6D89\u7533\u4F38\u8EAB\u6DF1\u795E\u5BA1\u5A76\u751A\u80BE\u6E17\u58F0\u751F\u7272\u80DC\u7EF3\u7701\u5723\u76DB\u5269\u5C38\u5E08\u8BD7\u65BD\u72EE\u5341\u77F3\u62FE\u8680\u65F6\u8BC6\u5B9E\u98DF\u53F2\u4F7F\u59CB\u9A76\u58EB\u6C0F\u662F\u4E16\u52BF\u793A\u9002\u5BA4\u89C6\u8BD5\u9970\u901D\u91CA\u6536\u624B\u9996\u5B88\u5BFF\u53D7\u552E\u6388\u7626\u517D\u4E66\u53D4\u6292\u6B8A\u8212\u852C\u8F93\u719F\u6691\u5C5E\u9F20\u85AF\u672F\u675F\u8FF0\u6811\u7AD6\u6570\u5237\u800D\u8870\u6454\u7529\u5E05\u53CC\u723D\u6C34\u7A0E\u7761\u987A\u8BF4\u4E1D\u53F8\u79C1\u601D\u65AF\u6495\u6B7B\u56DB\u5BFA\u4F3C\u9972\u677E\u5B8B\u9001\u9882\u641C\u8258\u82CF\u4FD7\u7D20\u901F\u5BBF\u5851\u9178\u849C\u7B97\u867D\u968F\u5C81\u788E\u5B59\u635F\u7B0B\u7F29\u6240\u7D22\u9501"],
        ["T", "\u4ED6\u5979\u5B83\u584C\u5854\u53F0\u592A\u6001\u6CF0\u8D2A\u644A\u6EE9\u575B\u8C08\u6F6D\u5766\u53F9\u63A2\u6C64\u5510\u5802\u5858\u8EBA\u6DCC\u8D9F\u6398\u9003\u6843\u9676\u6DD8\u8BA8\u5957\u7279\u75BC\u817E\u68AF\u8E22\u63D0\u9898\u8E44\u4F53\u66FF\u5929\u7530\u751C\u586B\u6311\u6761\u8DF3\u8D34\u94C1\u5385\u542C\u5EF7\u4EAD\u5EAD\u505C\u633A\u8247\u901A\u540C\u94DC\u7AE5\u7EDF\u6876\u75DB\u5077\u5934\u900F\u7A81\u56FE\u5F92\u9014\u5C60\u571F\u5410\u5154\u56E2\u63A8\u817F\u9000\u541E\u5C6F\u6258\u62D6\u8131\u9A7C\u59A5\u62D3"],
        ["W", "\u6316\u74E6\u889C\u6B6A\u5916\u5F2F\u6E7E\u5B8C\u987D\u73A9\u4E38\u4E07\u6C6A\u738B\u4EA1\u7F51\u5F80\u5FD8\u65FA\u671B\u5371\u5A01\u5FAE\u4E3A\u56F4\u8FDD\u552F\u7EF4\u4F1F\u4F2A\u5C3E\u7EAC\u672A\u4F4D\u5473\u536B\u6E29\u6587\u95FB\u868A\u7EB9\u543B\u7A33\u95EE\u7FC1\u7A9D\u6211\u63E1\u6C83\u5367\u4E4C\u545C\u6C61\u5DEB\u5C4B\u65E0\u4E94\u5348\u6B66\u4FAE\u821E\u52FF\u52A1\u7269\u8BEF\u96FE"],
        ["X", "\u5915\u897F\u5438\u5E0C\u6790\u606F\u727A\u6089\u60DC\u6614\u7199\u819D\u9521\u6EAA\u7184\u5AC2\u4E60\u5E2D\u88AD\u559C\u7EC6\u620F\u7CFB\u9699\u867E\u5CE1\u72ED\u8F96\u971E\u4E0B\u5413\u590F\u4ED9\u5148\u7EA4\u6380\u9C9C\u95F2\u5F26\u8D24\u54B8\u5ACC\u663E\u9669\u53BF\u73B0\u732E\u8178\u998F\u7EBF\u9650\u5BAA\u9677\u4E61\u76F8\u9999\u7BB1\u6E58\u8BE6\u60F3\u4EAB\u54CD\u9879\u5DF7\u50CF\u6A61\u524A\u6D88\u5BB5\u9500\u5C0F\u6653\u5B5D\u6548\u6821\u7B11\u4E9B\u6B47\u874E\u978B\u534F\u659C\u80C1\u8C22\u82AF\u8F9B\u65B0\u4FE1\u5174\u661F\u5211\u5F62\u578B\u9192\u5E78\u59D3\u6027\u51F6\u5144\u80F8\u96C4\u718A\u4F11\u4FEE\u7F9E\u673D\u79C0\u7EE3\u8896\u865A\u9700\u5F90\u8BB8\u5E8F\u53D9\u755C\u7EED\u8F69\u5BA3\u60AC\u65CB\u9009\u7A74\u5B66\u96EA\u8840\u52CB\u718F\u5FAA\u5DE1\u8BE2\u5BFB\u8BAD\u8BAF\u8FC5"],
        ["Y", "\u538B\u9E26\u9E2D\u7259\u5440\u96C5\u4E9A\u54BD\u70DF\u6DF9\u5EF6\u4E25\u8A00\u5CA9\u6CBF\u54BD\u989C\u63A9\u773C\u6F14\u538C\u5BB4\u8273\u9A8C\u7130\u71D5\u592E\u6B83\u79E7\u6D0B\u9633\u4EF0\u517B\u6C27\u6837\u8170\u9080\u9065\u6447\u54AC\u836F\u8981\u8000\u6930\u7237\u4E5F\u51B6\u91CE\u9875\u4E1A\u53F6\u4E00\u4F0A\u8863\u4F9D\u4EEA\u5B9C\u59E8\u79FB\u9057\u7591\u5DF2\u4EE5\u4E59\u77E3\u8681\u6905\u4E49\u4EBF\u5FC6\u827A\u8BAE\u4EA6\u5F02\u5F79\u8BD1\u76CA\u6291\u6613\u75AB\u56E0\u9634\u97F3\u94F6\u5F15\u996E\u5370\u5E94\u82F1\u5A74\u9E70\u6A31\u8FCE\u76C8\u8747\u8425\u8424\u5F71\u6620\u54DF\u62E5\u6C38\u6CF3\u52C7\u6D8C\u7528\u4F18\u5E7D\u60A0\u5FE7\u5C24\u72B9\u7531\u6CB9\u6E38\u53CB\u6709\u53C8\u53F3\u5E7C\u8BF1\u4E8E\u4F59\u9C7C\u6109\u611A\u8206\u4E0E\u5B87\u96E8\u8BED\u7FBD\u7389\u80B2\u6D74\u9884\u57DF\u9047\u559D\u5BD3\u88D5\u8C6B\u5192\u5143\u5706\u539F\u6E90\u8FDC\u9662\u613F\u6028\u7F18\u7EA6\u8DC3\u6708\u8D8A\u4E91\u5300\u5141\u8FD0\u5B55\u8574\u915D"],
        ["Z", "\u624E\u6742\u707E\u683D\u54C9\u5BB0\u8F7D\u518D\u5728\u54B1\u6682\u8D5E\u8D43\u810F\u846C\u906D\u7CDF\u65E9\u67A3\u7076\u9020\u71E5\u8E81\u5219\u62E9\u6CFD\u8D23\u600E\u66FE\u589E\u8D60\u6E23\u624E\u7728\u70B8\u69A8\u5B85\u7A84\u6458\u658B\u503A\u5BE8\u6CBE\u77BB\u5C55\u5360\u6218\u7AD9\u7AE0\u5F70\u5F20\u6DA8\u638C\u4E08\u4ED7\u5E10\u8D26\u80C0\u969C\u62DB\u662D\u627E\u53EC\u8D75\u7167\u906E\u6298\u54F2\u8005\u8FD9\u6D59\u9488\u4FA6\u73CD\u771F\u8BCA\u6795\u9635\u632F\u9707\u9547\u4E89\u5F81\u6323\u7741\u6B63\u8BC1\u90D1\u6574\u653F\u75C7\u84B8\u4E4B\u652F\u829D\u679D\u77E5\u7EC7\u8102\u8718\u6267\u503C\u4F84\u5740\u6307\u81F3\u5FD7\u6CBB\u8D28\u7099\u79E9\u79D8\u81F4\u667A\u7F6E\u4E2D\u5FE0\u7EC8\u949F\u79CD\u80BF\u4F17\u91CD\u5DDE\u5468\u6D32\u7CA5\u76B1\u9AA4\u6731\u73E0\u682A\u86DB\u8BF8\u7AF9\u9010\u4E3B\u716E\u5631\u4F4F\u52A9\u6CE8\u9A7B\u67F1\u795D\u8457\u7B51\u6293\u722A\u4E13\u7816\u8F6C\u5E84\u88C5\u5986\u58EE\u72B6\u649E\u8FFD\u5760\u7F00\u51C6\u6349\u684C\u707C\u8301\u7740\u4ED4\u5179\u8D44\u7D2B\u5B57\u81EA\u7EFC\u68D5\u8E2A\u5B97\u603B\u7EB5\u8D70\u594F\u79DF\u8DB3\u65CF\u7956\u963B\u7EC4\u94BB\u5634\u9189\u6700\u7F6A\u5C0A\u9075\u6628\u5DE6\u4F50\u4F5C\u5750\u505A\u5EA7"]
    ];
    for (var gi = 0; gi < g.length; gi++) {
        var init = g[gi][0];
        var chars = g[gi][1];
        for (var ci = 0; ci < chars.length; ci++) {
            _pyMap[chars.charAt(ci)] = init;
        }
    }
})();

function hasChinese(s) {
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 0x4E00 && c <= 0x9FFF) return true;
    }
    return false;
}

function toPinyinInitials(s) {
    var r = "";
    for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        var code = s.charCodeAt(i);
        if (_pyMap[ch]) {
            r += _pyMap[ch];
        } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            r += ch;
        } else if (code >= 48 && code <= 57) {
            r += ch;
        } else if (ch === '_' || ch === '-') {
            r += ch;
        }
    }
    return r;
}

function convertSegment(name) {
    if (hasChinese(name)) return toPinyinInitials(name);
    return name;
}

function buildExportName(psdPrefix, layerName) {
    return psdPrefix + "_" + convertSegment(layerName);
}

// ===========================
// 导出单个图层/组为 PNG（含去重）
// ===========================
function savePNG(doc, layer, path, relPath) {
    try {
        var b = layer.bounds;
        if (parseFloat(b[2]) - parseFloat(b[0]) <= 0) return false;
        if (parseFloat(b[3]) - parseFloat(b[1]) <= 0) return false;

        var tmp = app.documents.add(doc.width, doc.height, doc.resolution,
            "__t__", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

        app.activeDocument = doc;
        doc.activeLayer = layer;
        layer.duplicate(tmp, ElementPlacement.INSIDE);

        app.activeDocument = tmp;
        tmp.mergeVisibleLayers();
        try { tmp.trim(TrimType.TRANSPARENT); } catch (e) {
            tmp.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = doc;
            return false;
        }

        var tw = Math.round(parseFloat(tmp.width));
        var th = Math.round(parseFloat(tmp.height));

        var fp = getDocFingerprint(tmp);
        if (dedupMap[fp]) {
            tmp.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = doc;
            stat.dedup++;
            var prev = dedupMap[fp];
            return { ok: true, width: tw, height: th, relPath: prev.relPath };
        }

        var f = new File(path);
        var o = new PNGSaveOptions();
        o.interlaced = false;
        tmp.saveAs(f, o, true, Extension.LOWERCASE);

        dedupMap[fp] = { relPath: relPath };

        tmp.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;
        return { ok: true, width: tw, height: th, relPath: relPath };
    } catch (e) {
        try {
            for (var i = 0; i < app.documents.length; i++) {
                var dn = app.documents[i].name;
                if (dn === "__t__") {
                    app.documents[i].close(SaveOptions.DONOTSAVECHANGES);
                }
            }
            app.activeDocument = doc;
        } catch (e2) {}
        return false;
    }
}

// ===========================
// bounds 和 textInfo
// ===========================
function getBounds(ly) {
    var b = ly.bounds;
    var l = Math.round(parseFloat(b[0])), t = Math.round(parseFloat(b[1]));
    return { left: l, top: t,
             width: Math.round(parseFloat(b[2])) - l,
             height: Math.round(parseFloat(b[3])) - t };
}

function textInfo(ly) {
    var r = { textContents: "", textFont: "Arial", textSize: 14,
              textColor: { red: 0, green: 0, blue: 0 } };
    try {
        var t = ly.textItem;
        r.textContents = t.contents;
        try { r.textFont = t.font; } catch (e) {}
        try { r.textSize = Math.round(parseFloat(t.size)); } catch (e) {}
        try {
            var c = t.color.rgb;
            r.textColor = { red: Math.round(c.red), green: Math.round(c.green), blue: Math.round(c.blue) };
        } catch (e) {}
    } catch (e) {}
    return r;
}

// ===========================
// 文件名去重
// ===========================
var usedNames = {};
function uniqueName(fp) {
    if (!usedNames[fp]) { usedNames[fp] = 1; return fp; }
    usedNames[fp]++;
    return fp + "_" + usedNames[fp];
}

// ===========================
// 遍历 + 导出 + 构建 JSON
// ===========================
function walk(doc, layers, parent, assetsDir, psdPrefix) {
    var out = [];
    for (var i = 0; i < layers.length; i++) {
        try {
            var ly = layers[i];
            if (!ly.visible) continue;
            var nm  = ly.name;
            var rel = parent ? (parent + "/" + nm) : nm;
            var bd  = getBounds(ly);

            if (ly.typename === "LayerSet") {
                if (ly.layers.length === 0) { stat.skip++; continue; }
                var sub = walk(doc, ly.layers, rel, assetsDir, psdPrefix);
                out.push({ name: nm, type: "group", options: {},
                    offset: { left: bd.left, top: bd.top },
                    size: { width: bd.width, height: bd.height },
                    relativePath: rel, children: sub });
            } else if (ly.typename === "ArtLayer") {
                if (isText(ly)) {
                    var ti = textInfo(ly);
                    if (bd.width <= 0 && bd.height <= 0 && ti.textContents === "") {
                        stat.skip++; continue;
                    }
                    out.push({ name: nm, type: "text",
                        options: {
                            textContents: ti.textContents,
                            textFont: ti.textFont,
                            textSize: ti.textSize,
                            textColor: ti.textColor
                        },
                        offset: { left: bd.left, top: bd.top },
                        size: { width: bd.width, height: bd.height },
                        relativePath: rel, children: [] });
                    stat.text++;
                } else {
                    if (shouldSkip(doc, ly)) { stat.skip++; continue; }
                    var fp2 = uniqueName(buildExportName(psdPrefix, nm));
                    var res2 = savePNG(doc, ly, assetsDir + "/" + fp2 + ".png", fp2);
                    if (res2) {
                        stat.png++;
                        out.push({ name: nm, type: "png", options: {},
                            offset: { left: bd.left, top: bd.top },
                            size: { width: res2.width, height: res2.height },
                            relativePath: res2.relPath, children: [] });
                    } else { stat.skip++; }
                }
            }
        } catch (e) { stat.skip++; }
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
    var psdPrefix  = convertSegment(rawPsdName);   // 中文→拼音首字母

    // 从 PSD 目录反推 Client 根目录：assets/asset-art/psd → 向上 3 级
    var clientRoot = new Folder(psdFolder).parent.parent.parent.fsName;

    // PNG 输出目录
    var assetsDir = clientRoot + "/assets/asset-art/atlas/" + psdPrefix;
    // JSON 输出目录
    var jsonDir   = psdFolder + "/tool/" + psdPrefix;
    var jsonPath  = jsonDir + "/" + psdPrefix + "-structure.json";

    ensureFolder(assetsDir);
    ensureFolder(jsonDir);

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

    } catch (e) {
        alert("导出出错: " + e.message + "\n行: " + e.line);
    }

    // ④ 恢复 PSD
    try { doc.activeHistoryState = savedHistory; } catch (e) {}

    app.preferences.rulerUnits = savedUnits;

    var m = "Psd2CCC Digest 完成！\n\n";
    m += "导出PNG: " + stat.png + "  文字: " + stat.text + "\n";
    if (stat.dedup > 0) m += "去重: " + stat.dedup + " 个重复PNG已合并引用\n";
    if (stat.raster > 0) m += "栅格化: " + stat.raster + " 个特殊图层（已自动恢复）\n";
    if (stat.skip > 0) m += "跳过: " + stat.skip + "\n";
    m += "\nPNG: " + assetsDir;
    m += "\nJSON: " + jsonPath;
    alert(m);
}

main();

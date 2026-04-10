"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLegacyPsdPrefix = getLegacyPsdPrefix;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let cachedLegacyPinyinMap = null;
function sanitizeFileName(input) {
    return input
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/\.+$/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function loadLegacyPinyinMap(projectPath) {
    if (cachedLegacyPinyinMap)
        return cachedLegacyPinyinMap;
    const result = new Map();
    const legacyScriptPath = path_1.default.join(projectPath, 'tools', 'psd', 'Psd2CCC-Digest.jsx');
    if (!fs_1.default.existsSync(legacyScriptPath)) {
        cachedLegacyPinyinMap = result;
        return result;
    }
    try {
        const script = fs_1.default.readFileSync(legacyScriptPath, 'utf8');
        const match = script.match(/var g = (\[[\s\S]*?\]);/);
        if (!match) {
            cachedLegacyPinyinMap = result;
            return result;
        }
        const groups = Function(`return ${match[1]};`)();
        for (const [initial, chars] of groups) {
            for (const ch of chars) {
                result.set(ch, initial);
            }
        }
    }
    catch (error) {
        console.warn('[PSD2CCC] Failed to load legacy pinyin map:', error);
    }
    cachedLegacyPinyinMap = result;
    return result;
}
function hasChinese(input) {
    for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        if (code >= 0x4E00 && code <= 0x9FFF)
            return true;
    }
    return false;
}
function toPinyinInitials(input, pinyinMap) {
    let output = '';
    for (let i = 0; i < input.length; i++) {
        const ch = input.charAt(i);
        const code = input.charCodeAt(i);
        if (pinyinMap.has(ch)) {
            output += pinyinMap.get(ch);
        }
        else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            output += ch;
        }
        else if (code >= 48 && code <= 57) {
            output += ch;
        }
        else if (ch === '_' || ch === '-') {
            output += ch;
        }
    }
    return output;
}
function getLegacyPsdPrefix(projectPath, rawPsdName) {
    const pinyinMap = loadLegacyPinyinMap(projectPath);
    const converted = hasChinese(rawPsdName) ? toPinyinInitials(rawPsdName, pinyinMap) : rawPsdName;
    return sanitizeFileName(converted) || 'psd';
}
//# sourceMappingURL=psd-legacy.js.map
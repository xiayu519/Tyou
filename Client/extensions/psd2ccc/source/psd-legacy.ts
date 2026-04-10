import fs from 'fs';
import path from 'path';

let cachedLegacyPinyinMap: Map<string, string> | null = null;

function sanitizeFileName(input: string): string {
    return input
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/\.+$/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function loadLegacyPinyinMap(projectPath: string): Map<string, string> {
    if (cachedLegacyPinyinMap) return cachedLegacyPinyinMap;

    const result = new Map<string, string>();
    const legacyScriptPath = path.join(projectPath, 'tools', 'psd', 'Psd2CCC-Digest.jsx');
    if (!fs.existsSync(legacyScriptPath)) {
        cachedLegacyPinyinMap = result;
        return result;
    }

    try {
        const script = fs.readFileSync(legacyScriptPath, 'utf8');
        const match = script.match(/var g = (\[[\s\S]*?\]);/);
        if (!match) {
            cachedLegacyPinyinMap = result;
            return result;
        }

        const groups = Function(`return ${match[1]};`)() as Array<[string, string]>;
        for (const [initial, chars] of groups) {
            for (const ch of chars) {
                result.set(ch, initial);
            }
        }
    } catch (error) {
        console.warn('[PSD2CCC] Failed to load legacy pinyin map:', error);
    }

    cachedLegacyPinyinMap = result;
    return result;
}

function hasChinese(input: string): boolean {
    for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        if (code >= 0x4E00 && code <= 0x9FFF) return true;
    }
    return false;
}

function toPinyinInitials(input: string, pinyinMap: Map<string, string>): string {
    let output = '';
    for (let i = 0; i < input.length; i++) {
        const ch = input.charAt(i);
        const code = input.charCodeAt(i);
        if (pinyinMap.has(ch)) {
            output += pinyinMap.get(ch);
        } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            output += ch;
        } else if (code >= 48 && code <= 57) {
            output += ch;
        } else if (ch === '_' || ch === '-') {
            output += ch;
        }
    }
    return output;
}

export function getLegacyPsdPrefix(projectPath: string, rawPsdName: string): string {
    const pinyinMap = loadLegacyPinyinMap(projectPath);
    const converted = hasChinese(rawPsdName) ? toPinyinInitials(rawPsdName, pinyinMap) : rawPsdName;
    return sanitizeFileName(converted) || 'psd';
}

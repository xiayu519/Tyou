"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLegacyPsdPrefix = void 0;
function sanitizeFileName(input) {
    return String(input || '')
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
        .replace(/[. ]+$/g, '');
}
function getLegacyPsdPrefix(projectPath, rawPsdName) {
    void projectPath;
    return sanitizeFileName(rawPsdName) || 'psd';
}
exports.getLegacyPsdPrefix = getLegacyPsdPrefix;
//# sourceMappingURL=psd-legacy.js.map
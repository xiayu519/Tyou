function sanitizeFileName(input: string): string {
    return String(input || '')
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
        .replace(/[. ]+$/g, '');
}

export function getLegacyPsdPrefix(projectPath: string, rawPsdName: string): string {
    void projectPath;
    return sanitizeFileName(rawPsdName) || 'psd';
}

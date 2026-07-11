const EXTENSION_NAME = 'asset-dependency-viewer';
const ENABLED_KEY = 'enabled';

export async function readEnabledState(): Promise<boolean | null> {
    try {
        const value = await Editor.Profile.getProject(
            EXTENSION_NAME,
            ENABLED_KEY,
            'project',
        );
        return typeof value === 'boolean' ? value : null;
    } catch (error: any) {
        console.warn('[AssetDependencyViewer] enabled state read failed:', error?.message || error);
        return false;
    }
}

export async function writeEnabledState(enabled: boolean): Promise<void> {
    await Editor.Profile.setProject(
        EXTENSION_NAME,
        ENABLED_KEY,
        enabled,
        'project',
    );
}

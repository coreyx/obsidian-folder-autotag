export interface PluginSettings {
    /**
     * Enable
     */
    enabled: boolean
    /**
     * Automatic-tagging rules, keyed by vault-relative folder path.
     */
    folderTagRules: Record<string, string[]>
    /**
     * Whether to ignore notes matching the folder name, keyed by vault-relative folder path.
     */
    folderIgnoreFolderNotes: Record<string, boolean>
}

export const DEFAULT_SETTINGS: PluginSettings = {
    enabled: false,
    folderTagRules: {},
    folderIgnoreFolderNotes: {}
}

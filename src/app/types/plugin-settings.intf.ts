export interface PluginSettings {
    /**
     * Enable
     */
    enabled: boolean
    /**
     * Automatic-tagging rules, keyed by vault-relative folder path.
     */
    folderTagRules: Record<string, string[]>
}

export const DEFAULT_SETTINGS: PluginSettings = {
    enabled: false,
    folderTagRules: {}
}

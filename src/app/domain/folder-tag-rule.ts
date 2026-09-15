/** A folder's automatic-tagging rule: the tags newly added notes in it should receive. */
export interface FolderTagRule {
    /** Vault-relative folder path; also the storage key in `PluginSettings.folderTagRules`. */
    folderPath: string
    /** Normalized tags (no leading '#', trimmed, de-duplicated), in first-occurrence order. */
    tags: string[]
    /** Whether automatic tagging should ignore notes matching the folder name. */
    ignoreFolderNotes?: boolean
}

const stripLeadingHash = (tag: string): string => (tag.startsWith('#') ? tag.slice(1) : tag)

/**
 * Strips a leading '#', trims whitespace, drops empty entries, and de-duplicates
 * case-sensitively (Obsidian itself does not fold tag case), preserving the order
 * of first occurrence.
 */
export const normalizeTags = (input: string[]): string[] => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const raw of input) {
        const tag = stripLeadingHash(raw.trim())
        if (tag.length === 0 || seen.has(tag)) {
            continue
        }
        seen.add(tag)
        result.push(tag)
    }
    return result
}

/** Parses a modal text field's raw value (comma- or newline-separated tags) into a tag list. */
export const parseTagInput = (raw: string): string[] => normalizeTags(raw.split(/[,\n]/))

/**
 * Determines whether a file is a folder note for the specified folder.
 * Matches structurally so callers and tests do not require real Obsidian
 * TFile / TFolder instances.
 */
export const isFolderNote = (
    file: { basename: string; parent: { path: string } | null },
    folder: { name: string; path: string }
): boolean => {
    if (file.parent === null) {
        return false
    }
    return file.parent.path === folder.path && file.basename === folder.name
}

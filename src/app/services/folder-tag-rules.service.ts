import type { Draft } from 'immer'
import { normalizeTags } from '../domain/folder-tag-rule'
import type { PluginSettings } from '../types/plugin-settings.intf'

/**
 * The slice of `FolderAutotagPlugin` this service needs. A structural interface
 * (rather than depending on the concrete plugin class) so tests can pass a
 * minimal fake `{ settings, updateSettings }` instead of a real Obsidian plugin.
 */
export interface FolderTagRulesHost {
    settings: PluginSettings
    updateSettings(mutator: (draft: Draft<PluginSettings>) => void): Promise<void>
}

/** Owns the folder-path -> tags mapping backing automatic tagging. */
export class FolderTagRulesService {
    constructor(private readonly host: FolderTagRulesHost) {}

    /** The configured tags for a folder, or undefined if it has no rule. */
    getRule(folderPath: string): string[] | undefined {
        return this.host.settings.folderTagRules[folderPath]
    }

    /**
     * Sets a folder's rule. An empty (or entirely blank) tag list removes the
     * rule instead of persisting an empty array — a folder with zero tags
     * configured has no rule.
     */
    async setRule(folderPath: string, tags: string[]): Promise<void> {
        const normalized = normalizeTags(tags)
        if (normalized.length === 0) {
            await this.removeRule(folderPath)
            return
        }
        await this.host.updateSettings((draft) => {
            draft.folderTagRules[folderPath] = normalized
        })
    }

    /** No-op if the folder has no rule. */
    async removeRule(folderPath: string): Promise<void> {
        if (!(folderPath in this.host.settings.folderTagRules)) {
            return
        }
        await this.host.updateSettings((draft) => {
            delete draft.folderTagRules[folderPath]
        })
    }

    /** Moves a folder's rule to its new path after a rename. No-op if it had none. */
    async handleFolderRenamed(oldPath: string, newPath: string): Promise<void> {
        if (!(oldPath in this.host.settings.folderTagRules)) {
            return
        }
        await this.host.updateSettings((draft) => {
            const rule = draft.folderTagRules[oldPath]
            if (rule === undefined) {
                return
            }
            draft.folderTagRules[newPath] = rule
            delete draft.folderTagRules[oldPath]
        })
    }

    /** Drops a deleted folder's rule. No-op if it had none. */
    async handleFolderDeleted(folderPath: string): Promise<void> {
        await this.removeRule(folderPath)
    }
}

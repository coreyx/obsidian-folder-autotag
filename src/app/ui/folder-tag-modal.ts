import { Modal, Setting } from 'obsidian'
import type { App, TFolder } from 'obsidian'
import type { FolderAutotagPlugin } from '../plugin'
import { parseTagInput } from '../domain/folder-tag-rule'
import { applyRuleToExistingNotes } from '../services/auto-tag.service'

/** Lets the user view and edit a folder's automatic-tagging rule. */
export class FolderTagModal extends Modal {
    private readonly plugin: FolderAutotagPlugin
    private readonly folder: TFolder
    private value: string

    constructor(app: App, plugin: FolderAutotagPlugin, folder: TFolder) {
        super(app)
        this.plugin = plugin
        this.folder = folder
        this.value = (plugin.folderTagRulesService.getRule(folder.path) ?? []).join(', ')
    }

    override onOpen(): void {
        this.setTitle(`Set Auto-Tag — ${this.folder.path}`)

        new Setting(this.contentEl)
            .setName('Tags')
            .setDesc('Comma- or newline-separated. Leave empty to remove this rule.')
            .addTextArea((text) => {
                text.setValue(this.value).onChange((value) => {
                    this.value = value
                })
            })

        new Setting(this.contentEl)
            .addButton((button) =>
                button
                    .setButtonText('Save')
                    .setCta()
                    .onClick(async () => {
                        const tags = parseTagInput(this.value)
                        await this.plugin.folderTagRulesService.setRule(this.folder.path, tags)
                        // Additive-only: only a saved (non-empty) rule retroactively tags
                        // existing notes. Clearing the rule must not touch any note's tags.
                        if (tags.length > 0) {
                            await applyRuleToExistingNotes(
                                this.plugin.app,
                                this.folder,
                                this.plugin.settings.folderTagRules
                            )
                        }
                        this.close()
                    })
            )
            .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
    }

    override onClose(): void {
        this.contentEl.empty()
    }
}

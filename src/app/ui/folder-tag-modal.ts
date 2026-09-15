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
    private ignoreFolderNotes: boolean

    constructor(app: App, plugin: FolderAutotagPlugin, folder: TFolder) {
        super(app)
        this.plugin = plugin
        this.folder = folder
        this.value = (plugin.folderTagRulesService.getRule(folder.path) ?? []).join(', ')
        this.ignoreFolderNotes = plugin.folderTagRulesService.getIgnoreFolderNotes(folder.path)
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
            .setName('Ignore folder notes')
            .setDesc(
                'Do not apply this folder’s automatic tags to a note matching the folder name.'
            )
            .addToggle((toggle) => {
                toggle.setValue(this.ignoreFolderNotes).onChange((value) => {
                    this.ignoreFolderNotes = value
                })
            })

        new Setting(this.contentEl)
            .addButton((button) =>
                button
                    .setButtonText('Save')
                    .setCta()
                    .onClick(async () => {
                        const tags = parseTagInput(this.value)
                        await this.plugin.folderTagRulesService.setRule(
                            this.folder.path,
                            tags,
                            this.ignoreFolderNotes
                        )
                        // Additive-only: only a saved (non-empty) rule retroactively tags
                        // existing notes. Clearing the rule must not touch any note's tags.
                        if (tags.length > 0) {
                            await applyRuleToExistingNotes(
                                this.plugin.app,
                                this.folder,
                                this.plugin.settings.folderTagRules,
                                this.plugin.settings.folderIgnoreFolderNotes
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

import { TFolder } from 'obsidian'
import type { FolderAutotagPlugin } from '../plugin'
import { FolderTagModal } from '../ui/folder-tag-modal'

/** Adds a "Set Auto-Tag" item to a folder's context menu, opening its configuration modal. */
export function registerFolderContextMenu(plugin: FolderAutotagPlugin): void {
    plugin.registerEvent(
        plugin.app.workspace.on('file-menu', (menu, file) => {
            if (!(file instanceof TFolder)) {
                return
            }
            menu.addItem((item) =>
                item
                    .setTitle('Set Auto-Tag')
                    .setIcon('tag')
                    .onClick(() => new FolderTagModal(plugin.app, plugin, file).open())
            )
        })
    )
}

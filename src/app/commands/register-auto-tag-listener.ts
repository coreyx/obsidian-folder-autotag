import { TFile } from 'obsidian'
import type { FolderAutotagPlugin } from '../plugin'
import { applyFolderTags } from '../services/auto-tag.service'

/** The vault-relative path of the folder containing `path`, or '' for the vault root. */
export const getParentPath = (path: string): string => {
    const idx = path.lastIndexOf('/')
    return idx === -1 ? '' : path.slice(0, idx)
}

/**
 * Tags a note per its folder's rule the moment it's added there — either by
 * being newly created, or by being moved/dragged in from elsewhere.
 *
 * All paths funnel through one `pending` set of file paths awaiting a
 * resolved `CachedMetadata`, and one `tryApply` that resolves a pending path
 * as soon as a cache is available for it — the different events below only
 * differ in when they add a path to `pending` and when they re-check it.
 *
 * - `create` (gated behind `onLayoutReady`, so it never fires for files
 *   already in the vault at load time — see "Startup event ordering" in
 *   `spec/design.md`) marks a new markdown file pending; `metadataCache`'s
 *   `changed` event is what resolves it, once Obsidian has actually indexed
 *   the file's content.
 * - `rename` marks a markdown file pending when it moved into a different
 *   folder (a plain in-place rename is ignored, so a note predating its
 *   folder's rule is never retroactively tagged). A move is a `rename` event
 *   with a changed path, not a `create` — Obsidian never fires `create` for
 *   it — so it needs its own listener; unlike `create`, `rename` never fires
 *   for the vault's pre-existing files during initial load, so no
 *   `onLayoutReady` gate is needed here.
 *
 *   The obvious assumption — a moved file already existed, so its cache
 *   should already be resolved and readable synchronously via `getFileCache`
 *   right in the `rename` handler — does not hold in practice: manual testing
 *   showed `getFileCache` returning `null` immediately after a move, in both
 *   directions. `metadataCache`'s `changed` event is documented to never fire
 *   for a rename ("not called when a file is renamed, for performance
 *   reasons"), so it can't be the fallback here the way it is for `create`.
 *   Instead, a still-pending path is retried on `metadataCache`'s `resolve`
 *   event (fires per file, "sometimes after a file has been indexed" — not
 *   guaranteed, but free when it happens) and, as a guaranteed backstop, on
 *   `resolved` (fires globally "each time files get modified after the
 *   initial load" — unconditional, per its own doc comment), which re-checks
 *   every path still in `pending`.
 */
export function registerAutoTagListener(plugin: FolderAutotagPlugin): void {
    const pending = new Set<string>()
    plugin.register(() => pending.clear())

    /** Applies tags if `file`'s cache is resolved, and un-marks it pending either way. */
    const tryApply = (file: TFile): void => {
        const cache = plugin.app.metadataCache.getFileCache(file)
        if (cache === null) {
            return
        }
        pending.delete(file.path)
        void applyFolderTags(
            plugin.app,
            file,
            cache,
            plugin.settings.folderTagRules,
            plugin.settings.folderIgnoreFolderNotes
        )
    }

    plugin.app.workspace.onLayoutReady(() => {
        plugin.registerEvent(
            plugin.app.vault.on('create', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    pending.add(file.path)
                }
            })
        )
        plugin.registerEvent(
            plugin.app.metadataCache.on('changed', (file) => {
                if (pending.has(file.path)) {
                    tryApply(file)
                }
            })
        )
    })

    plugin.registerEvent(
        plugin.app.vault.on('rename', (file, oldPath) => {
            if (!(file instanceof TFile) || file.extension !== 'md') {
                return
            }
            if (getParentPath(oldPath) === getParentPath(file.path)) {
                return // renamed in place, not moved between folders
            }
            pending.add(file.path)
            tryApply(file)
        })
    )

    plugin.registerEvent(
        plugin.app.metadataCache.on('resolve', (file) => {
            if (pending.has(file.path)) {
                tryApply(file)
            }
        })
    )
    plugin.registerEvent(
        plugin.app.metadataCache.on('resolved', () => {
            for (const path of pending) {
                const file = plugin.app.vault.getFileByPath(path)
                if (file !== null) {
                    tryApply(file)
                }
            }
        })
    )
}

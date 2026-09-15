import type { CachedMetadata, FileManager, MetadataCache } from 'obsidian'
import { TFile, TFolder, getAllTags, parseFrontMatterTags } from 'obsidian'
import { isFolderNote, normalizeTags } from '../domain/folder-tag-rule'

/**
 * The slice of `App` this needs. A structural interface (rather than the full
 * `App` class) so tests can pass a bare `{ fileManager: { processFrontMatter } }`
 * fake instead of standing up a real Obsidian `App`.
 */
export interface AutoTagHost {
    fileManager: Pick<FileManager, 'processFrontMatter'>
}

/** `AutoTagHost` plus what's needed to look up a file's cache and walk a folder's contents. */
export interface RetagHost extends AutoTagHost {
    metadataCache: Pick<MetadataCache, 'getFileCache'>
}

/**
 * Combines the configured tags for `file` across its folder and all ancestors up to
 * the vault root, root-first, omitting any folder rule whose 'ignoreFolderNotes'
 * setting is enabled if `file` is that folder's direct folder note. A folder with
 * no rule simply contributes nothing; there's no "nearest wins" shadowing — every
 * configured level along the chain applies.
 */
export const collectApplicableTags = (
    file: TFile,
    rules: Record<string, string[]>,
    ignoreFolderNotes: Record<string, boolean> = {}
): string[] => {
    if (file.parent === null) {
        return []
    }

    const chain: TFolder[] = []
    let current: TFolder | null = file.parent
    while (current !== null) {
        chain.push(current)
        current = current.parent
    }

    const combined: string[] = []
    for (const ancestor of chain.reverse()) {
        const rule = rules[ancestor.path]
        if (rule === undefined) {
            continue
        }

        const shouldIgnore =
            (ignoreFolderNotes[ancestor.path] ?? false) && isFolderNote(file, ancestor)

        if (!shouldIgnore) {
            combined.push(...rule)
        }
    }
    return combined
}

/**
 * Applies a note's folder's configured tags — combined with every ancestor
 * folder's tags, all the way up to the vault root (see
 * `spec/design.md`'s "Subfolder inheritance") — skipping any tag the note
 * already has, checked against `cache`, which unifies frontmatter and inline
 * tags (see `spec/design.md`'s "Why not Dataview"). When a folder has
 * 'ignoreFolderNotes' enabled, notes matching that folder's name do not receive
 * tags from that folder's rule. No-ops if neither the folder nor any ancestor
 * has a rule, or if every configured tag is already present.
 */
export async function applyFolderTags(
    app: AutoTagHost,
    file: TFile,
    cache: CachedMetadata,
    rules: Record<string, string[]>,
    ignoreFolderNotes: Record<string, boolean> = {}
): Promise<void> {
    if (file.parent === null) {
        return
    }

    const configured = normalizeTags(collectApplicableTags(file, rules, ignoreFolderNotes))
    if (configured.length === 0) {
        return
    }

    const existing = normalizeTags(getAllTags(cache) ?? [])
    const toAdd = configured.filter((tag) => !existing.includes(tag))
    if (toAdd.length === 0) {
        return
    }

    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        // `parseFrontMatterTags` may hand tags back with a leading '#' (it
        // shares that convention with `getAllTags`); normalize before writing
        // so the array we persist is always the bare form, never a mix of
        // both, regardless of what shape the frontmatter had going in.
        const currentTags = normalizeTags(parseFrontMatterTags(frontmatter) ?? [])
        frontmatter['tags'] = [...currentTags, ...toAdd]
    })
}

/** Every markdown file under `folder`, at any depth. */
const collectMarkdownFiles = (folder: TFolder): TFile[] => {
    const files: TFile[] = []
    for (const child of folder.children) {
        if (child instanceof TFolder) {
            files.push(...collectMarkdownFiles(child))
        } else if (child instanceof TFile && child.extension === 'md') {
            files.push(child)
        }
    }
    return files
}

/**
 * Retroactively applies a folder's (just-saved) rule to every markdown note
 * already inside it, at any depth — each note's effective tags are
 * recomputed exactly as `applyFolderTags` would for a freshly created note,
 * so a note in a subfolder correctly picks up `folder`'s rule alongside its
 * own folder's, and a note that already has all its configured tags is
 * untouched. Only called for a non-empty rule (see `spec/design.md`'s
 * "Retroactive apply on save" for why an edited-to-empty/removed rule must
 * not reach here — additive-only tagging never removes a tag).
 */
export async function applyRuleToExistingNotes(
    host: RetagHost,
    folder: TFolder,
    rules: Record<string, string[]>,
    ignoreFolderNotes: Record<string, boolean> = {}
): Promise<void> {
    for (const file of collectMarkdownFiles(folder)) {
        const cache = host.metadataCache.getFileCache(file)
        if (cache !== null) {
            await applyFolderTags(host, file, cache, rules, ignoreFolderNotes)
        }
    }
}

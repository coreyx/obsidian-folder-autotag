import { describe, expect, mock, test } from 'bun:test'
import { TFile, TFolder } from 'obsidian'
import type { CachedMetadata, Pos, TAbstractFile, TagCache } from 'obsidian'
import type { AutoTagHost, RetagHost } from './auto-tag.service'
import { applyFolderTags, applyRuleToExistingNotes } from './auto-tag.service'

const POS: Pos = { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } }

/** Builds a full TFolder chain for `folderPath` (each segment's `.parent` set to the one above). */
const makeFolderChain = (folderPath: string): TFolder => {
    const segments = folderPath.split('/')
    let folder: TFolder | null = null
    for (let i = 0; i < segments.length; i++) {
        const next = new TFolder()
        next.path = segments.slice(0, i + 1).join('/')
        next.name = segments[i]!
        next.parent = folder
        folder = next
    }
    if (folder === null) {
        throw new Error('folderPath must not be empty')
    }
    return folder
}

const makeFile = (path: string, folderPath: string | null): TFile => {
    const file = new TFile()
    file.path = path
    file.basename = path.split('/').pop()?.replace(/\.md$/, '') ?? ''
    if (folderPath !== null) {
        file.parent = makeFolderChain(folderPath)
    }
    return file
}

const makeCache = (opts: {
    frontmatterTags?: string[] | string
    inlineTags?: string[]
}): CachedMetadata => {
    const tags: TagCache[] = (opts.inlineTags ?? []).map((tag) => ({ tag, position: POS }))
    return {
        frontmatter:
            opts.frontmatterTags === undefined ? undefined : { tags: opts.frontmatterTags },
        tags
    }
}

/**
 * `initialFrontmatter` is the note's on-disk frontmatter `processFrontMatter`
 * would hand to its callback — keep it matching whatever `makeCache`'s
 * `frontmatterTags` says is already there, the same way a real note's cache
 * and on-disk content agree.
 */
const makeHost = (
    initialFrontmatter: Record<string, unknown> = {}
): { host: AutoTagHost; frontmatterWrites: Record<string, unknown>[] } => {
    const frontmatterWrites: Record<string, unknown>[] = []
    const processFrontMatter = mock(
        async (_file: TFile, fn: (frontmatter: Record<string, unknown>) => void) => {
            const frontmatter: Record<string, unknown> = { ...initialFrontmatter }
            fn(frontmatter)
            frontmatterWrites.push(frontmatter)
        }
    )
    return { host: { fileManager: { processFrontMatter } }, frontmatterWrites }
}

describe('applyFolderTags', () => {
    test('a note with no existing tags gets exactly the configured tags', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Projects/Work/note.md', 'Projects/Work')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { 'Projects/Work': ['work', 'urgent'] })

        expect(frontmatterWrites).toEqual([{ tags: ['work', 'urgent'] }])
    })

    test('a tag already present in frontmatter is not duplicated', async () => {
        const { host, frontmatterWrites } = makeHost({ tags: ['work'] })
        const file = makeFile('Projects/Work/note.md', 'Projects/Work')
        const cache = makeCache({ frontmatterTags: ['work'] })

        await applyFolderTags(host, file, cache, { 'Projects/Work': ['work', 'urgent'] })

        expect(frontmatterWrites).toEqual([{ tags: ['work', 'urgent'] }])
    })

    test('a tag already present only as an inline body tag is not duplicated', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Projects/Work/note.md', 'Projects/Work')
        const cache = makeCache({ inlineTags: ['#work'] })

        await applyFolderTags(host, file, cache, { 'Projects/Work': ['work', 'urgent'] })

        expect(frontmatterWrites).toEqual([{ tags: ['urgent'] }])
    })

    test("a note's other frontmatter fields are left untouched", async () => {
        const file = makeFile('Projects/Work/note.md', 'Projects/Work')
        const cache = makeCache({})
        let observed: Record<string, unknown> | undefined
        const processFrontMatter = mock(
            async (_file: TFile, fn: (frontmatter: Record<string, unknown>) => void) => {
                const frontmatter: Record<string, unknown> = { aliases: ['Note'], custom: 42 }
                fn(frontmatter)
                observed = frontmatter
            }
        )
        const host: AutoTagHost = { fileManager: { processFrontMatter } }

        await applyFolderTags(host, file, cache, { 'Projects/Work': ['work'] })

        expect(observed).toEqual({ aliases: ['Note'], custom: 42, tags: ['work'] })
    })

    test('a folder with no rule is a no-op', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Inbox/note.md', 'Inbox')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { 'Projects/Work': ['work'] })

        expect(frontmatterWrites).toEqual([])
    })

    test('a rule that resolves to zero new tags is a no-op', async () => {
        const { host, frontmatterWrites } = makeHost({ tags: ['work'] })
        const file = makeFile('Projects/Work/note.md', 'Projects/Work')
        const cache = makeCache({ frontmatterTags: ['work'] })

        await applyFolderTags(host, file, cache, { 'Projects/Work': ['work'] })

        expect(frontmatterWrites).toEqual([])
    })

    test("a note in a subfolder inherits its ancestor's rule", async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Projects/Alpha/note.md', 'Projects/Alpha')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { Projects: ['work'] })

        expect(frontmatterWrites).toEqual([{ tags: ['work'] }])
    })

    test("a note's own folder rule is combined with its ancestor's, root tags first", async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Projects/Alpha/note.md', 'Projects/Alpha')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, {
            'Projects': ['work'],
            'Projects/Alpha': ['alpha']
        })

        expect(frontmatterWrites).toEqual([{ tags: ['work', 'alpha'] }])
    })

    test('rules from every level of a deep chain are all combined', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('A/B/C/note.md', 'A/B/C')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, {
            'A': ['a'],
            'A/B': ['b'],
            'A/B/C': ['c']
        })

        expect(frontmatterWrites).toEqual([{ tags: ['a', 'b', 'c'] }])
    })

    test('a duplicate tag across ancestor levels is not repeated', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Projects/Alpha/note.md', 'Projects/Alpha')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, {
            'Projects': ['work'],
            'Projects/Alpha': ['work', 'alpha']
        })

        expect(frontmatterWrites).toEqual([{ tags: ['work', 'alpha'] }])
    })

    test("a sibling branch's rule does not leak into an unrelated folder", async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Projects/Beta/note.md', 'Projects/Beta')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { 'Projects/Alpha': ['alpha'] })

        expect(frontmatterWrites).toEqual([])
    })

    test('a folder note does not receive tags when ignoreFolderNotes is enabled', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Games/Games.md', 'Games')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { Games: ['game'] }, { Games: true })

        expect(frontmatterWrites).toEqual([])
    })

    test('a normal note in the same folder receives tags when ignoreFolderNotes is enabled', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Games/diablo.md', 'Games')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { Games: ['game'] }, { Games: true })

        expect(frontmatterWrites).toEqual([{ tags: ['game'] }])
    })

    test('a folder note receives tags when ignoreFolderNotes is disabled or omitted', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Games/Games.md', 'Games')
        const cache = makeCache({})

        await applyFolderTags(host, file, cache, { Games: ['game'] }, { Games: false })

        expect(frontmatterWrites).toEqual([{ tags: ['game'] }])
    })

    test('subfolder note matching subfolder name skips subfolder tags but receives ancestor tags', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Games/RPG/RPG.md', 'Games/RPG')
        const cache = makeCache({})

        await applyFolderTags(
            host,
            file,
            cache,
            { 'Games': ['game'], 'Games/RPG': ['rpg'] },
            { 'Games': true, 'Games/RPG': true }
        )

        expect(frontmatterWrites).toEqual([{ tags: ['game'] }])
    })

    test('subfolder note matching ancestor name is not a direct folder note of ancestor and receives ancestor tags', async () => {
        const { host, frontmatterWrites } = makeHost()
        const file = makeFile('Games/RPG/Games.md', 'Games/RPG')
        const cache = makeCache({})

        await applyFolderTags(
            host,
            file,
            cache,
            { 'Games': ['game'], 'Games/RPG': ['rpg'] },
            { 'Games': true, 'Games/RPG': true }
        )

        expect(frontmatterWrites).toEqual([{ tags: ['game', 'rpg'] }])
    })
})

/** A folder tree spec: markdown files directly in it, and named subfolders. */
interface TreeSpec {
    files?: string[]
    folders?: Record<string, TreeSpec>
}

const buildTree = (path: string, spec: TreeSpec, parent: TFolder | null = null): TFolder => {
    const folder = new TFolder()
    folder.path = path
    folder.name = path.split('/').pop() ?? path
    folder.parent = parent

    const children: TAbstractFile[] = []
    for (const name of spec.files ?? []) {
        const file = new TFile()
        file.path = `${path}/${name}`
        file.extension = name.includes('.') ? (name.split('.').pop() ?? '') : ''
        file.basename = name.replace(/\.[^/.]+$/, '')
        file.parent = folder
        children.push(file)
    }
    for (const [name, childSpec] of Object.entries(spec.folders ?? {})) {
        children.push(buildTree(`${path}/${name}`, childSpec, folder))
    }
    folder.children = children
    return folder
}

describe('applyRuleToExistingNotes', () => {
    /** Builds a `RetagHost` where every note's cache is empty (no existing tags). */
    const makeRetagHost = (): {
        host: RetagHost
        writesByPath: Record<string, Record<string, unknown>>
    } => {
        const writesByPath: Record<string, Record<string, unknown>> = {}
        const processFrontMatter = mock(
            async (file: TFile, fn: (frontmatter: Record<string, unknown>) => void) => {
                const frontmatter: Record<string, unknown> = {}
                fn(frontmatter)
                writesByPath[file.path] = frontmatter
            }
        )
        const getFileCache = mock((_file: TFile): CachedMetadata | null => ({}))
        return {
            host: { fileManager: { processFrontMatter }, metadataCache: { getFileCache } },
            writesByPath
        }
    }

    test('tags every existing note directly in the folder', async () => {
        const { host, writesByPath } = makeRetagHost()
        const folder = buildTree('Projects', { files: ['a.md', 'b.md'] })

        await applyRuleToExistingNotes(host, folder, { Projects: ['work'] })

        expect(writesByPath).toEqual({
            'Projects/a.md': { tags: ['work'] },
            'Projects/b.md': { tags: ['work'] }
        })
    })

    test('tags existing notes nested in subfolders too', async () => {
        const { host, writesByPath } = makeRetagHost()
        const folder = buildTree('Projects', {
            files: ['a.md'],
            folders: { Alpha: { files: ['b.md'] } }
        })

        await applyRuleToExistingNotes(host, folder, { Projects: ['work'] })

        expect(writesByPath).toEqual({
            'Projects/a.md': { tags: ['work'] },
            'Projects/Alpha/b.md': { tags: ['work'] }
        })
    })

    test("a nested note's own folder rule combines with the ancestor rule just saved", async () => {
        const { host, writesByPath } = makeRetagHost()
        const folder = buildTree('Projects', { folders: { Alpha: { files: ['note.md'] } } })

        await applyRuleToExistingNotes(host, folder, {
            'Projects': ['work'],
            'Projects/Alpha': ['alpha']
        })

        expect(writesByPath).toEqual({ 'Projects/Alpha/note.md': { tags: ['work', 'alpha'] } })
    })

    test('a note that already has every configured tag is left untouched', async () => {
        const folder = buildTree('Projects', { files: ['a.md'] })
        const processFrontMatter = mock(async () => {})
        const getFileCache = mock(
            (): CachedMetadata => ({ frontmatter: { tags: ['work'] }, tags: [] })
        )
        const host: RetagHost = {
            fileManager: { processFrontMatter },
            metadataCache: { getFileCache }
        }

        await applyRuleToExistingNotes(host, folder, { Projects: ['work'] })

        expect(processFrontMatter).not.toHaveBeenCalled()
    })

    test('a non-markdown file in the tree is ignored', async () => {
        const { host, writesByPath } = makeRetagHost()
        const folder = buildTree('Projects', { files: ['a.md', 'attachment.png'] })

        await applyRuleToExistingNotes(host, folder, { Projects: ['work'] })

        expect(Object.keys(writesByPath)).toEqual(['Projects/a.md'])
    })

    test('a file with no resolved cache yet is skipped without throwing', async () => {
        const folder = buildTree('Projects', { files: ['unresolved.md', 'resolved.md'] })
        const processFrontMatter = mock(
            async (_file: TFile, fn: (frontmatter: Record<string, unknown>) => void) => {
                fn({})
            }
        )
        const getFileCache = mock((file: TFile): CachedMetadata | null =>
            file.path === 'Projects/unresolved.md' ? null : {}
        )
        const host: RetagHost = {
            fileManager: { processFrontMatter },
            metadataCache: { getFileCache }
        }

        await applyRuleToExistingNotes(host, folder, { Projects: ['work'] })

        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })

    test('retroactively skips existing folder notes when ignoreFolderNotes is enabled', async () => {
        const { host, writesByPath } = makeRetagHost()
        const folder = buildTree('Games', { files: ['Games.md', 'diablo.md'] })

        await applyRuleToExistingNotes(host, folder, { Games: ['game'] }, { Games: true })

        expect(writesByPath).toEqual({
            'Games/diablo.md': { tags: ['game'] }
        })
    })

    test('retroactively tags existing folder notes when ignoreFolderNotes is disabled', async () => {
        const { host, writesByPath } = makeRetagHost()
        const folder = buildTree('Games', { files: ['Games.md', 'diablo.md'] })

        await applyRuleToExistingNotes(host, folder, { Games: ['game'] }, { Games: false })

        expect(writesByPath).toEqual({
            'Games/Games.md': { tags: ['game'] },
            'Games/diablo.md': { tags: ['game'] }
        })
    })
})

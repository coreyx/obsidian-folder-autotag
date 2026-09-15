import { describe, expect, test } from 'bun:test'
import { isFolderNote, normalizeTags, parseTagInput } from './folder-tag-rule'

describe('normalizeTags', () => {
    test('strips a leading #', () => {
        expect(normalizeTags(['#work'])).toEqual(['work'])
    })

    test('trims surrounding whitespace', () => {
        expect(normalizeTags(['  work  '])).toEqual(['work'])
    })

    test('drops empty entries', () => {
        expect(normalizeTags(['work', '', '   '])).toEqual(['work'])
    })

    test('de-duplicates exact matches, keeping first occurrence order', () => {
        expect(normalizeTags(['work', 'personal', 'work'])).toEqual(['work', 'personal'])
    })

    test('treats case-distinct tags as different tags', () => {
        expect(normalizeTags(['work', 'Work'])).toEqual(['work', 'Work'])
    })
})

describe('parseTagInput', () => {
    test('splits on commas and newlines and normalizes each entry', () => {
        expect(parseTagInput('work, #personal\nwork\n  \nurgent')).toEqual([
            'work',
            'personal',
            'urgent'
        ])
    })
})

describe('isFolderNote', () => {
    test('returns true when note is directly in folder and basename matches folder name', () => {
        expect(
            isFolderNote(
                { basename: 'Games', parent: { path: 'Games' } },
                { name: 'Games', path: 'Games' }
            )
        ).toBe(true)
    })

    test('returns false when note is directly in folder but basename does not match', () => {
        expect(
            isFolderNote(
                { basename: 'diablo', parent: { path: 'Games' } },
                { name: 'Games', path: 'Games' }
            )
        ).toBe(false)
    })

    test('returns false when note is in a subfolder even if basename matches an ancestor folder', () => {
        expect(
            isFolderNote(
                { basename: 'Games', parent: { path: 'Games/RPG' } },
                { name: 'Games', path: 'Games' }
            )
        ).toBe(false)
    })

    test('returns false when note has no parent', () => {
        expect(
            isFolderNote({ basename: 'Games', parent: null }, { name: 'Games', path: 'Games' })
        ).toBe(false)
    })

    test('returns false when casing differs', () => {
        expect(
            isFolderNote(
                { basename: 'games', parent: { path: 'Games' } },
                { name: 'Games', path: 'Games' }
            )
        ).toBe(false)
    })
})

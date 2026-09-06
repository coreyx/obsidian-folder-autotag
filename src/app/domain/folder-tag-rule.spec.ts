import { describe, expect, test } from 'bun:test'
import { normalizeTags, parseTagInput } from './folder-tag-rule'

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

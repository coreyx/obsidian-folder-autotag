import { describe, expect, test } from 'bun:test'
import { getParentPath } from './register-auto-tag-listener'

describe('getParentPath', () => {
    test('returns the folder path for a nested file', () => {
        expect(getParentPath('Projects/Work/note.md')).toBe('Projects/Work')
    })

    test('returns an empty string for a vault-root file', () => {
        expect(getParentPath('note.md')).toBe('')
    })

    test('returns the immediate parent for a one-level-deep file', () => {
        expect(getParentPath('Projects/note.md')).toBe('Projects')
    })
})

import { describe, expect, test } from 'bun:test'
import { produce } from 'immer'
import type { Draft } from 'immer'
import { FolderTagRulesService } from './folder-tag-rules.service'
import type { PluginSettings } from '../types/plugin-settings.intf'
import { DEFAULT_SETTINGS } from '../types/plugin-settings.intf'

/** A minimal fake host — no Obsidian plugin instance needed, per FolderTagRulesHost. */
const createFakeHost = (): { settings: PluginSettings; updateCalls: number } & {
    updateSettings(mutator: (draft: Draft<PluginSettings>) => void): Promise<void>
} => {
    let settings: PluginSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)
    let updateCalls = 0
    return {
        get settings() {
            return settings
        },
        get updateCalls() {
            return updateCalls
        },
        updateSettings(mutator: (draft: Draft<PluginSettings>) => void): Promise<void> {
            updateCalls += 1
            settings = produce(settings, mutator)
            return Promise.resolve()
        }
    }
}

describe('FolderTagRulesService', () => {
    test('set then get round-trips, normalizing the tags', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)

        await service.setRule('Projects/Work', ['#work', ' urgent '])

        expect(service.getRule('Projects/Work')).toEqual(['work', 'urgent'])
    })

    test('setting an empty tag list removes an existing rule', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)
        await service.setRule('Projects/Work', ['work'])

        await service.setRule('Projects/Work', [])

        expect(service.getRule('Projects/Work')).toBeUndefined()
    })

    test('setting a blank-only tag list removes an existing rule', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)
        await service.setRule('Projects/Work', ['work'])

        await service.setRule('Projects/Work', ['   ', '#'])

        expect(service.getRule('Projects/Work')).toBeUndefined()
    })

    test('removing a rule on a path with no rule is a no-op', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)

        await service.removeRule('Projects/Nothing')

        expect(host.updateCalls).toBe(0)
    })

    test('rename moves an existing rule to the new path', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)
        await service.setRule('Projects/Work', ['work'])

        await service.handleFolderRenamed('Projects/Work', 'Areas/Work')

        expect(service.getRule('Projects/Work')).toBeUndefined()
        expect(service.getRule('Areas/Work')).toEqual(['work'])
    })

    test('rename is a no-op when no rule exists at the old path', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)

        await service.handleFolderRenamed('Projects/Empty', 'Areas/Empty')

        expect(host.updateCalls).toBe(0)
    })

    test('delete removes a rule', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)
        await service.setRule('Projects/Work', ['work'])

        await service.handleFolderDeleted('Projects/Work')

        expect(service.getRule('Projects/Work')).toBeUndefined()
    })

    test('delete is a no-op when no rule exists', async () => {
        const host = createFakeHost()
        const service = new FolderTagRulesService(host)

        await service.handleFolderDeleted('Projects/Nothing')

        expect(host.updateCalls).toBe(0)
    })
})

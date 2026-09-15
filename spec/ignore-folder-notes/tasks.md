## Implementation plan: Ignore Folder Notes

Numbered tasks, each a checklist of concrete steps. Every task cites the acceptance criteria subsections from `spec/ignore-folder-notes/requirements.md` that it implements. Perform tasks in sequence, as subsequent tasks depend on domain helpers and schema additions from earlier ones. Refer to `spec/ignore-folder-notes/design.md` for architectural rationale and `spec/ignore-folder-notes/tech.md` for technical stack details.

Per `AGENTS.md`'s definition of done, after **each** task: `bun run tsc`, `bun run lint`, `bun run test`, and `bun run build` must all pass before moving to the next task.

---

### 1. Domain model and settings schema

Requirements: 1.3, 1.4, 2.1, 3.4

- [x] Create domain helper `isFolderNote` in `src/app/domain/folder-tag-rule.ts`:
  - `export const isFolderNote = (file: { basename: string; parent: { path: string } | null }, folder: { name: string; path: string }): boolean`
  - Returns `true` if `file.parent !== null && file.parent.path === folder.path && file.basename === folder.name`, `false` otherwise.
- [x] Add unit tests in `src/app/domain/folder-tag-rule.spec.ts` covering:
  - File directly in folder with identical basename returns `true` (e.g. `Games.md` in `Games`).
  - File directly in folder with different basename returns `false` (e.g. `diablo.md` in `Games`).
  - File with matching basename located in a descendant subfolder returns `false` (e.g. `Games/RPG/Games.md` evaluated against `Games`).
  - File with `null` parent returns `false`.
  - Case-sensitivity check: `"games"` vs `"Games"` does not match when cases differ.
- [x] Extend `PluginSettings` in `src/app/types/plugin-settings.intf.ts`:
  - Add `folderIgnoreFolderNotes: Record<string, boolean>` to `PluginSettings`.
  - Add `folderIgnoreFolderNotes: {}` to `DEFAULT_SETTINGS`.
- [x] Update `loadSettings()` in `src/app/plugin.ts`:
  - Inside `produce()`, add defensive loading for `loadedSettings.folderIgnoreFolderNotes`: if it is a non-null, non-array object, assign to `draft.folderIgnoreFolderNotes`; otherwise default to `{}` and set `needToSaveSettings = true`.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.

---

### 2. Folder tag rules service updates

Requirements: 1.3, 1.4, 2.1, 2.3, 2.4, 2.5

- [x] Update `FolderTagRulesService` in `src/app/services/folder-tag-rules.service.ts`:
  - Add `getIgnoreFolderNotes(folderPath: string): boolean` returning `this.host.settings.folderIgnoreFolderNotes[folderPath] ?? false`.
  - Update `setRule(folderPath: string, tags: string[], ignoreFolderNotes?: boolean): Promise<void>`:
    - If normalized `tags` are empty, remove rule (cleaning up both `folderTagRules` and `folderIgnoreFolderNotes`).
    - If normalized `tags` are non-empty, persist tags to `draft.folderTagRules[folderPath]` and set `draft.folderIgnoreFolderNotes[folderPath] = ignoreFolderNotes ?? false`.
  - Update `removeRule(folderPath: string): Promise<void>` to delete both `draft.folderTagRules[folderPath]` and `draft.folderIgnoreFolderNotes[folderPath]`.
  - Update `handleFolderRenamed(oldPath: string, newPath: string): Promise<void>` to migrate `draft.folderIgnoreFolderNotes[oldPath]` to `newPath` alongside `draft.folderTagRules[oldPath]`.
  - Ensure `handleFolderDeleted(folderPath: string): Promise<void>` removes both entries via `removeRule`.
- [x] Update unit tests in `src/app/services/folder-tag-rules.service.spec.ts`:
  - Verify `getIgnoreFolderNotes` returns `false` when no setting exists.
  - Verify `setRule` saves `ignoreFolderNotes` when provided.
  - Verify `setRule` with empty tags removes both tags and the ignore setting.
  - Verify `removeRule` removes the ignore setting.
  - Verify `handleFolderRenamed` migrates the ignore setting from `oldPath` to `newPath`.
  - Verify `handleFolderDeleted` removes the ignore setting.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.

---

### 3. Auto-tag service tag collection and folder note exclusion

Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4

- [x] Update `src/app/services/auto-tag.service.ts`:
  - Refactor `collectAncestorTags` to `collectApplicableTags(file: TFile, rules: Record<string, string[]>, ignoreFolderNotes: Record<string, boolean>): string[]`:
    - For each ancestor folder from root to leaf, check if rule exists.
    - If `ignoreFolderNotes[ancestor.path] === true` and `isFolderNote(file, ancestor) === true`, skip that ancestor's tags.
    - Otherwise, append that ancestor's tags.
  - Update `applyFolderTags(app: AutoTagHost, file: TFile, cache: CachedMetadata, rules: Record<string, string[]>, ignoreFolderNotes: Record<string, boolean>): Promise<void>` to invoke `collectApplicableTags`.
  - Update `applyRuleToExistingNotes(host: RetagHost, folder: TFolder, rules: Record<string, string[]>, ignoreFolderNotes: Record<string, boolean>): Promise<void>` to forward `ignoreFolderNotes` to `applyFolderTags`.
- [x] Update `register-auto-tag-listener.ts`:
  - Pass `plugin.settings.folderIgnoreFolderNotes` to `applyFolderTags` in `tryApply`.
- [x] Update callers and tests in `src/app/commands/register-auto-tag-listener.spec.ts` and `src/app/services/auto-tag.service.spec.ts` to accommodate updated signatures.
- [x] Add unit tests in `src/app/services/auto-tag.service.spec.ts` covering:
  - Folder note with `ignoreFolderNotes: true` receives no tags configured for that folder (3.1).
  - Normal note in same folder with `ignoreFolderNotes: true` receives configured tags (3.2).
  - Folder note with `ignoreFolderNotes: false` receives configured tags normally (3.3).
  - Subfolder note matching subfolder name (`Games/RPG/RPG.md`) skips `RPG` tags when `RPG` has ignore enabled, but receives inherited `Games` tags (5.1, 5.2, 5.3).
  - Subfolder note matching ancestor name (`Games/RPG/Games.md`) is not a direct folder note of `Games` and receives ancestor tags (5.4).
  - Retroactive tagging via `applyRuleToExistingNotes` skips existing folder notes when ignore is enabled, and applies tags to other existing notes (4.1, 4.2, 4.3).
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.

---

### 4. UI integration in FolderTagModal

Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2

- [x] In `src/app/ui/folder-tag-modal.ts`:
  - Add private property `private ignoreFolderNotes: boolean`.
  - In `constructor`, initialize `this.ignoreFolderNotes = plugin.folderTagRulesService.getIgnoreFolderNotes(folder.path)`.
  - In `onOpen()`, add a new `Setting` below the Tags setting:
    - `.setName('Ignore folder notes')`
    - `.setDesc('Do not apply this folder’s automatic tags to a note matching the folder name.')`
    - `.addToggle((toggle) => toggle.setValue(this.ignoreFolderNotes).onChange((value) => { this.ignoreFolderNotes = value }))`
  - In the **Save** button click handler:
    - Pass `this.ignoreFolderNotes` to `plugin.folderTagRulesService.setRule(this.folder.path, tags, this.ignoreFolderNotes)`.
    - Pass `this.plugin.settings.folderIgnoreFolderNotes` to `applyRuleToExistingNotes(this.plugin.app, this.folder, this.plugin.settings.folderTagRules, this.plugin.settings.folderIgnoreFolderNotes)`.
  - Ensure Cancel button and Esc close without persisting.
- [x] If required for test environments, ensure `ToggleComponent` is supported in `src/test-setup.ts`.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.
- [ ] Perform manual verification in an actual Obsidian vault:
  - Open folder context menu, click "Set Auto-Tag".
  - Verify "Ignore folder notes" checkbox is rendered with correct label and description.
  - Enable checkbox, add tags (e.g. `game`), click Save.
  - Create a note with same name as folder (`Games.md`) -> verify no tags added.
  - Create a normal note (`diablo.md`) -> verify `#game` tag added.
  - Drag or move `Games.md` and `diablo.md` into folder -> verify behavior matches.

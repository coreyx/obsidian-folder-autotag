## Tech stack: Ignore Folder Notes

This document describes the tech stack, Obsidian APIs, state management, and testing infrastructure used to implement the "Ignore folder notes" feature on top of the existing Obsidian Folder Autotag plugin architecture.

### Platform & runtime

- **Target platform:** Obsidian Community Plugin. `minAppVersion` `1.13.0` (`manifest.json`).
- **Device compatibility:** Mobile and desktop compatible (`isDesktopOnly: false`).
- **Typings:** `obsidian@1.13.1` (dev dependency). All Obsidian API calls strictly conform to typings in `node_modules/obsidian/obsidian.d.ts`.
- **Runtime:** [Bun](https://bun.com/) for script execution, bundling, and testing.

### Language & compiler configuration

- **TypeScript** in strict mode (`tsconfig.json`):
  - `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
  - No `any`, no `as any`, no `as unknown as`, no `@ts-ignore` or `@ts-expect-error`.
  - `verbatimModuleSyntax: true` (`import type` for type-only imports).

### Obsidian APIs used

- **`Setting.prototype.addCheckbox`** (or `addToggle`):
  - Used in `FolderTagModal` (`src/app/ui/folder-tag-modal.ts`) to render the "Ignore folder notes" setting row with a native Obsidian checkbox control.
  - `addCheckbox((cb) => cb.setValue(this.ignoreFolderNotes).onChange((value) => { this.ignoreFolderNotes = value }))`.
- **`TFile.basename`**:
  - String representing the file name without the `.md` extension (e.g. `"Games"` for `"Games.md"`).
  - Used to compare against the folder name.
- **`TFolder.name`**:
  - String representing the folder's immediate name without parent directory paths (e.g. `"Games"` for `"Vault/Entertainment/Games"`).
- **`TAbstractFile.parent`**:
  - `TFolder | null`. Provides access to the immediate containing folder of a `TFile` to determine whether the note is located directly inside the folder being evaluated.
- **`FileManager.processFrontMatter`**:
  - Continues to be used for non-destructive frontmatter mutation when tags are applied.

### State management & schema

- **Immer (`immer`)**:
  - Plugin settings state (`this.settings`) remains immutable; updates flow through `produce()` within `FolderAutotagPlugin.updateSettings()`.
  - Mutations to folder settings are persisted to disk via `saveData` before in-memory state is updated, ensuring atomic persistence and serialized saves.
- **Settings schema extension:**
  - Option selected: Add `folderIgnoreFolderNotes: Record<string, boolean>` to `PluginSettings` (`src/app/types/plugin-settings.intf.ts`).
  - Keyed by vault-relative folder path (`Record<string, boolean>`).
  - Default value: `{}` in `DEFAULT_SETTINGS`.
  - Defensive loader in `FolderAutotagPlugin.loadSettings()` ensures `draft.folderIgnoreFolderNotes = {}` if missing or malformed in existing `data.json`.
  - This preserves 100% backwards compatibility with existing user data without requiring data migration scripts.

### Domain and service layer

- **Domain (`src/app/domain/folder-tag-rule.ts`):**
  - Pure helper function `isFolderNote(file: Pick<TFile, 'basename' | 'parent'>, folder: Pick<TFolder, 'name' | 'path'>): boolean`.
  - Compares `file.parent?.path === folder.path && file.basename === folder.name`.
  - Independent of Obsidian runtime classes (structural typing), allowing direct, fast unit testing.
- **Rules service (`src/app/services/folder-tag-rules.service.ts`):**
  - Manages both tag lists (`folderTagRules`) and the boolean flag (`folderIgnoreFolderNotes`).
  - Synchronizes life-cycle operations: folder rename moves both entries, folder delete or rule removal cleans up both entries.
- **Auto-tag service (`src/app/services/auto-tag.service.ts`):**
  - When collecting configured tags across the ancestor chain (`collectAncestorTags` or equivalent), filters out rules for which `ignoreFolderNotes` is enabled AND `isFolderNote(file, folder)` is true.

### Testing infrastructure

- **Test runner:** `bun:test` run via `bun run test` (enforcing `--isolate` as required by `AGENTS.md`).
- **Mocks (`src/test-setup.ts`):**
  - Ensure `Setting.prototype.addCheckbox` and `ButtonComponent` / `Modal` mocks are sufficiently populated for modal testing if modal tests are expanded.
  - Structural typing interfaces (`AutoTagHost`, `RetagHost`, `FolderTagRulesHost`) allow unit tests to mock only necessary methods without disallowed casts.
- **Test coverage:**
  - `src/app/domain/folder-tag-rule.spec.ts`: unit tests for `isFolderNote` (matching names, mismatched names, nested folder notes, subfolder checks).
  - `src/app/services/folder-tag-rules.service.spec.ts`: unit tests for getting, setting, renaming, and deleting ignore-folder-note settings.
  - `src/app/services/auto-tag.service.spec.ts`: unit tests for creation, move, retroactive tagging, and inheritance with folder notes ignored or included.

### Quality gates

- `bun run tsc`: Zero TypeScript errors.
- `bun run lint`: Zero ESLint warnings (`--max-warnings 0`).
- `bun run test`: 100% test pass rate across all `.spec.ts` files.
- `bun run build`: Clean compilation producing `main.js`, `manifest.json`, and `styles.css`.

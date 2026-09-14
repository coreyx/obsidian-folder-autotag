## Implementation plan: Folder Autotag

Numbered tasks, each a checklist of concrete steps. Every task cites the `spec/requirements.md`
acceptance-criteria numbers it implements. Do these in order — later tasks depend on the domain
types and services earlier ones create. See `spec/design.md` for the rationale behind each
decision referenced below, and `spec/tech.md` for stack conventions (immer settings pattern,
`.spec.ts` colocation, declarative settings rules, etc.).

Per `AGENTS.md`'s definition of done, after **each** task: `bun run tsc`, `bun run lint`,
`bun run test`, and `bun run build` must all pass before moving to the next task.

---

### 1. Domain model and settings schema

Requirements: 2.3, 5.2

- [x] Create `src/app/domain/folder-tag-rule.ts`:
    - `export interface FolderTagRule { folderPath: string; tags: string[] }`
    - `export const normalizeTags = (input: string[]): string[] => ...` — strips a leading `#`,
      trims whitespace, drops empty strings, de-duplicates case-sensitively, preserves input order
      of first occurrence.
    - `export const parseTagInput = (raw: string): string[] => ...` — splits a raw modal text-field
      value on commas and newlines, then runs it through `normalizeTags`.
- [x] Write `src/app/domain/folder-tag-rule.spec.ts` covering: leading `#` stripped, whitespace
      trimmed, empty entries dropped, exact-duplicate removed, case-distinct tags both kept, mixed
      comma/newline input parsed correctly.
- [x] Extend `src/app/types/plugin-settings.intf.ts`:
    - Add `folderTagRules: Record<string, string[]>` to `PluginSettings`.
    - Add `folderTagRules: {}` to `DEFAULT_SETTINGS`.
- [x] In `FolderAutotagPlugin.loadSettings()` (`src/app/plugin.ts`), inside the existing
      `produce()` block, add the same defensive-defaulting pattern already used for `enabled`:
      if `loadedSettings.folderTagRules` isn't a plain object, set
      `draft.folderTagRules = {}` and set `needToSaveSettings = true`.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.

### 2. Folder tag rules service

Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3

- [x] Create `src/app/services/folder-tag-rules.service.ts` exporting a `FolderTagRulesService`
      class constructed with the owning `FolderAutotagPlugin`:
    - `getRule(folderPath: string): string[] | undefined` — reads
      `plugin.settings.folderTagRules[folderPath]`.
    - `setRule(folderPath: string, tags: string[]): Promise<void>` — if `tags` is empty, delegate
      to `removeRule`; otherwise calls `plugin.updateSettings((draft) => { draft.folderTagRules[folderPath] = normalizeTags(tags) })`.
    - `removeRule(folderPath: string): Promise<void>` — calls
      `plugin.updateSettings((draft) => { delete draft.folderTagRules[folderPath] })`.
    - `handleFolderRenamed(oldPath: string, newPath: string): Promise<void>` — if a rule exists at
      `oldPath`, moves it: `updateSettings` sets it at `newPath` and deletes it at `oldPath` in the
      same mutation (single write, avoids a window where neither key holds it).
    - `handleFolderDeleted(folderPath: string): Promise<void>` — delegates to `removeRule`.

        Constructed against a `FolderTagRulesHost` structural interface (`{ settings, updateSettings }`)
        rather than the concrete plugin class, so tests need no real Obsidian plugin instance.

- [x] Write `src/app/services/folder-tag-rules.service.spec.ts` covering: set then get round-trips;
      setting an empty tag list removes any existing rule; remove on a path with no rule is a
      no-op; rename moves an existing rule and is a no-op when no rule exists at the old path;
      delete removes a rule and is a no-op when none exists. Construct the service against a
      minimal fake plugin object (`{ settings, updateSettings }`) rather than a real
      `FolderAutotagPlugin` — matches how the existing settings tests mock `obsidian`.
- [x] In `FolderAutotagPlugin.onload()` (`src/app/plugin.ts`), register:
      `this.registerEvent(this.app.vault.on('rename', (file, oldPath) => { if (file instanceof TFolder) void this.folderTagRulesService.handleFolderRenamed(oldPath, file.path) }))`
      and the equivalent for `'delete'` calling `handleFolderDeleted`. These two register
      immediately in `onload()` (unlike `create`, rename/delete of a pre-existing folder the user
      didn't configure is always a no-op, so there's no retroactive-tagging risk to gate against).
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.

### 3. Auto-tag application service

Requirements: 3.1, 3.2, 4.1, 4.2

Reads tags through Obsidian's own `MetadataCache` (`getAllTags`), which already unifies frontmatter
and inline tags — see `spec/design.md`'s "Why not Dataview" for why this isn't a Dataview
dependency and isn't a hand-rolled body scanner either.

- [x] Create `src/app/services/auto-tag.service.ts` exporting an `AutoTagHost` structural interface
      (`{ fileManager: Pick<FileManager, 'processFrontMatter'> }` — a real `App` satisfies it, but a
      test only fakes the one method it needs, avoiding both `App`-casting and the project's ban on
      `as unknown as`; the `obsidianmd` ruleset also separately forbids `as TFile`/`as TFolder`
      casts) and:
      `export async function applyFolderTags(app: AutoTagHost, file: TFile, cache: CachedMetadata, rules: Record<string, string[]>): Promise<void>`.
      Implement per `spec/design.md`'s "Applying tags" section: 1. Return early if `file.parent === null`. 2. Look up `rules[file.parent.path]`; return early if undefined or empty. 3. Read `getAllTags(cache) ?? []` and normalize with `normalizeTags` (Task 1) — this is the
      note's existing tag set, frontmatter and inline combined. 4. Compute `toAdd = normalizeTags(rule) - existing` (case-sensitive set difference; Req 4.2's
      "no duplicate instance"). 5. If `toAdd.length === 0`, return without calling `processFrontMatter` at all. 6. Otherwise call `app.fileManager.processFrontMatter(file, (frontmatter) => { frontmatter.tags
= [...normalizeTags(parseFrontMatterTags(frontmatter) ?? []), ...toAdd] })` — normalize the
      frontmatter's own tags too, not just `rule`, since `parseFrontMatterTags` may hand tags back
      `#`-prefixed and writing a mix of `#`-prefixed and bare tags would be its own bug.
- [x] Extend `src/test-setup.ts`'s `obsidian` mock with `parseFrontMatterTags` and `getAllTags`
      (the latter built on the former, matching real Obsidian's own "combines frontmatter and
      content tags" behavior) — these are real runtime functions the service calls, not just types,
      so the types-only mock needs implementations or every test using them throws.
- [x] Write `src/app/services/auto-tag.service.spec.ts` covering:
    - A note in a configured folder with no existing tags gets exactly the configured tags.
    - A note that already has some of the configured tags — via frontmatter, **and** separately via
      an inline `#tag` in `cache.tags` with nothing in frontmatter — gets only the genuinely
      missing tags added in each case (Req 4.2). This is the case that motivated reading
      `getAllTags(cache)` instead of frontmatter alone; make sure the inline-only case has its own
      test rather than folding it into the frontmatter case.
    - A note's non-`tags` frontmatter fields (e.g. `aliases`, a custom field) survive unchanged
      (Req 4.1).
    - A file with no parent rule, and a rule that resolves to zero new tags, are both no-ops —
      assert `processFrontMatter` is not called (a `bun:test` `mock()` on the fake `AutoTagHost`).
      Build `TFile`/`TFolder` fixtures via `new TFile()`/`new TFolder()` plus direct property
      assignment (never `as TFile`/`as TFolder`) and `CachedMetadata` fixtures by hand
      (`{ tags: [{ tag: '#work', position: ... }], frontmatter: {...} }`) — no need for a real vault
      or a real parser.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.

### 4. Vault "create" / metadata-cache event wiring

Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3

`create` marks a file as pending; a `metadataCache` event resolves it once the file's
`CachedMetadata` is actually available.

**Revised after manual verification, twice:**

1. Moving/dragging an existing note into a configured folder did not tag it. The original design
   listed this under "out of scope," reading Req 3's "a note is added to a folder" as
   creation-only — the tester flagged the opposite reading as correct: a move counts as "added."
   Fixed by also registering `vault.on('rename')`.
2. That first fix assumed a moved file's `CachedMetadata` was already resolved and readable
   synchronously via `getFileCache` right in the `rename` handler — still didn't tag on move.
   Diagnostic `console.warn` logging (temporarily added, then removed — `no-console` allows
   `warn`/`error`/`debug` but not `log`, and Chrome DevTools hides `debug` under "Verbose" by
   default, both worth remembering next time) showed `getFileCache` returning `null` right after a
   move, in both directions. Fixed by unifying `create` and `rename` around one shared `pending`
   set resolved by whichever of `metadataCache`'s `changed`, `resolve`, or `resolved` fires first
   with that path's cache available — see `spec/design.md`'s "Moving a note into a configured
   folder" for the full account, including why `changed` alone (which works for `create`) doesn't
   transfer to `rename` (documented to never fire for one).

- [x] Create `src/app/commands/register-auto-tag-listener.ts` exporting
      `registerAutoTagListener(plugin: FolderAutotagPlugin): void` with one shared
      `pending = new Set<string>()` (cleared on unload) and one `tryApply(file)` that reads
      `getFileCache(file)`, and if non-null, deletes the path from `pending` and calls
      `applyFolderTags`:
    - `vault.on('create', ...)` (gated behind `workspace.onLayoutReady()` — load-bearing, not
      stylistic: without it, the very first plugin load with any rule configured would
      retroactively enqueue the user's entire existing vault; mirrors the pattern already used in
      `src/app/whats-new.ts`) adds a new markdown file's path to `pending`.
    - `metadataCache.on('changed', ...)` (same `onLayoutReady` block, for locality) calls
      `tryApply` for a pending path.
    - `vault.on('rename', (file, oldPath) => { ... })` (ungated — a move never fires during
      initial load): skip unless `file instanceof TFile` with a `.md` extension; skip if
      `getParentPath(oldPath) === getParentPath(file.path)` (renamed in place, not moved between
      folders — must not retroactively tag a note that predates its folder's rule); otherwise add
      the path to `pending` and call `tryApply` immediately (a fast path, for whenever the cache
      does happen to already be there).
    - `metadataCache.on('resolve', (file) => ...)` calls `tryApply` for a pending path — fires
      per-file, "sometimes after a file has been indexed" (its own doc comment), so not
      guaranteed, but free when it happens.
    - `metadataCache.on('resolved', () => ...)` — the guaranteed backstop (fires globally,
      unconditionally, "each time files get modified after the initial load") — iterates every
      still-pending path via `plugin.app.vault.getFileByPath(path)` and calls `tryApply` on each.
    - Export `getParentPath` (derives a folder path from a raw path string, comparing pre-/post-
      rename with the same derivation on both sides) and cover it with
      `register-auto-tag-listener.spec.ts` (nested file, vault-root file, one-level-deep file).
- [x] Call `registerAutoTagListener(this)` from `FolderAutotagPlugin.onload()`.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.
- [x] **Manual vault verification (cannot be checked by tests or build):** in a real test vault,
      configure a rule for a folder, then (a) confirm creating a new blank note in that folder tags
      it, (b) confirm duplicating an existing note that already has a matching inline `#tag` (e.g.
      the file explorer's "Make a copy") into that folder does **not** get that tag duplicated into
      frontmatter — a plain "New note" is always blank, so it can't exercise this path; this case is
      also covered directly by `auto-tag.service.spec.ts`'s inline-tag test, which doesn't depend on
      a live vault, (c) confirm reloading the plugin (`Ctrl/Cmd+R`) in a vault that already has notes
      in the configured folder does **not** retroactively tag those pre-existing notes, and (d)
      confirm dragging/moving an existing note from an unconfigured folder into a configured one
      tags it (may take a moment — it's no longer a synchronous same-tick write), while renaming a
      note in place (no folder change) does not.

### 5. Folder context menu integration

Requirements: 1.1, 1.2

- [x] Create `src/app/commands/register-folder-context-menu.ts` exporting
      `registerFolderContextMenu(plugin: FolderAutotagPlugin): void`:

      ```ts
      plugin.registerEvent(
          plugin.app.workspace.on('file-menu', (menu, file) => {
              if (!(file instanceof TFolder)) return
              menu.addItem((item) =>
                  item
                      .setTitle('Set Auto-Tag')
                      .setIcon('tag')
                      .onClick(() => new FolderTagModal(plugin.app, plugin, file).open())
              )
          })
      )
      ```

      Originally "Auto tagging," renamed to "Set Auto-Tag" on explicit direction, in two steps:
      the `obsidianmd/ui/sentence-case` lint rule flags a `MenuItem`'s plain string-literal
      `.setTitle(...)` argument, so it first had to become sentence-cased "Set auto-tag" — but the
      exact "Set Auto-Tag" capitalization was still wanted, so `'Auto-Tag'` was added to the rule's
      `brands` list in `eslint.config.ts` (spreading `DEFAULT_BRANDS`, never replacing it — see
      that file's own comments). `requirements.md`'s "Auto Tagging" is the original concept name,
      not literal UI copy either way.
- [x] Call `registerFolderContextMenu(this)` from `FolderAutotagPlugin.onload()`.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.
- [x] **Manual vault verification:** right-click a folder in the file explorer, confirm the
      **Set Auto-Tag** item appears, and confirm it does **not** appear when right-clicking a note
      (file-menu also fires for files).

### 6. Folder tag configuration modal

Requirements: 1.2, 1.3, 2.1, 2.2, 2.3

- [x] Create `src/app/ui/folder-tag-modal.ts` exporting a `FolderTagModal extends Modal`
      constructed with `(app: App, plugin: FolderAutotagPlugin, folder: TFolder)`:
    - `onOpen()`: `this.setTitle(`Set Auto-Tag — ${folder.path}`)` (Req 1.3 — identifies the
      folder). Render one `Setting` with a `TextAreaComponent` (or `TextComponent`, whichever
      Obsidian's `Setting.addTextArea`/`addText` API supports for multi-line comma/newline input —
      check `obsidian.d.ts` for the exact method name before writing this) pre-filled by joining
      `plugin.folderTagRulesService.getRule(folder.path) ?? []` with `', '`.
    - A **Save** button: reads the text field's current value, runs it through `parseTagInput`
      (Task 1), calls `await plugin.folderTagRulesService.setRule(folder.path, tags)`, then
      `this.close()`.
    - A **Cancel** button (or rely on `Esc`/backdrop click, Modal's default): `this.close()` with
      no persistence call.
    - `onClose()`: `this.contentEl.empty()` (standard Modal cleanup).
- [x] Wire `FolderTagModal` into `register-folder-context-menu.ts`'s `onClick` handler (Task 5) —
      if that task stubbed the `onClick` body, complete it here.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build`.
- [x] **Manual vault verification:** open the modal for a folder with no rule (field starts empty),
      enter multiple comma-separated tags, save, reopen the modal and confirm the tags are shown
      pre-filled (Req 2.2, 2.3); clear the field and save, confirm the rule is removed (query
      `plugin.settings.folderTagRules` via the developer console, or reopen the modal and confirm
      it's empty again).

### 7. Documentation

Requirements: covers the feature as a whole (1–6); no single acceptance criterion, required by
`AGENTS.md`'s definition of done regardless.

- [x] Update `documentation/Domain Model.md`: document `FolderTagRule` and the
      folder-path-keyed rules map.
- [x] Update `documentation/Architecture.md`: document the event-driven architecture in
      `spec/design.md`'s overview diagram (context menu → modal → rules service; create/changed
      events → auto-tag service).
- [x] Update `documentation/Business Rules.md`: record the additive-only tagging rule (Req 4.1),
      the duplicate-detection scope (checked against `getAllTags` — frontmatter and inline
      combined, Req 4.2), and the stated non-goals (no retroactive tagging of existing notes, no
      tagging on move, no un-tagging when a rule is edited/removed).
- [x] Update `documentation/Configuration.md`: document the `folderTagRules` settings shape.
- [x] Update `README.md` and `docs/usage.md` with end-user instructions: how to open
      **Set Auto-Tag** from a folder's context menu, how to enter tags, and what happens when a
      note is added to a configured folder. Done later, as its own pass (`TEMPLATE_USAGE.md` Step
      4.1 for `README.md`; Step 4.2 for `docs/usage.md` specifically — `docs/configuration.md`,
      `docs/tips.md`, and `docs/README.md` are still unrewritten template placeholder content).
- [x] Add a `documentation/history/yyyy-mm-dd.md` entry summarizing the feature once Tasks 1–6 are
      complete.

### 8. Subfolder inheritance

Requirements: 5.1 (carve-out), 5.4, 5.5

Added after Tasks 1–7 shipped, on explicit direction: a note in a subfolder should also pick up its
ancestors' configured tags, combined rather than shadowed (see `spec/design.md`'s "Subfolder
inheritance" for the decision and why it was asked rather than assumed).

- [x] In `src/app/services/auto-tag.service.ts`, add
      `collectAncestorTags(folder: TFolder, rules: Record<string, string[]>): string[]`: walk
      `folder.parent` up to the vault root (`parent === null`), collecting `rules[ancestor.path]`
      at each level that has one, then reverse so the result is root-first.
- [x] In `applyFolderTags`, replace the single `rules[file.parent.path]` lookup with
      `normalizeTags(collectAncestorTags(file.parent, rules))`; everything downstream (dedup
      against the note's existing tags via `getAllTags`, no-op when the combined list is empty) is
      otherwise unchanged.
- [x] Extend `src/app/services/auto-tag.service.spec.ts`'s `makeFile` test helper to build a full
      `TFolder` ancestor chain (each segment's `.parent` pointing to the one above), not just a
      single parent, so nested-folder scenarios can be constructed. Add cases: a note in a
      subfolder inherits an ancestor-only rule; a note's own folder rule combines with its
      ancestor's (root tags first in the written array); every level of a deep (3+) chain
      contributes; an exact-duplicate tag across levels isn't repeated; a sibling branch's rule
      does not leak into an unrelated folder (regression guard for Req 5.1's independence outside
      the ancestor/descendant case).
- [x] Update `spec/requirements.md`: qualify 5.1's independence claim with the subfolder carve-out,
      add 5.4 (subfolder inheritance) and 5.5 (combined, not nearest-only).
- [x] Update `spec/design.md`: new "Subfolder inheritance" section; revise "Multiple independent
      folders" to scope Req 5.1 to non-ancestor/descendant folders; revise "Applying tags" step 2.
- [x] Update `documentation/{Domain Model,Architecture,Business Rules}.md` to match.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build && bun run rules:check`.
- [x] **Manual vault verification (cannot be checked by tests or build):** configure a rule on a
      parent folder only, create a note in an unconfigured subfolder several levels deep, confirm
      it gets the parent's tags. Then also configure a rule on that subfolder and confirm a new
      note there gets both the parent's and the subfolder's tags, deduplicated if they overlap.
      Confirm a note in an unrelated sibling folder still gets neither. — User confirmed working.

### 9. Retroactive apply on save

Requirements: 7.1, 7.2, 7.3, 7.4

Added after Task 8 shipped, on explicit direction: saving a folder's rule should tag notes already
in that folder (and its subfolders) that predate the rule, not just notes added afterward. See
`spec/design.md`'s "Retroactive apply on save" for why this is a deliberate, explicit-action
exception to the "no retroactive tagging" non-goal, not a reversal of it.

- [x] In `src/app/services/auto-tag.service.ts`, add
      `collectMarkdownFiles(folder: TFolder): TFile[]` (recurse through `folder.children`,
      collecting every `.md` `TFile` at any depth) and export:

      ```ts
      export interface RetagHost extends AutoTagHost {
          metadataCache: Pick<MetadataCache, 'getFileCache'>
      }

      export async function applyRuleToExistingNotes(
          host: RetagHost,
          folder: TFolder,
          rules: Record<string, string[]>
      ): Promise<void> {
          for (const file of collectMarkdownFiles(folder)) {
              const cache = host.metadataCache.getFileCache(file)
              if (cache !== null) {
                  await applyFolderTags(host, file, cache, rules)
              }
          }
      }
      ```

      Deliberately reruns the same `applyFolderTags` used for new notes against every existing
      note in the subtree — do **not** try to compute "what's new in this rule" and apply only
      that delta; letting `applyFolderTags` recompute each note's full combined ancestor tag set is
      what makes a deeply-nested note correctly pick up both the just-saved ancestor rule and its
      own folder's rule (Req 7.2), and makes the additive/no-duplicate behavior (Req 7.3) fall out
      for free rather than needing to be reimplemented here.

- [x] In `src/app/ui/folder-tag-modal.ts`'s Save `onClick`, after `setRule` resolves, call
      `applyRuleToExistingNotes(this.plugin.app, this.folder, this.plugin.settings.folderTagRules)`
      — but only when the parsed tag list is non-empty (Req 7.4: clearing/removing a rule must
      never touch existing notes' tags — the `removeRule` path inside `setRule` must not trigger
      this at all).
- [x] Extend `src/app/services/auto-tag.service.spec.ts` with a `buildTree` helper (a `TreeSpec` of
      `{ files, folders }`, building real `TFolder.children` arrays, not just the ancestor-chain
      `makeFolderChain` already there) and a `describe('applyRuleToExistingNotes', ...)` block
      covering: every note directly in the folder gets tagged; notes nested in subfolders also get
      tagged; a nested note's own folder rule combines with the ancestor rule just saved; a note
      that already has every configured tag is left untouched (no `processFrontMatter` call at
      all); a non-markdown file in the tree is ignored; a file whose cache isn't resolved yet is
      skipped without throwing (and doesn't block the rest of the walk).
- [x] Update `spec/requirements.md`: new Requirement 7 (retroactively apply a saved rule to
      existing notes) with acceptance criteria 7.1–7.4.
- [x] Update `spec/design.md`: new "Retroactive apply on save" section; revise the modal section's
      Save-button bullet; correct the "Out of scope" bullet that previously blanket-stated no
      retroactive tagging, scoping it to passive triggers only.
- [x] Update `documentation/{Architecture,Business Rules}.md` to match.
- [x] Run `bun run tsc && bun run lint && bun run test && bun run build && bun run rules:check`.
- [x] **Manual vault verification (cannot be checked by tests or build):** create a few notes in a
      folder with no rule, then configure a rule on that folder and confirm the existing notes get
      tagged immediately on Save (not just new ones going forward); confirm existing notes in a
      subfolder several levels down get tagged too; confirm a note that already had one of the
      configured tags doesn't get a duplicate; confirm clearing an existing rule back to empty and
      saving does **not** remove any tag from any note.

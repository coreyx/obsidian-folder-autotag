# Domain Model

## FolderTagRule

A folder's automatic-tagging rule: the set of tags newly created notes in that folder should
receive.

```ts
interface FolderTagRule {
    folderPath: string // vault-relative; also the storage key
    tags: string[] // normalized: no leading '#', trimmed, de-duplicated
}
```

Persisted as `PluginSettings.folderTagRules: Record<string, string[]>`, keyed by folder path
rather than as an array — a folder has at most one rule, so the map's built-in uniqueness matches
the domain and gives O(1) lookup on every note creation. `FolderTagRule[]` is only used at the
edges (e.g. a future settings overview), converting to/from the map form.

An empty tag list is not a valid rule — it means "no rule." `FolderTagRulesService.setRule` with an
empty list removes the entry instead of persisting `[]`.

A note's _effective_ tags are not just its own folder's `FolderTagRule` — they're the union of the
rules for its folder and every ancestor folder up to the vault root (`collectAncestorTags` in
`auto-tag.service.ts`). The map itself has no notion of this; each entry is still one folder's own
rule, edited and stored independently. Combining across ancestors is purely a read-time concern at
the point tags are applied to a note.

## Tag normalization

Applied everywhere a tag list is read or written (`domain/folder-tag-rule.ts`'s `normalizeTags`):
strip a leading `#`, trim whitespace, drop empty entries, de-duplicate case-sensitively (Obsidian
does not fold tag case). The same function normalizes user-entered tags and tags read back from a
note's `CachedMetadata`, so both sides of every duplicate check compare like with like.

See `documentation/Business Rules.md` for the tagging invariants this model exists to support, and
`documentation/Architecture.md` for how it's wired into the plugin.

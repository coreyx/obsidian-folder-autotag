# Business Rules

This document defines the core business rules. These rules MUST be respected in all implementations unless explicitly approved otherwise.

---

## Documentation Guidelines

When a new business rule is mentioned:

1. Add it to this document immediately
2. Use a concise format (single line or brief paragraph)
3. Maintain precision - do not lose important details for brevity
4. Include rationale where it adds clarity

---

## Folder Autotag

- **Additive-only tagging.** Automatic tagging only ever adds tags to a note's frontmatter; it
  never removes a tag, including when a folder's rule is later edited to drop a tag that was
  already applied to notes under the old rule. (Req 4.1; `spec/requirements.md`.)
- **Duplicate check scope.** "Already has this tag" is checked against everything Obsidian's own
  `MetadataCache` considers the note to have — frontmatter tags and inline `#tags` in the body,
  via `getAllTags(cache)` — not frontmatter alone. (Req 4.2.)
- **Fires when a note is added to a configured folder — created there or moved in.** Creation is
  handled via `vault.on('create')` paired with `metadataCache.on('changed')`; a move/drag is
  handled separately via `vault.on('rename')` with a changed parent folder, since Obsidian never
  fires `create` for a move (see `documentation/Architecture.md`). A _passive_ trigger (plugin
  reload, vault load) never retroactively tags notes that already existed in a folder before its
  rule was created, and a plain in-folder rename (no folder change) does not trigger it either —
  but see the next rule for the one deliberate exception.
- **Saving a folder's rule retroactively tags existing notes in it (and its subfolders).**
  `FolderTagModal`'s Save button, for a non-empty tag list, applies the folder's now-current
  combined tags to every existing markdown note already in that folder's subtree, at any depth —
  the one explicit, user-initiated exception to "no retroactive tagging." Clearing/removing a rule
  never does this (Req 7.4) — additive-only tagging still never removes a tag from any note.
- **A folder's rule follows the folder.** Renaming or moving a folder keeps its automatic-tagging
  rule attached (looked up and updated by path via the vault's `rename` event); deleting a folder
  drops its rule.
- **Empty tag list means no rule.** Configuring a folder with zero tags is equivalent to having no
  rule for that folder, not a rule that applies zero tags — persisting an empty array is treated
  as rule removal.
- **Subfolders inherit ancestor rules, combined.** A note's configured tags are the union of its own
  folder's rule and every ancestor folder's rule up to the vault root — not just its immediate
  folder's, and not only the nearest configured ancestor. No level's rule shadows another's; a
  folder with no rule of its own simply contributes nothing. (Req 5.1's independence — "Folder A's
  rule doesn't apply to Folder B's notes" — only holds between folders that aren't in an
  ancestor/descendant relationship; Req 5.4, 5.5.) A sibling or otherwise unrelated folder's rule
  still never applies — only ancestors in the note's own folder chain do.
- **Ignore folder notes.** When a folder's automatic-tagging rule has "Ignore folder notes" enabled
  (true), the plugin does not apply that folder's configured automatic tags to any note whose name
  (excluding extension) matches the folder's name (e.g. `Games.md` inside `Games`). Other notes in
  the folder receive tags normally. The setting is configured per folder via a checkbox in the
  folder auto-tag modal, defaults to disabled (false), follows the folder across renames, is removed
  on folder deletion or rule removal, and is respected during both active tagging (creation/move)
  and retroactive tagging on save.


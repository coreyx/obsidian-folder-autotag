---
title: Usage
nav_order: 2
---

# Usage

Folder Autotag lets you configure one or more tags for a folder. Notes in that folder — created
there, moved in, or already there when you save the rule — get those tags added to their
frontmatter automatically.

## Configuring a folder

1. Right-click a folder in the file explorer.
2. Select **Set Auto-Tag**.
3. Enter one or more tags, separated by commas or newlines (for example: `work, urgent`).
4. Select **Save**.

The dialog's title names the folder you're configuring, so there's no ambiguity about which one
you're editing. Reopening it for a folder that already has a rule pre-fills the tags you configured
last, ready to edit.

To remove a folder's rule, reopen the dialog, clear the field, and select **Save**.

## What happens automatically

Once a folder has a rule:

- **New notes** created in that folder are tagged the moment they're created.
- **Notes moved or dragged in** from elsewhere are tagged too — it doesn't matter how a note ends
  up in the folder.
- **Existing notes** already in the folder are tagged immediately when you save the rule, so you
  never have to go back and manually tag notes that predate it.
- **Subfolders inherit the rule.** A note in a subfolder receives its own folder's tags _and_ every
  ancestor folder's tags, combined. For example, if `Projects` is tagged `work` and
  `Projects/Alpha` is tagged `alpha`, a note in `Projects/Alpha` gets both `work` and `alpha`.

## What it never does

- **Never removes a tag.** Editing or clearing a folder's rule never strips a tag that's already on
  a note.
- **Never duplicates a tag.** If a note already has a configured tag — in its frontmatter, or as an
  inline `#tag` in the note's body — it's not added a second time.
- **Never tags a note just because you renamed it.** Renaming a note without moving it to a
  different folder doesn't trigger tagging.

## Commands

Folder Autotag doesn't add any command-palette commands. Everything is driven from a folder's
context menu (**Set Auto-Tag**).

## Requirements for Ignore Folder Notes

### Summary

In Obsidian, users frequently organize their vaults using "folder notes" (notes whose file name matches their parent folder's name, such as `Games/Games.md`). These notes serve as an index, dashboard, or overview for the folder rather than representing an individual item within that category.

When automatic tagging is configured for a folder (for example, applying the `#game` tag to notes in `Games/`), users often want normal notes (such as `Games/diablo.md`) to be tagged automatically, while keeping the folder overview note (`Games/Games.md`) untagged or tagged differently.

This feature introduces a per-folder setting, **Ignore folder notes**, presented as a checkbox in the folder auto-tag popup. When enabled (true), the plugin will not apply any automatic tags configured for that folder to a note directly within that folder whose file name matches the folder name. Other notes within the folder receive the automatic tags as usual. When disabled (false, the default), folder notes continue to receive configured automatic tags, maintaining full backward compatibility.

---

### 1. Configure "Ignore folder notes" setting for a folder

**User story:** As an Obsidian user, I want to toggle an "Ignore folder notes" setting in the folder auto-tag popup so that I can decide on a per-folder basis whether folder overview notes should be excluded from automatic tagging.

**Requirement:** **When** a user opens the auto-tag configuration popup for a folder, **the system shall** display an "Ignore folder notes" checkbox setting.

#### Acceptance criteria

1.1. The folder auto-tag popup shall provide a checkbox setting labeled **Ignore folder notes**.

1.2. The setting shall include an explanatory description indicating that notes matching the folder name will not receive the automatic tags configured for that folder.

1.3. The checkbox shall display the current persisted state for that folder, defaulting to unchecked (false) if no setting has been previously saved.

1.4. The setting shall be configurable independently for each folder that has folder-autotag data.

---

### 2. Persist "Ignore folder notes" setting per folder

**User story:** As an Obsidian user, I want the "Ignore folder notes" setting to be saved alongside the folder's automatic tagging rule so that my configuration persists and follows the folder.

**Requirement:** **When** a user saves the automatic tagging configuration for a folder, **the system shall** persist the state of the "Ignore folder notes" setting associated with that folder.

#### Acceptance criteria

2.1. Clicking **Save** in the folder auto-tag popup shall persist the "Ignore folder notes" setting associated with the folder's path.

2.2. Canceling or closing the popup without saving shall discard any modifications made to the checkbox state.

2.3. When an automatic tagging rule for a folder is removed (e.g. by clearing all tags), the system shall also remove the associated "Ignore folder notes" setting for that folder.

2.4. When a folder with an automatic tagging rule is renamed or moved, the system shall migrate its "Ignore folder notes" setting to the new folder path.

2.5. When a folder with an automatic tagging rule is deleted, the system shall remove its associated "Ignore folder notes" setting.

---

### 3. Exclude folder notes during automatic tagging of newly added or moved notes

**User story:** As an Obsidian user, I want a note matching its parent folder's name to be excluded from automatic tagging when the setting is enabled, so that my folder index notes do not receive category tags.

**Requirement:** **When** a note is added to or moved into a folder with automatic tagging configured, **the system shall** skip applying that folder's configured automatic tags if "Ignore folder notes" is enabled and the note's name matches the folder name.

#### Acceptance criteria

3.1. When "Ignore folder notes" is enabled for a folder, a note located directly within that folder whose base name matches the folder name (e.g., `Games/Games.md`) shall not receive the automatic tags configured for that folder.

3.2. When "Ignore folder notes" is enabled for a folder, any note directly within that folder whose base name does not match the folder name (e.g., `Games/diablo.md`) shall receive the automatic tags configured for that folder.

3.3. When "Ignore folder notes" is disabled (or unset) for a folder, notes whose base name matches the folder name shall receive the automatic tags configured for that folder normally.

3.4. Name matching shall compare the note's file base name (without the `.md` extension) against the parent folder's name.

---

### 4. Exclude folder notes during retroactive tagging on save

**User story:** As an Obsidian user, I want existing folder notes to be skipped when retroactive tagging runs after saving a rule, so that pre-existing folder index notes remain untagged.

**Requirement:** **When** a user saves an automatic-tagging rule with "Ignore folder notes" enabled, **the system shall** apply the configured tags to pre-existing notes in the folder while excluding notes whose name matches the folder name.

#### Acceptance criteria

4.1. Saving a folder rule with "Ignore folder notes" enabled shall not apply the folder's configured tags to any pre-existing markdown note directly in the folder whose name matches the folder name.

4.2. Saving a folder rule with "Ignore folder notes" enabled shall apply the folder's configured tags to pre-existing markdown notes directly in the folder whose name does not match the folder name.

4.3. Saving a folder rule with "Ignore folder notes" disabled shall apply the folder's configured tags to all pre-existing markdown notes directly in the folder, including folder notes.

---

### 5. Inherited tag rules across subfolders with folder notes

**User story:** As an Obsidian user, I want folder note exclusion to evaluate accurately across subfolder hierarchies, so that each folder's exclusion setting applies specifically to its own rule and notes.

**Requirement:** **Where** a note resides within a subfolder and inherits automatic tags from ancestor folders, **the system shall** evaluate the "Ignore folder notes" condition independently for each folder rule in the hierarchy.

#### Acceptance criteria

5.1. A folder's "Ignore folder notes" setting shall apply specifically to notes directly contained in that folder (`file.parent.path === folder.path`) matching that folder's name (`file.basename === folder.name`).

5.2. If a subfolder has automatic tagging configured with "Ignore folder notes" enabled, a note directly in that subfolder matching the subfolder's name (e.g., `Games/RPG/RPG.md`) shall not receive the subfolder's configured tags.

5.3. If an ancestor folder has automatic tagging configured, the subfolder note (e.g., `Games/RPG/RPG.md`) does not match the ancestor folder's name (`Games`), and therefore shall receive the ancestor folder's configured tags via inheritance.

5.4. A note in a subfolder that happens to match an ancestor folder's name (e.g., `Games/RPG/Games.md`) is not a direct folder note of `Games`, and shall receive the ancestor folder's configured tags via normal inheritance.

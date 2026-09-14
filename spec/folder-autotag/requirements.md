## Requirements for Obsidian Folder Autotag

### 1. Configure automatic tagging for a folder

**User story:** As an Obsidian user, I want to configure automatic tagging for a folder so that notes added to the folder can be tagged automatically.

**Requirement:** **When** a user opens the context menu for a folder and selects **Auto Tagging**, **the system shall** display the folder’s automatic-tagging configuration.

#### Acceptance criteria

1.1. The folder context menu shall provide an **Auto Tagging** option.

1.2. Selecting **Auto Tagging** shall open a configuration interface for the selected folder.

1.3. The configuration interface shall identify the folder being configured.

### 2. Assign tags to the folder’s automatic-tagging rule

**User story:** As an Obsidian user, I want to assign one or more tags to a folder so that those tags can be applied automatically to notes in that folder.

**Requirement:** **When** a user configures automatic tagging for a folder, **the system shall** allow the user to specify one or more tags to apply automatically.

#### Acceptance criteria

2.1. The user shall be able to select or enter tags for the rule.

2.2. The user shall be able to configure multiple tags for the same folder.

2.3. The system shall preserve the configured tags as part of the folder’s automatic-tagging rule.

### 3. Apply configured tags to newly added notes

**User story:** As an Obsidian user, I want newly added notes to receive the tags configured for their folder so that I do not have to tag each note manually.

**Requirement:** **When** a note is added to a folder with automatic tagging configured, **the system shall** apply all tags configured for that folder to the note.

#### Acceptance criteria

3.1. Each newly added note shall receive every tag configured for the destination folder.

3.2. The tags shall be applied automatically without requiring the user to tag the note manually.

3.3. The behavior shall apply whenever a note is subsequently added to the configured folder.

### 4. Preserve existing note tags

**User story:** As an Obsidian user, I want automatic tagging to preserve tags already assigned to a note so that existing organization is not lost.

**Requirement:** **When** the system automatically tags a note, **the system shall** add the configured tags without removing the note’s existing tags.

#### Acceptance criteria

4.1. Tags already assigned to a note shall remain assigned after automatic tagging.

4.2. If a configured tag is already assigned to the note, the system shall not create a duplicate instance of that tag.

### 5. Maintain automatic tagging independently for each folder

**User story:** As an Obsidian user, I want each folder to have its own automatic-tagging configuration so that notes receive tags based on their destination folder.

**Requirement:** **When** automatic tagging is configured for multiple folders, **the system shall** apply each folder’s rule only to notes added to that folder.

#### Acceptance criteria

5.1. A tag rule configured for Folder A shall not automatically apply to notes added to Folder B, unless Folder B is a subfolder of Folder A (see 5.4).

5.2. Different folders shall be able to have different automatic-tagging configurations.

5.3. Adding a note to a folder shall use the rule associated with that destination folder at the time of addition.

5.4. A folder’s configured tags shall also apply to notes added to any of its subfolders, at any depth (a subfolder of a subfolder, and so on).

5.5. If a note’s destination folder and one or more of its ancestor folders each have a rule, the note shall receive the combined set of tags from all of them.

### 6. Reduce repetitive tagging work

**User story:** As an Obsidian user, I want folder-based automatic tagging to continue operating without manual intervention so that I can reduce repetitive tagging work.

**Requirement:** **When** a user repeatedly adds notes to a folder with the same organizational purpose, **the system shall** automatically apply the folder’s configured tags so that the user does not need to repeat the tagging action for each note.

#### Acceptance criteria

6.1. The user shall not need to manually apply the configured tags to each newly added note.

6.2. The same configured tags shall be applied consistently to all applicable notes.

6.3. The automatic-tagging behavior shall continue until the folder’s configuration is changed or removed.

### 7. Retroactively apply a saved rule to existing notes

**User story:** As an Obsidian user, I want notes already in a folder to receive a newly configured tag as soon as I save that folder’s rule, so that I don’t have to manually tag notes that predate the rule.

**Requirement:** **When** a user saves a non-empty automatic-tagging rule for a folder, **the system shall** apply the folder’s current configured tags to every existing note already in that folder or any of its subfolders.

#### Acceptance criteria

7.1. Saving a folder’s rule shall apply its configured tags to every existing markdown note already directly in that folder.

7.2. Saving a folder’s rule shall also apply its configured tags to every existing markdown note in any of its subfolders, at any depth.

7.3. A note that already has a configured tag shall not receive a duplicate instance of it.

7.4. Clearing (removing) a folder’s rule shall not remove any tag from any existing note.

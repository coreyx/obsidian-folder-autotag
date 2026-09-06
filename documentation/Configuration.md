# Configuration

## Settings shape (`data.json`, via `loadData()`/`saveData()`)

```ts
interface PluginSettings {
    enabled: boolean
    /** Automatic-tagging rules, keyed by vault-relative folder path. */
    folderTagRules: Record<string, string[]>
}
```

`folderTagRules` maps a folder's path to its normalized tag list (no leading `#`, trimmed,
de-duplicated — see `documentation/Domain Model.md`). A folder absent from the map has no
automatic-tagging rule. There is no separate settings-tab UI for this map today — it's configured
per folder via that folder's context menu (**Set Auto-Tag**), not the main plugin settings pane.

`loadSettings()` defensively defaults `folderTagRules` to `{}` if a loaded `data.json` doesn't have
it as a plain object (e.g. upgrading from a pre-feature install), mirroring the existing defaulting
already done for `enabled`.

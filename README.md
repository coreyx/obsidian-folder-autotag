# Folder Autotag

Automatically tag notes based on the folder they're in. Configure a folder once, and every note
added to it — created there, moved in, or already sitting there when you save the rule — gets
tagged for you.

## Features

- **Per-folder tag rules** — right-click any folder → **Set Auto-Tag** → enter one or more tags.
- **Applies automatically** — a note created in (or moved into) a configured folder gets tagged the
  moment it arrives, no manual tagging required.
- **Subfolders inherit rules** — a folder's tags apply to every note in its subfolders too, at any
  depth, combined with a subfolder's own rule if it has one.
- **Ignore folder notes** — optionally exclude notes matching the folder name (e.g. `Games.md` in
  `Games/`) from receiving that folder's automatic tags.
- **Retroactive on save** — saving a folder's rule immediately tags existing notes already in that
  folder (and its subfolders), not just ones added afterward.
- **Never destructive** — only adds tags, never removes one, and never duplicates a tag a note
  already has, whether it's in the frontmatter or an inline `#tag` in the body.

## Installation

This plugin isn't yet available in Obsidian's community plugin catalog.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the
   [latest release](https://github.com/coreyx/obsidian-folder-autotag/releases).
2. Copy them into `<your vault>/.obsidian/plugins/obsidian-folder-autotag/`.
3. Reload Obsidian and enable **Folder Autotag** under **Settings → Community plugins**.

### Via BRAT (beta testing)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. Add this repository as a beta plugin: `coreyx/obsidian-folder-autotag`.

## Quick start

1. Right-click a folder in the file explorer and select **Set Auto-Tag**.
2. Enter one or more tags (comma- or newline-separated), then select **Save**.
3. Any note already in that folder or its subfolders is tagged immediately; every note added
   afterward is tagged automatically.

See the [user guide](./docs/usage.md) for more detail.

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for setup and the full development workflow.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## News & support

To stay up to date about this plugin, or what I'm currently up to:

- Subscribe to [my newsletter](https://coreystruzan.com/newsletter)
- Subscribe to [my YouTube channel](https://youtube.com/@coreystruzan)

If this plugin is useful to you, here are the best ways to support my work ❤️:

- [Become a GitHub Sponsor](https://github.com/sponsors/coreyx)
- [Buy me a coffee](https://www.buymeacoffee.com/coreystruzan)
- [Subscribe to my YouTube channel](https://youtube.com/@coreystruzan)

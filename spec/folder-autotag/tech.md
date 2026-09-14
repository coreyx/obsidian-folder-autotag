## Tech stack

Based on the current state of the repo (`package.json`, `tsconfig.json`, `eslint.config.ts`, `scripts/build.ts`).

### Platform

- **Target:** Obsidian Community Plugin. `minAppVersion` `1.13.0` (`manifest.json`) — the plugin
  relies on the declarative `getSettingDefinitions()` settings API introduced in that release.
- **`isDesktopOnly`:** `false` — no Node/Electron-only APIs; must stay mobile-compatible.
- **Obsidian typings:** `obsidian@1.13.1` (dev dependency, pinned to the latest public release,
  never `latest`). Always check `node_modules/obsidian/obsidian.d.ts` for exact API shapes before
  using a new API — signatures change between versions.

### Language & runtime

- **TypeScript**, strict mode (`tsconfig.json`): `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noUnusedLocals`/`noUnusedParameters`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `noEmitOnError` all on. No
  `any`, no `as any`/`as unknown as`, no `@ts-ignore`/`@ts-expect-error` (enforced by
  `scripts/git-hooks/check-rule-integrity.sh` and `bun run rules:check`, not just convention).
- **Module system:** ESNext modules, bundler resolution, `verbatimModuleSyntax` (type-only imports
  must use `import type`).
- **[Bun](https://bun.com/)** — package manager, test runner, and bundler. Use `bun`/`bunx`, never
  `npm`/`yarn`/`pnpm`/`node`/`ts-node`.

### Build

- Custom bundler script: `scripts/build.ts` (uses `Bun.build`), not webpack/esbuild directly.
    - `bun run dev` — watch build.
    - `bun run build` — `tsc --noEmit` (typecheck) then `scripts/build.ts --prod`.
    - Inlines `CHANGELOG.md` into the bundle via a `define` (`__PLUGIN_CHANGELOG__`), not a text
      import — see `src/app/whats-new.ts` for why (import attributes for `.md` aren't resolvable on
      every Bun version the community-catalog reviewer might run).
    - Copies `manifest.json`, `versions.json`, and everything under `src/assets/` to `dist/` /
      the plugin folder as static, unbundled files.
- Output: `main.js` (bundled), `styles.css` (compiled Tailwind), `manifest.json` — the three
  release artifacts, plus optionally `versions.json` for local dev deployment.

### Styling

- **Tailwind CSS v4** (`@tailwindcss/cli`), source at `src/styles.src.css`, compiled to
  `styles.css` at build time. Never hand-edit the generated `styles.css`.
- Obsidian theme variables (`var(--text-normal)`, `var(--background-modifier-hover)`, etc.) are
  used directly in custom CSS where Tailwind utilities can't reach into the host theme.

### State management

- **Immer** (`immer`) — plugin settings (`this.settings`) are held as an immutable object; every
  mutation goes through `produce()` inside `FolderAutotagPlugin.updateSettings()`
  (`src/app/plugin.ts`), which persists to disk (`saveData`) before committing the new settings to
  memory, and serializes concurrent writes through a promise chain so overlapping edits can't drop
  each other.
- **Zod** (`zod`) is a declared dependency, currently unused. Available for runtime validation of
  data crossing a boundary (e.g. `loadData()` results) if a schema check becomes worth the
  complexity; not required for simple shape checks like the existing `typeof x === 'boolean'`
  guards in `loadSettings()`.

### Settings UI

- Declarative settings, not the legacy `display()` override: `PluginSettingTab` subclasses
  implement `getSettingDefinitions()` (Obsidian 1.13+). See
  `src/app/settings/settings-tab.ts` and the "Declarative settings" rules in `AGENTS.md` — every
  rule there was written after a bug it caused, so treat it as load-bearing, not optional
  style guidance.
- `src/app/settings/settings-guard.spec.ts` statically greps settings source for two known-fatal
  anti-patterns (writing outside a render hook's own row; removing a row) since nothing in CI
  renders a real settings pane.

### Linting & formatting

- **ESLint 9** (flat config, `eslint.config.ts`) with `typescript-eslint` and
  `eslint-plugin-obsidianmd` (the same ruleset the community-catalog reviewer runs). `--max-warnings
0` — every warning is a build failure.
- **Prettier** for formatting (`prettier.config.cjs`). Run `bun run format` after edits.
- **Husky** + **lint-staged** run formatting/linting on `pre-commit`; a separate
  `check-rule-integrity.sh` pre-commit hook blocks any staged diff that weakens the lint/TS
  baseline or reintroduces a forbidden pattern (`eslint-disable`, `@ts-ignore`, `any`, etc.).
- **Commitlint** (`commitlint.config.ts`) + **Commitizen** (`cz-customizable`, `.cz-config.cjs`)
  enforce Conventional Commits with a fixed `type(scope)` list.

### Testing

- **`bun:test`**, run via `bun run test` (adds `--isolate` — mandatory, see `AGENTS.md`/`bunfig.toml`
  for why: without it, `mock.module('obsidian', ...)` in `src/test-setup.ts` leaks between spec
  files and causes order-dependent failures).
- Test files: `*.spec.ts`, colocated next to the file under test (e.g.
  `src/app/utils/release-notes.ts` / `release-notes.spec.ts`).
- The `obsidian` module itself is mocked (`src/test-setup.ts`) — there is no real Obsidian runtime
  in CI or in `bun test`; any code that needs real DOM/App behavior (a live settings pane, a real
  vault) requires manual verification in an actual vault, not a test.

### CI/CD

- **GitHub Actions**: `ci.yml` runs `bun run validate` (`tsc` + `test` + `lint` + `rules:check` in
  parallel) on push/PR. A two-phase `release.yml` (`prepare` bumps versions/changelog and tags,
  `publish` builds/attests/creates the GitHub release at the tagged commit) — see "Cutting a
  release" in `AGENTS.md`.
- `actions/attest-build-provenance@v3` attaches build provenance to release artifacts.

### Repo scaffolding relevant to new features

Empty-but-present directories (each holds a `.gitkeep` only, no code yet):

- `src/app/commands/` — command/menu-item registration.
- `src/app/domain/` — domain types (entities, value objects) independent of Obsidian's API shapes.
- `src/app/services/` — application logic that isn't UI and isn't a raw Obsidian API call.
- `src/app/settings/components/` — reusable settings-UI render helpers.

New feature code should land in these existing folders rather than inventing new top-level
directories, per `AGENTS.md`'s "Example file structure" convention (`main.ts` stays
lifecycle-only; commands/, ui/, utils/, types.ts hold the rest).

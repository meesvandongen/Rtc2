# Contributing

This repo uses **pnpm** (pinned via `packageManager`; `corepack enable` picks
it up automatically).

```bash
pnpm install
pnpm run storybook        # http://localhost:6006
pnpm run typecheck
pnpm run build:lib        # dist/index.js + dist/style.css + dist/index.d.ts
pnpm run build:storybook  # → storybook-static/
pnpm run test:e2e         # Playwright, against the built Storybook
```

`pnpm install` will ask to approve build scripts the first time. `esbuild` is
on the approved list because Storybook's core needs its postinstall to link a
platform binary; without it `build:storybook` fails.

## Tests

The Playwright suite drives the real Storybook build: it starts `vite preview`
over `storybook-static/`, so run `pnpm run build:storybook` first. The
remote-pagination specs intercept `/api/people` with Mock Service Worker.

If your environment provides its own Chromium instead of Playwright's managed
download, point the suite at it:

```bash
CHROMIUM_PATH=/path/to/chromium pnpm run test:e2e
```

`e2e/overlays.spec.ts` opens every overlay in every UI-library adapter, and is
what enforces the prop-spreading rule any new adapter has to satisfy. `17
Stress` is the exception to one-story-file-per-feature: it holds the sizes and
conditions no feature story reaches — 50,000 rows, 252 columns, every feature
at once over 5,000 rows, a five-level tree, cell values chosen to break
formatters, and data replaced ten times a second. `e2e/stress.spec.ts` drives
those stories, so the suite also bounds what the table mounts and how long an
interaction over the largest fixture may take.

## Documentation

Prose documentation lives in Storybook, as MDX pages under `stories/docs/`;
each feature area also has a story file in `stories/`, and every story file
gets an autodocs page. The **Code** panel beside the canvas shows the story's
own source with a copy button (`source.type` is `code` rather than `dynamic`:
these stories are `render` functions, and the dynamic snippet would show the
rendered element tree instead of the code worth copying).

The README's screenshots are generated, not hand-captured. With Storybook
running on port 6006:

```bash
pnpm run storybook
node scripts/screenshots.mjs        # writes docs/media/*.png
```

## Changesets

Versioning and the changelog are handled by
[changesets](https://github.com/changesets/changesets). Any change a consumer
could notice ships with one:

```bash
pnpm changeset            # pick the bump, write the entry
pnpm changeset:status     # what is pending against main
```

The version in `package.json` is never edited by hand. `.github/workflows/release.yml`
keeps a "Version Packages" pull request open while changesets are pending on
`main`; merging it applies the bumps, writes `CHANGELOG.md`, and publishes to
npm. See [`.changeset/README.md`](.changeset/README.md) for which bump to pick.

## Build toolchain

The library is bundled by [tsdown](https://tsdown.dev), which runs on
**rolldown** and emits declarations through `rolldown-plugin-dts`; CSS goes
through **lightningcss** via `@tsdown/css`. Storybook builds on Vite 8, which
is also rolldown-backed. No rollup anywhere; the only remaining esbuild is
Storybook core's own internal dependency, which cannot be removed without
dropping Storybook.

Two things about the output worth knowing:

- The bundle is **not minified**. That is deliberate for a library — consumers
  minify, and shipping readable code plus a sourcemap makes debugging possible.
- The stylesheet is emitted per entry point (tsdown's `css.splitting`) —
  `dist/index.css` for the root import, `dist/adapters/radix.css` and
  `dist/adapters/lolmath.css` for the two adapters that ship their own CSS —
  and exposed on the stable `@mvd/table/styles.css`, `@mvd/table/radix.css`
  and `@mvd/table/lolmath.css` subpaths respectively. Splitting is what keeps
  an adapter's CSS out of every other consumer's stylesheet. Importing the
  package's JS does **not** inject styles; the CSS import is separate and
  explicit.

## Deployment

Storybook is published to Cloudflare Pages at
[table.mvd.im](https://table.mvd.im):

| Setting | Value |
| --- | --- |
| Build command | `pnpm run build:storybook` |
| Output directory | `storybook-static` |
| Node version | from `.nvmrc` (22) |

## Layout

```
src/
  DataTable.tsx        top-level component
  useDataTable.tsx     state ownership + TanStack wiring
  features.ts          the registered v9 feature set
  types.ts             the public option surface
  styles.css           theme variables + structural CSS
  themes.ts            preset variable maps
  locale.ts            localizable strings
  editing.ts           edit-mode rules
  displayColumns.tsx   generated select/expand/number/actions columns
  dragContext.tsx      pointer-based drag reordering
  components/          head, body, toolbar, filters, menus, primitives
  components/
    registry.tsx       the component contract + provider
    defaultComponents  the built-in, dependency-free implementation
    FilterPanel.tsx    standalone filter pane
    FilterEditor.tsx   per-variant editor, shared by popover and panel
  adapters/            MUI, Radix, Mantine and @lolmath/ui registry adapters —
                        each its own optional `@mvd/table/<name>` export
stories/               one file per feature area
stories/docs/          the prose documentation, as Storybook MDX pages
e2e/                   Playwright specs
scripts/               screenshot generation for the README
tsdown.config.ts       library build (rolldown + lightningcss)
```

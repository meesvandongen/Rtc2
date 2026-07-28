# @rtc2/react-table

A batteries-included, CSS-variable-themable React table component built on
[TanStack Table v9 (beta)](https://tanstack.com/table).

TanStack Table is headless — it gives you state and row models and leaves the
markup to you. This package is the other half: a single `<DataTable />` that
renders all of it, exposes every v9 feature behind an `enable*` prop, and is
styled entirely through CSS custom properties so it can be made to look like
Material, shadcn/ui, Ant, Linear, or a spreadsheet without overriding a single
selector.

```tsx
import { DataTable, createDataTableColumnHelper } from '@rtc2/react-table'
import '@rtc2/react-table/styles.css'

type Person = { id: string; name: string; age: number }

const helper = createDataTableColumnHelper<Person>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('age', { header: 'Age', meta: { align: 'right' } }),
])

export function People({ data }: { data: Person[] }) {
  return <DataTable columns={columns} data={data} getRowId={(row) => row.id} />
}
```

> **Keep `columns` and `data` stable.** TanStack v9 requires it. The component
> defensively stabilizes arrays whose contents have not changed, but defining
> them outside render (or in `useMemo`) is still the right thing to do.

## Contents

- [Install](#install)
- [Features](#features)
- [Bring your own components](#bring-your-own-components)
- [Filtering](#filtering)
- [Theming](#theming)
- [Server-side data](#server-side-data)
- [Editing](#editing)
- [Controlling state](#controlling-state)
- [Accessibility](#accessibility)
- [Development](#development)

## Install

```bash
pnpm add @rtc2/react-table   # or npm install / yarn add
```

`react` and `react-dom` (>= 18) are peer dependencies. `@tanstack/react-table`
and `@tanstack/react-virtual` are direct dependencies, so a plain install is
enough.

Import the stylesheet once, anywhere in your app:

```ts
import '@rtc2/react-table/styles.css'
```

## Features

Each of these has a dedicated Storybook story.

| Area | Options |
| --- | --- |
| Sorting | `enableSorting`¹, `enableMultiSort`¹, `enableSortingRemoval`¹, `sortDescFirst`, `maxMultiSortColCount`, `manualSorting`, per-column `sortFn` |
| Column filtering | `enableColumnFilters`¹, `filterDisplayMode` (`popover` \| `panel` \| `popover-and-panel` \| `none`), `filterPanelPosition`, `enableFilterModes`, `showActiveFilterChips`¹, `manualFiltering`, 9 filter variants |
| Global filtering | `enableGlobalFilter`¹, `globalFilterFn`, `enableGlobalFilterToggle`¹ |
| Faceting | `enableFaceting`¹ — auto-populates select/autocomplete/checkbox filter options |
| Pagination | `enablePagination`¹, `paginationDisplayMode`, `paginationPosition`, `pageSizeOptions`, `manualPagination`, `rowCount`, `pageCount`, `autoResetPageIndex` |
| Row selection | `enableRowSelection` (bool or predicate), `enableMultiRowSelection`¹, `enableSubRowSelection`¹, `enableSelectAll`¹, `selectDisplayMode` (`checkbox` \| `radio` \| `switch`), `enableClickToSelect` |
| Cell selection | `enableCellSelection`, `enableCellRangeSelection`, `enableMultiCellRangeSelection` |
| Column visibility | `enableColumnVisibility`¹, `enableHiding`¹ |
| Column ordering | `enableColumnOrdering`, `enableColumnDragging` |
| Column pinning | `enableColumnPinning` — start/end, sticky with an edge shadow |
| Row pinning | `enableRowPinning`, `rowPinningDisplayMode` (`sticky` \| `top` \| `bottom` \| `top-and-bottom`) |
| Column resizing | `enableColumnResizing`, `columnResizeMode`, `columnResizeDirection`, keyboard-operable grips |
| Grouping | `enableGrouping`, `enableGroupingChips` (drag-to-group), `groupedColumnMode` |
| Aggregation | `enableAggregation`¹, per-column `aggregationFn` + `aggregatedCell` |
| Expanding | `enableExpanding`, `enableExpandAll`¹, `getRowCanExpand`, `paginateExpandedRows`¹, `renderDetailPanel` |
| Row utilities | `enableRowNumbers`, `rowNumberDisplayMode`, `enableRowActions`, `renderRowActions`, `rowActionMenuItems`, `positionActionsColumn`, `enableRowOrdering` |
| Editing | `enableEditing` (bool or predicate), `editMode` (`cell` \| `row` \| `table` \| `modal`), 5 editor variants, `onEditingRowSave`, `onCellEditComplete`, `onDataChange` |
| Virtualization | `enableRowVirtualization`, `rowVirtualizerOptions` |
| Layout | `layoutMode` (`semantic` \| `grid` \| `grid-no-grow`), `density`, `height`, `maxHeight`, `direction` (LTR/RTL) |
| Chrome | `enableTopToolbar`¹, `enableBottomToolbar`¹, `enableToolbarInternalActions`¹, `enableDensityToggle`¹, `enableFullScreenToggle`¹, `enableColumnActions`, `enableStickyHeader`, `enableStickyFooter`, `enableStripes`, `enableRowHover`¹, `enableBorders` |
| States | `isLoading`, `showProgressBars`, `isSaving`, `isLoadingError`, `errorMessage`, `skeletonRowCount`, `renderEmptyState` |
| i18n | `localization` — every string, including filter operator names |
| Escape hatches | `components`, `classNames`, `cssVars`, `tableProps`, `containerProps`, `rowProps`, `cellProps`, `headCellProps`, `renderTopToolbarActions`, `renderBottomToolbarActions`, `renderToolbarInternalActions`, `renderCaption` |

¹ on by default; everything else is opt-in.

### Filter variants

Set `meta.filterVariant` on a column: `text`, `autocomplete`, `select`,
`multi-select`, `checkbox`, `range`, `range-slider`, `date`, `date-range`.
Options for the select-family variants come from faceted unique values unless
you pass `meta.filterSelectOptions`.

```tsx
helper.accessor('department', {
  header: 'Department',
  meta: { filterVariant: 'select' },
})
```

### Feature registration

v9 gates state and instance APIs on an explicitly registered feature list. This
component registers the whole stock set once, in `dataTableFeatures`, and gates
behaviour with `enable*` props instead. That trades v9's per-feature
tree-shaking for one stable table type and a single prop surface — if you need
a minimal bundle for one narrow table, build your own `tableFeatures({ … })`
and use `useTable` directly.

## Bring your own components

Every interactive control the table renders — buttons, inputs, selects,
popovers, menus, the modal editor — comes from a component registry. Supply
your design system once and the whole table adopts it:

```tsx
import { DataTable, defaultComponents } from '@rtc2/react-table'

<DataTable columns={columns} data={data} components={myComponents} />
```

`components` is a partial override: anything omitted keeps its built-in
implementation, so replacing one control is as valid as replacing all of them.

Three constraints shaped the contract, each learned from making a real library
satisfy it:

- **Overlays take a rendered `trigger` element, not a render prop.** Radix
  clones it with `asChild`, MUI anchors to it, Ant wraps it. A render prop
  would suit none of them.
- **Lists are data, not children.** Ant's `Dropdown` takes `menu={{ items }}`
  and `Select` takes `options`; a children-based menu API simply cannot be
  backed by it. So `Menu` takes `RtcMenuItem[]` and `Select` takes options.
- **Overlays own their open state by default.** Each library manages focus,
  dismissal and portalling differently; `open`/`onOpenChange` exist only for
  when the table genuinely needs control.

Structural markup — `table`, `tr`, `th`, `td` — is deliberately *not* in the
registry. Column pinning, resizing and virtualization all depend on the exact
DOM and data attributes the table emits, so those stay ours and are styled
with CSS variables instead.

Working adapters for **MUI**, **Radix/shadcn** and **Ant Design** live in
`stories/adapters/` and are exercised by both Storybook (*15 UI Libraries*) and
the Playwright suite, which runs the same interaction tests against all three.

```tsx
import type { DataTableComponents } from '@rtc2/react-table'

const myComponents: Partial<DataTableComponents> = {
  Button: ({ children, onClick, variant, disabled }) => (
    <MyButton kind={variant} onPress={onClick} isDisabled={disabled}>
      {children}
    </MyButton>
  ),
}
```

## Filtering

**There is no in-table filter row.** A row of filter inputs forces every row to
the height of the tallest editor, and the useful editors — date ranges,
checkbox groups, range sliders — are tall. Filters live in two places instead,
selected with `filterDisplayMode`:

| Mode | Behaviour |
| --- | --- |
| `popover` (default) | A funnel button in each header opens that column's editor in a popover. |
| `panel` | A vertical, independently scrolling pane docked beside the table. |
| `popover-and-panel` | Both. |
| `none` | No built-in UI; drive `columnFilters` yourself. |

Because the editors are hidden until opened, active filters surface as
removable chips in the toolbar (`showActiveFilterChips`, on by default) and the
filtered column's header carries `data-rtc-filtered`.

The panel is also a standalone export, so it does not have to live inside the
table at all:

```tsx
const table = useDataTable({ columns, data, filterDisplayMode: 'none' })

return (
  <Layout>
    <Sidebar>
      <DataTableFilterPanel table={table} />
    </Sidebar>
    <DataTable table={table} />
  </Layout>
)
```

It installs its own component registry from the table's options, so it works
anywhere in the tree.

## Theming

Everything visual comes from custom properties declared on `.rtc-root`. Nothing
in the stylesheet hard-codes a colour, radius, or spacing value outside that
block, so a handful of overrides restyles the whole table.

```tsx
<DataTable
  columns={columns}
  data={data}
  cssVars={{
    '--rtc-color-accent': '#e11d48',
    '--rtc-radius': '20px',
    '--rtc-row-height-comfortable': '64px',
    '--rtc-header-text-transform': 'uppercase',
  }}
/>
```

Seven presets ship with the package:

```tsx
import { materialTheme } from '@rtc2/react-table'

<DataTable columns={columns} data={data} cssVars={materialTheme} />
```

`material`, `shadcn`, `ant`, `linear`, `spreadsheet`, `soft`, `highContrast` —
each a plain `Record<string, string>`, so copy one as a starting point.

Variables are grouped as `--rtc-color-*`, `--rtc-font-*` / `--rtc-header-*`,
metrics (`--rtc-radius`, `--rtc-cell-padding-*`, `--rtc-row-height-*`),
surfaces (`--rtc-row-bg-*`, `--rtc-cell-bg-*`) and effects (`--rtc-shadow-*`,
`--rtc-focus-ring`, `--rtc-transition`). See [`src/styles.css`](src/styles.css)
for the full list with defaults.

Dark mode follows `prefers-color-scheme`. Force it either way with
`data-rtc-theme="dark"` / `"light"` on the table or any ancestor.

## Server-side data

Set the `manual*` flags, feed the table the current page, and tell it the total
row count:

```tsx
<DataTable
  columns={columns}
  data={page.rows}
  manualPagination
  manualSorting
  manualFiltering
  rowCount={page.total}
  isLoading={isFetching}
  showProgressBars={page.rows.length > 0}
  isLoadingError={isError}
  state={{ pagination, sorting, globalFilter: search }}
  onPaginationChange={applyPaginationUpdater}
  onSortingChange={applySortingUpdater}
  onGlobalFilterChange={(next) => {
    applySearchUpdater(next)
    setPagination((old) => ({ ...old, pageIndex: 0 }))
  }}
/>
```

A complete working example — including the MSW handler it runs against — lives
in `stories/04-Pagination.stories.tsx` and `stories/remoteApi.ts`, covered
end-to-end by `e2e/remote-pagination.spec.ts`.

## Editing

Four modes, matching Material React Table's:

- `cell` — double-click a cell; commits on blur or Enter, reverts on Escape.
- `row` — an edit action turns the row into inputs with save/cancel.
- `table` — every cell is an input at once.
- `modal` — an edit action opens a focus-trapped dialog.

```tsx
<DataTable
  columns={columns}
  data={rows}
  enableEditing
  editMode="row"
  onEditingRowSave={({ values, exitEditingMode }) => {
    save(values)
    exitEditingMode()
  }}
/>
```

Editor widgets come from `meta.editVariant`: `text`, `number`, `select`,
`checkbox`, `date`. Generated columns (selection, expand, actions) are never
editable, and neither are display columns without an accessor.

## Controlling state

Each slice can be left alone, observed, or fully controlled — independently.

```tsx
// Uncontrolled, with a starting value.
<DataTable initialState={{ sorting: [{ id: 'name', desc: false }] }} … />

// Observed.
<DataTable onSortingChange={(updater) => log(updater)} … />

// Controlled.
<DataTable state={{ sorting }} onSortingChange={applySortingUpdater} … />
```

`initialState` also accepts the presentation-only slices — `density`,
`isFullScreen`, `showColumnFilters`, `showGlobalFilter`, `rowOrder`,
`columnFilterFns` — which makes saving and restoring a user's layout a single
object. `onStateChange` reports all of it, replacing the global callback v9
removed.

To read table state from the surrounding page, build the instance yourself:

```tsx
const table = useDataTable({ columns, data, enableRowSelection: true })
const selected = Object.keys(table.state.rowSelection).length
return <DataTable table={table} />
```

## Accessibility

- Native `<table>` semantics, with `scope`, `aria-sort`,
  `aria-rowcount`/`aria-colcount`, `aria-selected`, `aria-expanded` and
  `aria-busy` wired up.
- Every icon-only control takes its accessible name from `localization`.
- Menus are portalled, dismiss on Escape and outside click, support arrow-key
  roving focus, and restore focus to their trigger.
- The modal editor traps focus and is labelled `role="dialog" aria-modal`.
- Column resize grips are `role="separator"` and respond to arrow keys; row drag
  handles reorder with up/down arrows — both are usable without a pointer.
- `prefers-reduced-motion` disables animation and transitions.
- Opt into arrow-key cell navigation with `enableKeyboardNavigation`.

## Development

This repo uses **pnpm** (pinned via `packageManager`; `corepack enable` picks
it up automatically).

```bash
pnpm install
pnpm run storybook        # http://localhost:6006 — 105 stories
pnpm run typecheck
pnpm run build:lib        # dist/index.js + dist/style.css + dist/index.d.ts
pnpm run build:storybook  # → storybook-static/
pnpm run test:e2e         # Playwright, against the built Storybook
```

`pnpm install` will ask to approve build scripts the first time. `esbuild` is
on the approved list because Storybook's core needs its postinstall to link a
platform binary; without it `build:storybook` fails.

The Playwright suite (108 tests) drives the real Storybook build: it starts
`vite preview` over `storybook-static/`, so run `pnpm run build:storybook`
first. The remote-pagination specs intercept `/api/people` with Mock Service
Worker.

If your environment provides its own Chromium instead of Playwright's managed
download, point the suite at it:

```bash
CHROMIUM_PATH=/path/to/chromium pnpm run test:e2e
```

### Build toolchain

The library is bundled by [tsdown](https://tsdown.dev), which runs on
**rolldown** and emits declarations through `rolldown-plugin-dts`; CSS goes
through **lightningcss** via `@tsdown/css`. Storybook builds on Vite 8, which
is also rolldown-backed. No rollup anywhere; the only remaining esbuild is
Storybook core's own internal dependency, which cannot be removed without
dropping Storybook.

Two things about the output worth knowing:

- The bundle is **not minified**. That is deliberate for a library — consumers
  minify, and shipping readable code plus a sourcemap makes debugging possible.
- The stylesheet is emitted as `dist/style.css` (tsdown's name) and exposed on
  the stable `@rtc2/react-table/styles.css` subpath. Importing the package's
  JS does **not** inject styles; the CSS import is separate and explicit.

### Deployment

Storybook is published to Cloudflare Pages:

| Setting | Value |
| --- | --- |
| Build command | `pnpm run build:storybook` |
| Output directory | `storybook-static` |
| Node version | from `.nvmrc` (22) |

### Layout

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
stories/               one file per feature area
stories/adapters/      MUI, Radix and Ant Design registry adapters
e2e/                   Playwright specs
tsdown.config.ts       library build (rolldown + lightningcss)
```

## License

MIT

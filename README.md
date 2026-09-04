<div align="center">

# @mvd/table

**Every TanStack Table v9 feature, already rendered.**
One component, a prop per feature, and a design that changes with
a handful of CSS variables.

[![npm](https://img.shields.io/npm/v/@mvd/table.svg)](https://www.npmjs.com/package/@mvd/table)
[![license](https://img.shields.io/npm/l/@mvd/table.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-table.mvd.im-black)](https://table.mvd.im)

</div>

![A data table with a toolbar, filter funnels in every header, a sorted salary column and pagination](https://raw.githubusercontent.com/meesvandongen/Rtc2/main/docs/media/table.png)

TanStack Table is headless: it gives you state and row models and leaves the
markup to you. This package is the other half — one `<DataTable />` that renders
all of it, puts every v9 feature behind an `enable*` prop, and hard-codes no
colour, radius or spacing anywhere in its stylesheet.

```bash
npm install @mvd/table
```

```tsx
import { DataTable, createDataTableColumnHelper } from '@mvd/table'
import '@mvd/table/styles.css'

const helper = createDataTableColumnHelper<Person>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('age', { header: 'Age', meta: { align: 'right' } }),
])

export const People = ({ data }: { data: Person[] }) => (
  <DataTable columns={columns} data={data} getRowId={(row) => row.id} />
)
```

That is a sortable, filterable, searchable, paginated table, with a toolbar
that already carries column visibility, a density toggle and full-screen mode.
Everything else is a prop away.

## Filters that know what a column holds

A date is not a string with a calendar icon. Each column has a **data type**,
and the type brings its own operators, predicate and operand editor: "in the
last 3 weeks", "any Tuesday", "between 09:00 and 17:00 on any day", "within
50km of here". Nine types ship built in — text, enum, number, duration,
boolean, date, datetime, collection, geoPoint — and adding your own is an
object literal, not a subclass.

![A column filter popover open over the table, showing the numeric operator list, beside a filter panel with a different editor per column type](https://raw.githubusercontent.com/meesvandongen/Rtc2/main/docs/media/filters.png)

The operator lives *inside* the filter value, so `columnFilters` round-trips
through a URL or a saved view on its own. Editors open from a header funnel, a
docked panel, or both — and on a narrow viewport they become a bottom sheet
instead, because a popover anchored to a 24px funnel has nowhere to go on a
phone.

<img width="300" alt="The same filters as a bottom sheet on a phone-sized viewport" src="https://raw.githubusercontent.com/meesvandongen/Rtc2/main/docs/media/mobile.png">

## Or turn it on its side

`transposed` flips the axes: column headers stack down the inline start and each
record runs vertically beside them — the shape a spec-comparison table wants,
and the readable one for a few records with a great many fields.

![A transposed table: field names down the left, one column per person](https://raw.githubusercontent.com/meesvandongen/Rtc2/main/docs/media/transposed.png)

Nothing is switched off by it. Sorting, filters, pinning, grouping, detail
panels, editing and the rest all keep working on the axis they now land on: a
pinned column sticks to the top instead of the start, a detail panel opens
beside its record instead of under its row, and `enableTransposeToggle` hands
the flip to the reader.

## Restyled by variables, not overrides

Every visual decision is a `--rtc-*` custom property. Seven presets ship with
the package; each is a plain object you can copy and edit. Nothing below
changes the markup, the class names, or a single selector — only `cssVars`.

![The same table under six theme presets: material, linear, shadcn, spreadsheet, ant and soft](https://raw.githubusercontent.com/meesvandongen/Rtc2/main/docs/media/themes.png)

Dark mode follows `prefers-color-scheme`, or `data-rtc-theme` when you drive it
yourself.

## Or hand it your own components

Every interactive control — buttons, inputs, selects, popovers, menus, the
modal editor, the mobile drawer — comes from a component registry. Override one
of them or all of them. Adapters for **MUI**, **Radix**, **Mantine** and
**@lolmath/ui** ship as optional subpath exports, and the same Playwright suite
runs against all four.

![The same table rendered through the MUI, Radix, Mantine and @lolmath/ui adapters](https://raw.githubusercontent.com/meesvandongen/Rtc2/main/docs/media/adapters.png)

## And the rest of it

|  |  |
| --- | --- |
| **Sorting** | multi-sort, custom `sortFn`, server-side |
| **Filtering** | per column, global search, faceted options, multiple conditions with and/or |
| **Selection** | rows, sub-rows, cells and cell ranges; checkbox, radio or switch |
| **Columns** | reorder by drag, resize, pin, hide, group headers, footers |
| **Orientation** | `transposed` — flip the axes so columns run down the side and each record runs across |
| **Grouping** | drag-to-group chips, multi-level, per-column aggregation |
| **Rows** | expanding sub-rows, detail panels, pinning, drag reordering, row actions |
| **Editing** | cell, row, table or modal, with five editor variants |
| **Virtualization** | rows *and* columns — 50,000 rows and 252 columns are in the test suite |
| **Server-side** | `manual*` flags for sorting, filtering and pagination |
| **States** | loading skeletons, progress bars, saving, error and empty states |
| **i18n** | every string, including operator names per data type; RTL layout |
| **a11y** | native table semantics, keyboard-operable resize grips and drag handles, focus-managed overlays |

## Documentation

**[table.mvd.im](https://table.mvd.im)** — a live Storybook: 145 stories with
their source beside them, plus the reference docs.

- [Getting started](https://table.mvd.im/?path=/docs/docs-01-introduction--docs)
- [Every option, by area](https://table.mvd.im/?path=/docs/docs-02-features--docs)
- [Bring your own components](https://table.mvd.im/?path=/docs/docs-03-components--docs)
- [Filtering](https://table.mvd.im/?path=/docs/docs-04-filtering--docs) ·
  [Filter data types](https://table.mvd.im/?path=/docs/docs-05-filter-data-types--docs)
- [Theming](https://table.mvd.im/?path=/docs/docs-07-theming--docs) ·
  [Virtualization](https://table.mvd.im/?path=/docs/docs-08-virtualization--docs) ·
  [Transposed](https://table.mvd.im/?path=/docs/docs-13-transposed--docs)

## Status

`0.x`, and built on TanStack Table **v9 beta** — both this API and the one
underneath it can still move. `react` and `react-dom` (>= 18) are the only
required peers; MUI, Mantine, Radix and `@lolmath/ui` are optional ones, needed
only if you import the matching entry point.

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). MIT licensed.

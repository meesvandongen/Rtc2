---
'@mvd/table': minor
---

Localize the strings the filter data types contribute, and build the controls
for the features whose strings had nowhere to appear.

### Filter data types are localized

A data type does more than pick operators: it names them, spells out a
boolean's yes/no, labels its own operands, and summarises a condition for the
toolbar chip. Several of those went straight to the DOM in English no matter
what `localization` said.

- **Operator names are localizable per data type.** `filterOperators` accepts a
  `dataTypeId.operatorId` key, which wins over the bare operator id. This is
  what `enum`'s "Is" (rather than text's "Equals") and `datetime`'s "Is at"
  (rather than `date`'s "Is on") now come from — both were hard-coded on the
  data type and, because the lookup went by operator id alone, were never
  displayed at all.
- **Summary chips are assembled from the strings.** A boolean filter printed
  the raw `true`/`false`, a rolling date window printed the raw unit id
  (`3 day`), the geo bounding box printed "in box", and two conditions on one
  column were joined by a hard-coded " and " / " or ". `describe` now receives
  the table's `localization` instead of reaching for it through a cast.
- **Nested overrides merge instead of replacing.** Naming one date preset used
  to revert the other thirteen to English; the same for `dateUnits`, `bounds`
  and `filterOperators`. `weekdays` stays all-or-nothing — it is positional —
  and is ignored unless it has seven entries.
- **Operand editors take their names from the strings.** The rolling-window
  operand labelled its fields `"… amount"` / `"… unit"`, and both range-slider
  thumbs were announced as `"… minimum"` / `"… maximum"` by the built-in and
  Radix sliders. `RtcRangeSliderProps` gains optional `minLabel`/`maxLabel` so
  an adapter no longer has to invent them. New keys: `amount`, `unit`.
- **Grouping reads from the strings too.** A boolean group row showed
  "true"/"false", and nested grouping joined its column names with a comma
  rather than the existing `thenBy`.
- A load error in the toolbar rendered an icon inside a `role="alert"` with no
  text at all — it now carries `errorMessage ?? errorLoadingData`.

### Controls for the strings that had none

Several `DataTableLocalization` keys came over from Material React Table's
string table without the feature that renders them. Where the machinery was
already registered and only the control was missing, the control now exists:

- **`enableRowPinning` has a pin control.** It used to buy the sticky rendering
  and nothing else — pinning meant calling `row.pin()` from your own
  `renderRowActions`, which every consumer then had to build and name in
  English. Pin to top / pin to bottom / unpin are now entries in each row's
  overflow menu, and `enableRowPinning` brings the actions column along.
  (`pinToTop`, `pinToBottom`)
- **"Unpin all" and "Reset order"** are in the columns menu. Dragging a header
  or pinning a column had no way back short of a reload. (`unpinAll`,
  `resetOrder`)
- **`enableGlobalFilterModes`** puts a mode menu in the search field — the
  table-wide counterpart of `enableFilterModes` — with
  `globalFilterModeOptions`, `ui.globalFilterFn` state and an
  `onGlobalFilterFnChange` callback. (`changeSearchMode`)
- **`enableClickToCopy`**, or `meta.enableClickToCopy` per column, makes a
  cell's value copy on click. The cell text stays the button's accessible name
  and the confirmation goes through a live region, so a screen reader hears the
  value rather than the affordance. (`clickToCopy`, `copiedToClipboard`)
- **The sort control's tooltip is back.** It stated the current sort, and what a
  click would do when unsorted; it was lost when that control moved from a raw
  `<button title=…>` to the registry, whose tooltips live in a `Tooltip` slot —
  a slot that had four implementations and, until now, no call sites.
  (`sortedByColumnAsc`, `sortedByColumnDesc`)

Four keys stay removed because they describe no reachable state, not because
the feature is missing: `filterVariantEmpty` and `filterVariantNotEmpty` were
superseded by `filterOperators.isEmpty`/`isNotEmpty`; `filterMode` duplicated
the operator name already rendered on the filter-mode button; and
`toggleVisibility` named a switch this table renders as a checkbox labelled
with the column. Passing any of them was already a no-op; it is now a type
error.

### Header and cell alignment

Two layout bugs found while verifying the sort tooltip, both measured across
every adapter:

- **A sortable header's text no longer sits indented from its own column.** The
  header control is a button, and its horizontal padding pushed the label off
  the line its cells sit on — 2px with the built-in primitives, 7px through
  Radix, 8px through MUI, 19px through Mantine. Padding is geometry, so it is
  now zeroed on the bare `.rtc-th-sort` class, which reaches every adapter's
  button rather than only ours; the hover surface is restored with a
  spread-only `box-shadow`, which costs no layout. Every left-aligned column is
  now pixel-exact in all five adapters.
- **`meta.align` reaches body cells again.** `justify-content` was set on
  `.rtc-td`, which is a `table-cell` in the default `semantic` layout mode and
  ignores it, and `text-align` had nothing to distribute because the value box
  is sized to its content. `align: 'right'` and `align: 'center'` therefore did
  nothing at all outside the `grid` layout modes — a "right-aligned" numeric
  column sat flush left with ~100px of slack after it.

### Also

- Exports `mergeLocalization` and `filterOperatorLabel`, the two functions that
  resolve a partial `localization` and an operator's displayed name.
- `RtcTooltipProps` takes a `className`, so a wrapping tooltip can be kept from
  becoming the flex item in place of the control it wraps.
- `enableGlobalFilterModes` carries the chosen mode inside the global filter
  value on the way into TanStack, because `createFilteredRowModel` memoizes on
  the filter *state* and the global filter fn is an option — switching it alone
  changed how matching would work without ever re-running it. `state.globalFilter`
  stays a plain string for callers.

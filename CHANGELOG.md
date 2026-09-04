# @mvd/table

## 0.4.1

### Patch Changes

- cffc7c3: A toolbar with nothing in it is no longer drawn.

  Pagination is the bottom toolbar's only built-in occupant, so
  `enablePagination={false}` used to leave a 17px band of surface under a
  full-width border — most visible under a column footer or a sticky footer,
  where it read as a second, empty footer row. The bar now goes with the
  pagination, and the top toolbar does the same once the search box, the internal
  actions and every chip are gone.

  Either bar still returns the moment it has something to say — a selection
  count, an active filter chip — so pass `enableTopToolbar={false}` when a table
  must keep its height whatever the rows are doing. Content from
  `renderTopToolbarActions` and `renderBottomToolbarActions` always keeps its bar.

- b233277: Indent a nested row's chevron, not whichever cell happened to come first.
  Sub-row and group depth is now drawn by the expand column — one 16px step per
  level, on the chevron itself — and the column reserves room for the deepest row
  in the data, so a nested chevron is held rather than clipped.

  Depth used to be a spacer inserted into the first cell of the row, which was
  the wrong cell in both directions. Where the expand column _was_ first, the
  spacer went inside a cell sized for a single chevron — and body cells clip, so
  that one long value cannot widen a column — so the chevron of every nested row
  was cut off instead of moved: in a five-level tree, four levels of chevron were
  invisible. Where anything came before it — a selection checkbox, a drag grip —
  the spacer landed there instead, indenting the checkboxes while the chevrons
  stayed in a straight line, and clipping those.

  A row with nothing to open now keeps its chevron too, greyed out, where it
  used to be hidden outright. The chevron is what carries the depth, so hiding it
  on a leaf indented an invisible element: a childless row three levels down was
  drawn exactly like a root, and there was nothing to tell a leaf from a branch
  that happened to be closed. The grey is stated by the stylesheet rather than
  left to the UI-library adapters, whose own disabled styling would otherwise
  fade it a second time — under MUI's it landed at a tenth of an alpha and
  disappeared.

  The chevron now carries its own offset as a logical margin, so an RTL table
  indents to the left, and the expand column's width is derived from the same
  step: a chevron plus one step per level of nesting the data can produce
  (`grouping.length` levels when grouping, the depth of `getSubRows` for tree
  data). Read from the whole tree rather than the expanded part of it, so opening
  a branch does not resize the column and shift every column after it sideways.
  Two visible consequences: the expand column is wider than the 40px it always
  was — 48px at the root, plus 16px per level — and the data columns now stay in
  line at every depth, which is what makes a deep tree still read as columns of
  values.

## 0.4.0

### Minor Changes

- bfdb48b: Implement `enableColumnVirtualization`. The option has been on
  `DataTableOptions` since the beginning, and nothing read it: a 252-column table
  mounted 252 cells in every row it mounted, so the two virtualization axes
  multiplied instead of bounding each other.

  A horizontal virtualizer now windows the leaf columns, and the header, the
  body, the footer and the loading skeleton all render that one window — the
  same object reaches every row, so there is no way for a cell to land under the
  wrong header. The columns left out are represented by padding on each row
  rather than by spacer cells, so nothing is added to the DOM that keyboard
  navigation, `colSpan` or a stylesheet would have to know about, and each
  rendered cell states its `aria-colindex` rather than leaving a reader to count
  the cells that are present.

  Three things stay mounted at every scroll offset, because dropping them breaks
  something a window is not entitled to break:

  - **Pinned columns.** A sticky column that unmounted would leave the edge of
    the table blank. The gap is measured from just past the pinned block, so the
    pins hold their position while everything else slides underneath.
  - **The column being dragged**, whose pointer handlers live on the header that
    would otherwise unmount under the pointer.
  - **Measured header floors.** `enableHeaderContentFit` reads a header's
    `min-content` width, which can only be done while the header is mounted, so
    columns are measured as they arrive from off-screen and keep that floor once
    they leave. Widths that the offsets are built from now come from the same
    `max(size, minSize, header floor)` the stylesheet resolves, and a resize, a
    density change or a newly measured header re-measures the virtualizer.

  The option is declined, rather than half-applied, in the two cases where a
  window cannot be laid out correctly: an explicit `layoutMode="semantic"`, where
  the browser's table algorithm resolves widths itself, and grouped headers,
  where a range of leaf columns says nothing about the header spanning several
  of them. Like row virtualization it otherwise switches `layoutMode` to `grid`
  on its own. `data-rtc-column-virtual` on the root reports which way it went.

- 05eabbe: Localize the strings the filter data types contribute, and build the controls
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

  ### Also

  - Exports `mergeLocalization` and `filterOperatorLabel`, the two functions that
    resolve a partial `localization` and an operator's displayed name.
  - `enableGlobalFilterModes` re-filters the moment the mode changes, applying to
    whatever is already in the search box — no retyping. Getting that meant going
    around `options.globalFilterFn`: `createFilteredRowModel` memoizes on
    `[preFilteredRowModel, columnFilters, globalFilter]`, all of which is state,
    so a mode held in an option changes how matching _would_ work and never
    re-runs it. The mode travels inside the global filter value instead, where the
    row model can see it change. `state.globalFilter` stays a plain string for
    callers, and an empty box is passed through unwrapped so it still reads as
    "no filter".

### Patch Changes

- 8285a71: Fix a detail panel appearing at the top of a virtualized table instead of under
  its row. Panels are now render items of their own, so the virtualizer positions
  and measures them like any other row.

  The panel used to be a second `<tr>` rendered inside its row's slot. The
  virtualizer positions and measures exactly one element per index, so the panel
  got neither: it painted over the first row and, as the only thing left in the
  body's flow, pushed every absolutely positioned row after it down by its own
  height — the rows below the expanded one sat a row too low, over a gap. Nothing
  about grouping caused it; grouping only hid it, because a story that returns no
  panel for a group row left the stray row empty and hard to spot until the
  grouping came off.

  The body now renders a list of items — one per row, plus one for each open
  panel — which the shell resolves once so the virtualizer and the body count the
  same things. The plain body renders the same list, so the two paths cannot
  disagree about where a panel goes. Two consequences of a panel being an item:

  - `rowVirtualizerOptions.estimateSize` is asked about items rather than rows,
    so its `index` shifts as panels open and close.
  - Expanding a group row no longer renders a panel row for it. A group row
    stands for the rows underneath it and has no `original` behind it for a panel
    to describe, so `renderDetailPanel` is no longer called for one; a consumer
    guarding on `row.getIsGrouped()` can drop the check.

  In the `grid` layout modes — which virtualization switches on — a panel now
  fills the width of its row and grows past the row height when it needs to.
  `colSpan` says nothing to a flex row, so the panel's cell was as wide as its
  text, and `--rtc-row-height` applied to it as a height rather than a floor. The
  panel's content is size-contained like a body cell's, so a wide panel scrolls
  with the table instead of widening every column in it.

- 04baafa: Stop header labels from running under the filter and column-actions buttons.

  A virtualized table renders as a `grid` whether or not `layoutMode` says so —
  rows positioned absolutely and columns offset by an exact number of pixels are
  not something the browser's table algorithm can do — but only the root element
  was told. The header cells and the header-fit measurement both read the raw
  `layoutMode` option and so sized themselves for a semantic table, where the
  browser widens a column to fit its header. Nothing widened it: every column
  stayed at its declared `size`, and a label longer than that was drawn straight
  across the funnel and the column menu beside it. `enableRowVirtualization` with
  `enableColumnActions` or a column filter was enough to see it. The resolved mode
  now comes from one function that all three ask.

  Two smaller fixes behind it, so a squeezed header cannot overlap in the first
  place:

  - **The label truncates instead of overflowing.** It carries `overflow: hidden`
    in every mode now, not just under `enableHeaderContentFit={false}`. An
    element's min-content width does not depend on its `overflow`, so the column
    is still sized to fit the whole label where it can be; where it cannot — the
    fit opted out, a grid layout on the frame before its floor is measured — the
    label ends in an ellipsis rather than on top of a button.
  - **The sort control's optical nudge stopped costing the label 4px.** The
    `-4px` inline-start margin that lines a sortable header's text up with the
    data below it also came off what the header row reports as its minimum width,
    so a column sized to exactly its header was 4px short — and the label, now the
    item that clips, was what paid. The nudge moved onto the label, inside the
    button's own padding, where nothing depends on it.

- 2343e53: Fix two bugs a stress test found: a search box that never commits while the
  data churns, and grouped rows that refuse to open while a search is active.

  - **The debounced search survives a table that re-renders faster than the
    debounce.** `useTable` returns a fresh instance object on every render, and
    the effect that commits the search depended on it — so every render cleared
    the pending timer. A table whose `data` is replaced more often than every
    200ms (a live feed, a polling query) kept the typed term in the box and never
    filtered a row. The instance is read through a ref now, so only the term
    itself restarts the debounce.

  - **`enableGlobalFilterModes` no longer resets expansion on every state
    change.** With a mode menu in the search field the global filter value is an
    object (`{ query, mode }`), and it was rebuilt whenever any state slice
    changed. TanStack reads a new object as a changed filter and its auto-resets
    fire on that, so with a term in the box, expanding a grouped row wiped the
    expansion in the same commit and the group could not be opened at all — nor
    could a detail panel, and the page index reset with it. The wrapper is now
    memoized on the query and the mode alone.

- 312eb37: Stop the generated utility columns from absorbing a wide table's surplus
  width. Selection, expand, row-number and row-action columns now keep the width
  of the control they hold, and the space left over goes to the data columns.

  A table is nearly always wider than the sum of its columns, and every layout
  mode used to spread that surplus over all of them: `grid` gives every unpinned
  column `flex-grow: 1`, and the browser's auto table algorithm, once every
  column has declared a width, falls back to distributing the excess in
  proportion to those widths. On a 1500px-wide table that stretched a 44px
  checkbox column to 82px and doubled the row-actions column, taking the width
  from the columns that hold the data.

  In the `grid` modes the utility columns simply no longer get the `flex-grow`.
  In `semantic` they keep their pixel width and the data columns declare none,
  which is what makes the browser hand them the surplus instead; a growing
  column carries its declared `size` as a floor, and its cells are size-contained
  so a long value cannot widen the column or shift the layout from page to page.
  Pinned columns keep their declared width in every mode too — their sticky
  offsets are computed from it, so a column that renders wider than it measures
  sits at the wrong offset.

  Two consequences worth knowing: a `semantic` table now scrolls rather than
  squeezing columns below their declared `size` (which is what the `grid` modes
  have always done), and `layoutMode="grid-no-grow"` is unchanged — there no
  column grows and the surplus stays empty to the right.

## 0.3.1

### Patch Changes

- b0551de: Upgrade `@tanstack/react-table` from the `9.0.0-beta.58` prerelease to the
  stable `9.1.2`, and `@tanstack/react-virtual` from `3.14.8` to `3.14.9`.

  Fix row virtualization mounting no rows at all. The row virtualizer now lives
  in the component that renders the scroll container instead of in the table
  body below it.

  `useVirtualizer` has to resolve `getScrollElement` on its first commit, and
  React attaches refs bottom-up: a descendant's layout effect runs before its
  ancestor's ref is assigned. Creating the virtualizer in `VirtualBody` — below
  the `div` holding the container ref — meant it measured `null` on mount and,
  with nothing else prompting a render, never looked again. Keeping the ref and
  the virtualizer in the same component, as TanStack's own examples do, makes
  the container reachable from the first measurement on.

  This was previously masked by an unrelated TanStack Table bug that fired an
  auto-reset on mount, which incidentally produced the extra render the
  virtualizer needed; that bug was fixed upstream in `9.0.0-beta.76`. The
  container is also now picked up correctly if it is ever swapped or remounted.

  A table that does not virtualize now builds no virtualizer at all: the
  virtualized case wraps the container in a small component that owns the hook
  and hands it back, so the container markup stays in one place. The trade-off
  is that toggling `enableRowVirtualization` on a live table remounts the scroll
  container, resetting its scroll position; the option is treated as fixed for
  the lifetime of a table.

## 0.3.0

### Minor Changes

- 8c37f10: Add a `Label` slot to the component registry, so the text over a field in the
  modal editor and the filter panel comes from the host's design system like every
  control around it. The built-in implementation renders the same span as before,
  so nothing changes for a table that does not override it.

  The slot is presentational: the table keeps ownership of the association — the
  modal editor still wraps each field in a `<label>`, and every control still
  carries its own `aria-label`. An adapter whose library labels with a `<label>`
  element should render it as a span; React Aria's `Label` takes an `elementType`
  for exactly that, and nesting one inside the table's own `<label>` is invalid.

- 5bd5c8a: Ship the MUI, Mantine, Radix and `@lolmath/ui` component-registry adapters as
  optional subpath exports — `@mvd/table/mui`, `@mvd/table/mantine`,
  `@mvd/table/radix` (+ `@mvd/table/radix.css`) and `@mvd/table/lolmath`
  (+ `@mvd/table/lolmath.css`). Each UI library is a peer dependency of its own
  entry point only, marked optional in `peerDependenciesMeta`, so installing
  `@mvd/table` pulls in none of them and importing the root export is
  unaffected either way — see "UI library exports" in the README, including
  why there is no `@mvd/table/shadcn`.
- d3d8f38: Filters open in a drawer on mobile.

  Below `mobileBreakpoint` (640px by default) the header funnel opens its column's
  editor in a modal bottom sheet, the docked filter panel becomes a full-width
  sheet, and the toolbar always offers the funnel that opens it — a popover
  anchored to a 24px button and a 280px docked pane are both unusable on a phone.
  Opt out with `enableMobileFilterDrawer={false}`.

  The sheet never opens by itself: `initialState.showFilterPanel` and
  `filterDisplayMode: 'panel'` mean "the pane starts open beside the table",
  which is not the same request as "a modal covers the data on arrival". In
  drawer mode the surface opens on a gesture only — including across a resize,
  where a pane left open does not become an overlay.

  The sheet is a new `Drawer` registry component, so it can be replaced like every
  other overlay; adapters for MUI, Radix/shadcn and Mantine ship with the
  Storybook examples. The built-in one is a native modal `<dialog>` — the top
  layer, backdrop, focus trap and Escape come from the browser, the slide-in is
  CSS, and the only script is swipe-down-to-dismiss.

  Also adds `DataTableFilterDrawer`, `useMediaQuery`/`useIsMobile`,
  `table.isMobile`, and the `close`/`done` localization strings.

### Patch Changes

- 9d8f94c: Restore the minimum width of a filter popover's contents. `.rtc-filter-popover`
  was listed among the containers that are allowed to shrink inside the docked
  filter panel, which silently zeroed the 220px floor set on it a few rules
  earlier. The built-in overlay was unaffected — its surface carries a wider
  minimum of its own — but an adapter whose popover sizes to its contents
  collapsed onto its own controls.

## 0.2.0

### Minor Changes

- f8eceb4: Name the generated columns properly in the column-visibility menu.

  The menu listed the component's own display columns by their internal id —
  `rtc-row-actions`, `rtc-select`, `rtc-row-number` — which was both unreadable
  and untranslated. They now use the matching localization string (`actions`,
  `select`, `expand`, `rowNumbers`, `move`), as do the `aria-label`s that name a
  column, so a table with a `localization` override reads "Acties" rather than
  `rtc-row-actions`.

  Two additions come with it:

  - `meta.label` on a column definition supplies a human-readable name for a
    column whose `header` is a render function or an element. It takes precedence
    everywhere a column is named.
  - `getDisplayColumnLabel(id, localization)` is exported, for consumers building
    their own column menu.

- Match material-react-table's grouped column modes.

  `groupedColumnMode: 'remove'` produced anonymous group rows. TanStack drops the
  grouped column from the table for that mode and nothing put its value back, so
  every group rendered as a blank row with a chevron and an aggregate — there was
  no way to tell one group from another.

  Following material-react-table, the expand column now stands in for the columns
  `'remove'` takes away: it widens to a data column, its header names them
  ("Department, City"), and each group row shows the group value and its row count
  beside the chevron.

  Three related differences went with it:

  - **Grouping needed `enableExpanding` before a group could be opened.** A group
    row that cannot open is a dead end, so `enableExpanding` now defaults to on
    when grouping is enabled, and the expand column appears whenever a column is
    grouped — not only under `enableExpanding` or `renderDetailPanel`.
  - **The expand chevron was drawn twice under `'reorder'`** — once inside the
    grouped cell, once in the expand column. It now lives only in the expand
    column; the grouped cell keeps the value and the count.
  - **Tree indentation stepped in two places at once** while grouping was active.
    It now goes on the expand column, so nested groups indent once.

  The display columns that address a single record — the drag grip and the row
  actions — also stay blank on group rows, as they do in material-react-table.

### Patch Changes

- f8eceb4: Fix dark mode for browser-drawn chrome and for scrollable overlays.

  `.rtc-root` and `.rtc-vars` now declare `color-scheme` alongside the palette, so
  the parts the browser paints itself follow the theme: the drop-down list of a
  native `<select>`, date and number spinners, and default scrollbars. A dark
  table no longer opens a white select popup.

  Scrollbars are also styled on every scroll container the component owns, not
  just the table viewport. The filter menu, the column and row-action menus, the
  filter panel, the checkbox list inside a filter and the modal editor were all
  falling back to a light scrollbar sitting on a dark surface.

- bfa9e1e: Fix a see-through sticky header, stretched icon buttons, and a filter panel that
  ignored the table's theme.

  Three defects that only showed up once a design system was installed:

  - **A transparent header colour made the sticky header see-through.** Header
    cells painted `--rtc-header-bg` _instead of_ the table surface, so a theme
    entitled to a transparent header — shadcn's is — let the first body row show
    straight through the sticky header while scrolling, which read as two rows
    overlapping. The header colour is now painted _over_ the surface, so a header
    cell is opaque whatever the theme puts on it. The same applies to a sticky
    footer and to pinned header cells.

  - **Icon-only buttons came out stretched.** `.rtc-icon` is an SVG, and an SVG is
    an inline box: it sat on a text baseline and took the line height of whatever
    font size the host's button used rather than its own 16px. MUI's `IconButton`
    sets a 1.5rem font size, which turned every toolbar button into a 32×51
    rectangle. Icons are now `display: block`, and the wrapper the toolbar puts
    around them is `inline-flex`, so a button is exactly its icon plus its
    padding.

  - **A docked filter panel reset the theme.** The panel carries `rtc-vars` so it
    can be rendered standalone, but a declaration on an element beats one
    inherited from an ancestor — nested inside the table it overwrote every
    variable with the package defaults and ignored the `cssVars` set on the table
    root. `rtc-vars` now only declares the palette outside a `.rtc-root`; inside
    one there is nothing to opt into, so the panel inherits.

# Proposal: a configurable toolbar layout

**Status:** draft, two competing designs, neither implemented.
**Scope:** where the toolbar's occupants sit. Not what they are, not whether
they exist — `enable*` already answers that and keeps answering it.

Two designs are written out in full below, because the choice between them is
not obvious from a sketch:

- **[Proposal A](#proposal-a--toolbarlayout-item--place)** keys the
  configuration by *item*: `{ search: 'top-start' }`.
- **[Proposal B](#proposal-b--toolbarlayout-place--ordered-items)** keys it by
  *place*: `{ top: { start: ['search'] } }`.

They share everything else — the item vocabulary, the DOM, the CSS, the
resolution pass — so [Shared groundwork](#shared-groundwork) is written once
and both build on it. [Head to head](#head-to-head) scores them against the
requirements, and [Recommendation](#recommendation) picks one.

---

## Today

`TopToolbar` renders a fixed sequence of children into one flex row
(`src/components/Toolbar.tsx:61`), and `BottomToolbar` renders three
(`src/components/Toolbar.tsx:95`):

| # | Top bar holds | Comes from |
| --- | --- | --- |
| 1 | consumer actions | `renderTopToolbarActions` |
| 2 | drag-to-group drop zone | `enableGrouping` + `enableGroupingChips` |
| 3 | "3 of 50 rows selected" | `enableRowSelection` |
| 4 | active filter chips | `showActiveFilterChips` |
| 5 | *spacer* (`flex: 1 1 auto`) | always |
| 6 | global search field | `enableGlobalFilter` |
| 7 | pagination | `paginationPosition: 'top' \| 'both'` |
| 8 | the internal-actions cluster | `enableToolbarInternalActions` |

and the cluster at 8 is itself a fixed sequence: consumer content from
`renderToolbarInternalActions`, then the search toggle, the filter funnel, the
column-visibility menu, the density toggle, the transpose toggle, the
full-screen toggle, and the error alert.

The bottom bar holds `renderBottomToolbarActions`, a spacer, and pagination.

One position is configurable — `paginationPosition` — and there are two escape
hatches. Neither is enough:

- **The `render*` slots** append to a fixed point. `renderTopToolbarActions`
  content can only be first in the top bar; `renderToolbarInternalActions`
  content can only be first in the icon cluster. Nothing can put a consumer
  button *between* the density and full-screen toggles, or anywhere in the
  start of the bottom bar but before the spacer.
- **`classNames` + CSS `order`.** The bar is `display: flex` (`styles.css:998`)
  and the built-in occupants carry stable hooks (`.rtc-search`,
  `.rtc-pagination`, `.rtc-filter-chips`), so items 1–8 *can* be reordered with
  CSS today. But `order` only sorts siblings, and the icon cluster is a nested
  flex container — so the density toggle cannot be moved out to sit beside the
  search box, and nothing can cross from the top bar to the bottom bar at all.
  It also gives up on anything a *reader* could change at runtime: CSS is not
  state, so it cannot be saved with a view.

So the question this proposal answers is: what does the option look like that
replaces both hatches for placement, without replacing them for content.

## What a layout API has to survive

These are the yardstick; both proposals are scored against them at the end.

- **R1 — Placement is a patch.** Moving the search box must not require
  restating the other seven occupants, and a built-in item added in a later
  release must appear on its own in a table that was configured before it
  existed.
- **R2 — Order within a place is expressible.** "Search at the start" is
  under-specified the moment two things are at the start.
- **R3 — One item can appear twice.** `paginationPosition: 'both'` exists and
  has to keep working, so a placement is not necessarily singular.
- **R4 — Empty collapses.** An occupant that draws nothing takes no gap, a
  region with no occupants takes no space, and a bar with no occupants is not
  drawn at all. This is an existing, tested invariant: `hasContent`
  (`src/components/Toolbar.tsx:51`) gates the bar, and `emptyToolbars` in
  `e2e/helpers.ts:112` fails the suite over "17px of nothing".
- **R5 — `enable*` still decides existence.** Layout says *where*, never
  *whether*. A placement must never resurrect a feature its flag turned off.
- **R6 — Logical directions.** The table has a `direction` option and its CSS
  is written in logical properties throughout (`inset-inline-start`,
  `margin-inline-start`). The vocabulary is `start`/`end`, not `left`/`right` —
  in RTL, `left` would name the trailing edge and every config would read
  backwards.
- **R7 — Narrow viewports differ.** `useIsMobile` already swaps the filter
  surface for a sheet. A row that is comfortable at 1200px is three wrapped
  lines at 380px, and the arrangement wanted there is usually not the same one
  scaled down.
- **R8 — Serializable.** `columnFilters` round-trips through a URL because the
  operator lives inside the value; a layout that is a plain JSON object can do
  the same, which is what makes a "customize this toolbar" panel for the
  *reader* — not just for the developer — a later feature rather than a
  rewrite.
- **R9 — Consumer content is placeable too.** Whatever the API is, it should
  address a consumer's own button by the same means it addresses the density
  toggle.
- **R10 — The icon cluster stays a cluster.** The internal actions sit at a 4px
  gap against the bar's 8px (`styles.css:1020`) because they read as one
  control group. Individually placeable icons must not lose that.

## Shared groundwork

Everything in this section is needed by both proposals and is not a point of
difference between them.

### The item vocabulary

Every placeable occupant gets a stable id. These are the ids; the defaults
column is the layout both proposals resolve to when nothing is configured.

| id | What | Default place |
| --- | --- | --- |
| `top-actions` | `renderTopToolbarActions` output | `top-start` |
| `grouping-chips` | drag-to-group drop zone | `top-start` |
| `selection-summary` | "3 of 50 rows selected" | `top-start` |
| `filter-chips` | removable active-filter chips | `top-start` |
| `search` | the global search field | `top-end` |
| `pagination` | the pagination nav | `top-end`, `bottom-end`, or both |
| `internal-actions` | `renderToolbarInternalActions` output | `top-end` |
| `search-toggle` | show/hide the search field | `top-end` |
| `filter-toggle` | open the filter panel or sheet | `top-end` |
| `column-visibility` | the columns menu | `top-end` |
| `density-toggle` | cycle comfortable/compact/spacious | `top-end` |
| `transpose-toggle` | flip the axes | `top-end` |
| `fullscreen-toggle` | enter/leave full screen | `top-end` |
| `error` | the loading-error alert | `top-end` |
| `bottom-actions` | `renderBottomToolbarActions` output | `bottom-start` |

The three `*-actions` ids are how the existing render slots keep working: their
content becomes a placeable item rather than a hard-coded position, and with no
configuration it lands exactly where it lands today.

### Custom items

For content that wants a place of its own rather than a seat in an existing
slot, a companion option registers it under an id of the consumer's choosing:

```ts
toolbarItems?: Record<string, ReactNode | ((ctx: DataTableRenderContext<TData>) => ReactNode)>
```

A registered id is placeable by exactly the same means as a built-in one, and
the item ids type becomes `ToolbarItemId | (string & {})` so a custom id
type-checks without giving up autocomplete on the built-ins. This satisfies R9
for both proposals and makes the `render*` slots legacy sugar rather than the
only way in.

### One resolution pass

Both proposals need the same question answered before they can lay anything
out: *which items would draw something right now?* The toolbar already asks it,
in pieces — `showsGlobalFilterField`, `showsFilterChips`, `selectedRowCount`,
`internalActionSlots`, `hasSlotContent` — because `hasContent` has to know
whether the bar is about to be an empty sliver before it commits to rendering
(`src/components/Toolbar.tsx:45-59`).

Generalize those predicates into one function:

```ts
function resolveToolbarItems<TData>(table): Map<ToolbarItemId, ReactNode>
```

It applies the `enable*` flags (R5), evaluates each render slot exactly once
(the reason `internalActionSlots` is hoisted out of `InternalActions` today),
drops anything that would render nothing, and returns what is left. Both
proposals then place *only* what is in that map, which is what gives R4 for
free: a region with no entries is not rendered, and a bar with no regions is
not rendered.

### DOM and CSS

Both proposals produce the same markup — three regions per bar, each rendered
only when occupied, each item wrapped with its id:

```html
<div class="rtc-toolbar" data-rtc-toolbar="top" data-rtc-position="top">
  <div class="rtc-toolbar-region" data-rtc-region="start">
    <span data-rtc-toolbar-item="filter-chips">…</span>
  </div>
  <div class="rtc-toolbar-region" data-rtc-region="end">
    <span data-rtc-toolbar-item="search">…</span>
  </div>
</div>
```

```css
.rtc-toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;  /* start | center | end */
  align-items: center;
  gap: var(--rtc-toolbar-gap);
}
.rtc-toolbar:not(:has([data-rtc-region="center"])) {
  grid-template-columns: 1fr auto;
}
.rtc-toolbar-region { display: flex; align-items: center; flex-wrap: wrap; gap: var(--rtc-toolbar-gap); }
[data-rtc-region="center"] { justify-content: center; }
[data-rtc-region="end"]    { justify-content: flex-end; }

/* R10: adjacent icon buttons tighten, wherever they end up. */
.rtc-toolbar-region > [data-rtc-item-kind="icon"] + [data-rtc-item-kind="icon"] { margin-inline-start: calc(4px - var(--rtc-toolbar-gap)); }

/* R7: below the bar's own width, regions stack instead of wrapping raggedly. */
.rtc-root { container: rtc-table / inline-size; }
@container rtc-table (width < 640px) { .rtc-toolbar { grid-template-columns: 1fr; } }
```

Three consequences worth stating:

- `.rtc-toolbar-spacer` disappears. The `1fr` columns do its job, and the
  `emptyToolbars` helper's special case for it becomes dead — but only because
  empty regions are never rendered, so the helper's "any node with a non-zero
  box" check keeps working unchanged.
- `.rtc-pagination`'s `margin-inline-start: auto` (`styles.css:2108`) also
  disappears. It is the same spacer trick done locally, and inside a region it
  would fight the region's own alignment.
- A container query rather than the JS breakpoint, because the constraint here
  is the *table's* width, not the viewport's: a 600px table in a wide page has
  the same problem a phone does. `useIsMobile` stays for the filter drawer,
  where the question really is about the device. The caveat is that
  `container-type: inline-size` also applies inline-size containment to
  `.rtc-root`, so the root stops sizing to its contents — it already has
  `overflow: hidden` and a scrolling container inside it, so this should be
  invisible, but a table dropped into a shrink-to-fit parent is the case to
  check before committing to it.

### Precedence

Identical under both proposals, and worth fixing now because it is where a
layout API usually grows its ambiguities:

1. **`enable*` wins over placement, always.** `enableDensityToggle={false}`
   means no density toggle, whatever the layout says. Placing an item is not a
   way to turn it on.
2. **`enableTopToolbar={false}` wins over placement into that bar.** Items
   placed there are dropped, not relocated — silently moving a button to the
   other bar is worse than not drawing it. Dev-mode warning when it happens.
3. **An explicit placement beats the sugar.** `paginationPosition` stays and
   keeps working; it writes a default that an explicit `pagination` placement
   overrides, with a dev-mode warning when both are set. Same for
   `positionActionsColumn`-style options if any grow later.
4. **Unknown ids warn in dev and are ignored.** A typo'd `'serach'` should not
   silently swallow the search box, and an id from a future version should not
   throw in an older one.

---

## Proposal A — `toolbarLayout`: item → place

The map the request describes. One entry per item you want to move; everything
else keeps its default.

```ts
type ToolbarPlace =
  | 'top-start'    | 'top-center'    | 'top-end'
  | 'bottom-start' | 'bottom-center' | 'bottom-end'

type ToolbarPlacement =
  | ToolbarPlace                              // move it there
  | false                                     // do not draw it
  | { place: ToolbarPlace; order?: number }   // …and where in there
  | Array<ToolbarPlace | { place: ToolbarPlace; order?: number }>  // in two places at once

interface DataTableOptions<TData> {
  /** Where each toolbar occupant sits. A patch over the defaults. */
  toolbarLayout?: Partial<Record<ToolbarItemId, ToolbarPlacement>>
  /** Applied instead when the table is narrow. Also a patch over the defaults. */
  toolbarLayoutNarrow?: Partial<Record<ToolbarItemId, ToolbarPlacement>>
  toolbarItems?: Record<string, ReactNode | ((ctx: DataTableRenderContext<TData>) => ReactNode)>
}
```

```tsx
<DataTable
  columns={columns}
  data={data}
  toolbarItems={{ export: ({ table }) => <ExportButton table={table} /> }}
  toolbarLayout={{
    search: 'top-start',                  // search leads the bar
    'filter-chips': 'top-center',
    pagination: ['top-end', 'bottom-end'],// what paginationPosition="both" means
    'density-toggle': false,              // drawn by nobody
    export: { place: 'bottom-start' },    // a custom item, placed like any other
  }}
/>
```

### Ordering (R2)

Every built-in has a documented default rank, spaced by ten — `search: 10`,
`pagination: 20`, `search-toggle: 30`, … — and `order` overrides it. Items in
the same place sort by rank, then by the default rank, then by id, so the
result is total and stable no matter what the config omits. Spacing by ten is
what lets a custom item land *between* two built-ins (`{ place: 'top-end',
order: 25 }`) without the consumer restating either of them.

This is the part of A that is a genuine compromise. Object key order would be
the obvious alternative — and is in fact deterministic for string keys — but it
breaks the moment a config is built by spreading a base object, which is
exactly how a shared table config gets specialized. Explicit ranks are duller
and survive that.

### Resolution

1. `resolveToolbarItems(table)` → the items that would draw something.
2. Start from the default place/rank table.
3. Apply `toolbarLayout` as a patch; below the narrow threshold, apply
   `toolbarLayoutNarrow` on top of that.
4. Drop `false` placements and items whose bar is disabled (warn).
5. Bucket by place, sort each bucket, render non-empty regions, and render a
   bar only if one of its three regions survived.

### What A is good at

- **R1, exactly.** One line moves one thing. A built-in added next release
  arrives in its default place with no config change, because the config is
  never a complete description of the bar.
- **R8, exactly.** The value is a flat string-to-string map: `JSON.stringify`
  it into a saved view, a URL, or a `localStorage` preference, and a
  "customize toolbar" panel for the reader is a later feature rather than a
  redesign. This is A's strongest argument and it is a strategic one, not an
  ergonomic one.
- **Small surface.** One option, one enum, six values, no nesting. It is
  reviewable in a diff and explainable in a table.
- **Cheap to validate.** Every value is checkable against a closed set; every
  key is checkable against the item vocabulary.

### What A cannot do

- **More than one row per bar.** Chips on their own line under a toolbar is a
  common ask, and six places cannot express it. Growing the enum to
  `top-row-2-start` and friends doubles it to twelve and still fixes the number
  of rows at two.
- **Explicit grouping.** R10 is met by a CSS adjacency rule, which is a
  heuristic: two icons that happen to be adjacent get the tight gap whether or
  not they mean anything to each other, and a group that wants a separator or
  a border around it has no way to say so.
- **Reading the result.** The config is keyed by item, so answering "what is in
  the top-end region, in order?" means scanning every entry and sorting it in
  your head. This is the flip side of R1 and it gets worse as the config grows.

---

## Proposal B — `toolbarLayout`: place → ordered items

Same problem, inverted index. The configuration describes each *region* as an
ordered list, which is how the rendered bar is actually read.

```ts
type ToolbarNode =
  | ToolbarItemId
  | 'rest'                                              // everything not placed elsewhere
  | { group: ToolbarNode[]; gap?: 'tight' | 'normal' }  // one visual cluster

interface ToolbarRow { start?: ToolbarNode[]; center?: ToolbarNode[]; end?: ToolbarNode[] }

interface DataTableOptions<TData> {
  toolbarLayout?: {
    top?: ToolbarRow | ToolbarRow[]     // an array is more than one row
    bottom?: ToolbarRow | ToolbarRow[]
    narrow?: { top?: ToolbarRow | ToolbarRow[]; bottom?: ToolbarRow | ToolbarRow[] }
  }
  toolbarItems?: Record<string, ReactNode | ((ctx: DataTableRenderContext<TData>) => ReactNode)>
}
```

```tsx
<DataTable
  columns={columns}
  data={data}
  toolbarItems={{ export: ({ table }) => <ExportButton table={table} /> }}
  toolbarLayout={{
    top: [
      {
        start: ['search'],
        end: [{ group: ['filter-toggle', 'column-visibility', 'fullscreen-toggle'] }, 'rest'],
      },
      { start: ['grouping-chips', 'filter-chips'] },   // a second row, just for chips
    ],
    bottom: { start: ['export', 'selection-summary'], end: ['pagination'] },
    narrow: { top: { start: ['search'] }, bottom: { end: ['pagination'] } },
  }}
/>
```

### `'rest'` is what makes it a patch (R1)

Without it, B fails R1 outright: every region you write is a complete
enumeration, so a built-in added next release would be invisible until every
consumer edited their config, and a consumer who wrote `end: ['search']` in
2026 would silently lose whatever shipped in 2027.

With it, the rule is:

- A region you specify replaces that region's default.
- A region you omit keeps its default, minus any item you placed elsewhere — so
  naming an item once moves it, rather than duplicating it.
- Every visible item named nowhere renders at `'rest'`. If no region declares
  `'rest'`, it is implied at the end of `top.end`, which is where the internal
  actions live today.
- Naming an item in two regions renders it twice (R3), which is how
  `paginationPosition: 'both'` falls out of the general rule rather than
  needing its own vocabulary.

### What B is good at

- **R2, natively.** An array is ordered. There are no rank numbers to document,
  no tie-breaks to specify, and no way to write an ambiguous config.
- **Rows and groups, natively.** The second-row example above is a
  configuration, not a feature request; `{ group: [...] }` makes R10 explicit
  rather than a CSS adjacency heuristic, and gives a hook for a future
  separator or overflow menu (`{ group: [...], overflow: true }` is the obvious
  next step, and A has nowhere to put it).
- **Reads like the result.** The config has the same shape as the bar, which
  makes a review of it a visual check rather than a mental sort.
- **Still serializable (R8).** It is JSON too. But it is *nested* JSON, which
  is materially harder for a drag-and-drop settings panel to produce and
  validate than a flat map — a real difference in degree even though both pass.

### What B costs

- **Bigger surface.** A recursive node type, a sentinel value, an
  object-or-array union for rows, and resolution rules that need a spec (the
  three bullets above) rather than a sentence. Every one of those is a thing to
  document, to type, to validate, and to get wrong.
- **`'rest'` is subtle.** Its whole job is to catch things the author did not
  think about, which means its effect is invisible in the config that declares
  it and shows up only when the library adds something.
- **Partial overrides are coarser.** Moving the search box means restating the
  region it lands in, including whatever else was there.

---

## Head to head

| | A — item → place | B — place → items |
| --- | --- | --- |
| R1 patch semantics | native, per item | per region, and only via `'rest'` |
| R2 ordering | rank numbers, documented and dull | native |
| R3 one item, two places | array value | name it twice |
| R4 empty collapses | shared resolver | shared resolver |
| R5 `enable*` wins | shared precedence | shared precedence |
| R6 logical directions | `start`/`end` | `start`/`end` |
| R7 narrow | second map | second tree |
| R8 serializable | flat map — trivial for a settings UI | nested tree — harder |
| R9 custom items | by id | by id |
| R10 icon cluster | CSS adjacency heuristic | explicit `group` |
| More than one row | no | yes |
| "What's in top-end?" | scan and sort mentally | read the array |
| Config surface | one enum, six values | recursive node type |
| Implementation | ~1 day on the shared groundwork | ~2–3 days on the same groundwork |
| Failure mode | ambiguous order, silently resolved by rank | region restated, a later built-in swallowed |

The shared groundwork — the item vocabulary, `toolbarItems`,
`resolveToolbarItems`, the region DOM and CSS, the precedence rules — is the
bulk of the work either way, and it is identical. The choice is only about the
shape of the value.

## Recommendation

**Ship A's surface, on B's resolver.**

A is the better *public* option for this library. It is one option with a
closed set of values, it patches per item so a config written today survives
the next release untouched, and its flat shape is the one that a saved view or
a reader-facing "customize toolbar" panel can produce — which is the same
argument that makes `columnFilters` round-trip through a URL, and the reason
this is a strategic difference rather than a stylistic one. The request's
instinct is right.

But A should be *defined* as sugar that lowers into B's structure: resolve the
item map into an ordered region tree, then render that tree. Two reasons, both
practical:

1. It is the only way A gets R10 honestly. A `group` node is what the renderer
   wants; the CSS adjacency rule is what you write when there is no group in
   the model.
2. It makes B a non-breaking addition rather than a replacement. If multi-row
   layouts or explicit groups turn out to be wanted — chips on their own line
   is the one I would bet on — `toolbarLayout` widens to
   `ToolbarLayoutMap | ToolbarLayoutTree`, a discriminated union resolved by
   whether the value has `top`/`bottom` keys. No existing config changes, no
   major bump.

Ship order: the shared groundwork and A's map first, in one minor release with
a changeset that documents the item ids; the tree form later, only if the
rows-and-groups need is real rather than anticipated.

One naming note that applies whichever is picked: the places are `top-start`
and `top-end`, not `top-left` and `top-right`. The table has a `direction`
option and its stylesheet is logical-properties throughout; `left` would name
the trailing edge in RTL and every config in the wild would read backwards.

## Open questions

1. **`false` vs `enable*`.** A placement of `false` overlaps with the existing
   flags for the items that have one, and is the only way to hide the ones that
   do not (`filter-chips` has `showActiveFilterChips`, but `selection-summary`
   has nothing). Keep both and let `enable*` win, or drop `false` and add the
   missing flags?
2. **Narrow threshold.** The CSS uses a container query on the table's own
   width; `toolbarLayoutNarrow` needs a number to switch on. Reuse
   `mobileBreakpoint` (viewport, matches the filter drawer) or introduce a
   table-width threshold that matches the CSS? Two different questions are
   being asked, and answering them with one number is a bug waiting to happen.
3. **Does `renderToolbarInternalActions` keep its cluster seat?** Under the
   proposal it becomes the `internal-actions` item, defaulting to `top-end`
   where it renders today. But it currently sits *inside* the 4px cluster,
   ahead of the search toggle. Preserve that exactly, or let it become an
   ordinary occupant at the bar's own gap?
4. **Center region, at all?** Nothing in the default layout uses it, and it
   costs a grid column and a `:has()` rule. It is the one place where the
   request's enum and the rendered result might not justify each other.
5. **Do the chips belong in the toolbar?** `grouping-chips` and `filter-chips`
   are the two occupants that most often want their own row, and the reason B's
   multi-row support is tempting. An alternative that sidesteps both proposals
   for this case: a separate, always-full-width chips band between the toolbar
   and the head, placed by its own option.

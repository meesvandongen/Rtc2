---
'@mvd/table': minor
---

Add `transposed`: the table with its axes flipped, one row per column and one
column per record.

Column headers stack down the inline start and each record runs vertically
beside them — the shape a spec-comparison table wants, and the readable one for
a handful of records with a great many fields.

```tsx
<DataTable columns={columns} data={data} transposed />
```

Nothing is switched off by it. Every feature keeps working on the axis it now
lands on, and the table stays one real `<table>` — a header that labels a row is
a `<th scope="row">` — so grouped headers, detail panels and sticky cells keep
the browser's own semantics. A pinned column sticks to the top or bottom instead
of the start or end, and a pinned row does the reverse; `enableStickyHeader`
sticks the label column and `enableStickyFooter` the footer column; a column is
dragged up and down and a record across; a detail panel opens as a column beside
its record; and `enableColumnResizing` writes the same `columnSizing` state,
read as a band height, from a grip along the bottom edge of each label. The
column and row menus name the direction they will pin in.

`rowPinningDisplayMode` turns with the rest. In the default `sticky` mode a
pinned record keeps its place in the order and is held against **both** inline
edges — it waits at the trailing edge until the scroll reaches it, sits among
its neighbours while that place is on screen, and docks beside the label column
once the scroll goes past it. The other three lift the pinned records into a
block at the inline start (`top`) or end (`bottom`), stacked and docked against
that edge, with the record facing the rest of the table carrying the block's
boundary. Every offset is stated rather than measured, which upright cannot do:
a record column is exactly one `--rtc-transposed-record-width`, so a record's
start offset is the label block plus the pinned records before it and its end
offset the footer block plus the ones after it. And `sticky` keeps working under
`enableRowVirtualization` here, where upright it falls back to the sections — a
windowed record is held in flow by a spacer rather than taken out of it, so it
sticks like any other cell.

Both axes are sized by `--rtc-transposed-header-width` (`220px`) and
`--rtc-transposed-record-width` (`200px`) rather than by each column's `size`,
which measures an axis the transposed table no longer lays columns out along.

Both virtualizers still window the thing they are named for, on whichever axis
it now runs: `enableRowVirtualization` windows the records, which run across,
and `enableColumnVirtualization` the columns, which run down. The window is held
open by spacers rather than by taking anything out of flow, which is what lets a
virtualized transposed table stay a real `<table>` — and so keep the `rowSpan`
that grouped headers and detail panels are built on. Both of those decline the
*column* window for the same reason they would have to: each spans the whole
band order, and a window that dropped some of the bands would have no span left
to give. The label column is never part of a window; every band brings its own
label, exactly as an upright `<thead>` stays put whichever rows are mounted.

`enableStickyHeader` defaults to **on** in a transposed table, where upright it
is off. Upright the header row sits at the near edge of the axis the records run
along, so scrolling across never takes it away; transposed the labels are at
that edge, and without sticking them a scroll to the right leaves a screen of
values with nothing saying what any of them are.

The orientation is UI state, like `density`: seed it with
`initialState.transposed`, observe it with `onTransposedChange`, drive it
through `state`, or hand it to the reader with `enableTransposeToggle` — a
toolbar button beside the density and full-screen ones. Passing the `transposed`
option pins the orientation and removes the button, the same way `density` does.

The root reports what each virtualizer was allowed to do: `data-rtc-column-virtual`
as before, and a new `data-rtc-row-virtual` beside it for the other half.
`layoutMode` is declined in a transposed table and reports `semantic` — the grid
modes describe the axis it no longer lays columns out along, and it does not
need them.

New localization key: `toggleTranspose`. New registry icon name: `transpose`.

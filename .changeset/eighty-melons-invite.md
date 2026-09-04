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

Both axes are sized by `--rtc-transposed-header-width` (`220px`) and
`--rtc-transposed-record-width` (`200px`) rather than by each column's `size`,
which measures an axis the transposed table no longer lays columns out along.

The orientation is UI state, like `density`: seed it with
`initialState.transposed`, observe it with `onTransposedChange`, drive it
through `state`, or hand it to the reader with `enableTransposeToggle` — a
toolbar button beside the density and full-screen ones. Passing the `transposed`
option pins the orientation and removes the button, the same way `density` does.

Virtualization is the one thing a transposed table declines: both virtualizers
window the axis they are named for, and neither is built against the axis it
lands on once the table is flipped. The root reports what was honoured:
`data-rtc-column-virtual` as before, and a new `data-rtc-row-virtual` beside it
for the other half.

New localization key: `toggleTranspose`. New registry icon name: `transpose`.

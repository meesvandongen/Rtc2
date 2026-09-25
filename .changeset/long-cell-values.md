---
"@mvd/table": minor
---

Read the whole of a value that does not fit its column.

A body cell still cuts a value wider than its column with an ellipsis — rows
keep one height, and a column's width never depends on its data — but the rest
of the value is no longer out of reach:

- **Cut-short cells peek.** Rest the pointer on a truncated cell, or reach it
  with the keyboard under `enableCellSelection`, and it opens out over its
  neighbours showing the whole value in place. Only cells that are actually cut
  do this. The peek takes no pointer events and is `aria-hidden` — the cell's
  own text was always the whole value to assistive technology. This is the new
  default; `cellOverflowReveal: 'title'` uses the browser tooltip instead, and
  `cellOverflowReveal: 'none'` restores the previous behaviour.
- **`cellOverflowReveal: 'peek-scroll'`** is a peek you can point at, for
  values that run to paragraphs: it stays open under the pointer, scrolls
  without scrolling the table, and its text can be selected. A plain click on
  it closes it and reaches the cell underneath.
- **`cellOverflow`** chooses `truncate` (the default), `wrap`, or `clamp` to
  `cellMaxLines` lines. All three options can be set per column in `meta`
  (`meta.cellOverflow`, `meta.cellMaxLines`, `meta.cellOverflowReveal`), which
  is usually where `wrap` and `clamp` belong.
- **Fit to content.** Double-clicking a column's resize grip now fits the
  column to its widest mounted value and its header, within `minSize` and
  `maxSize`, instead of resetting it; the column menu gains a "Fit to content"
  item beside "Reset column size", and Enter on a focused grip still resets.
  New localization key: `fitColumnToContent`.

Also fixed: a click-to-copy cell cut its value off mid-letter with no ellipsis.

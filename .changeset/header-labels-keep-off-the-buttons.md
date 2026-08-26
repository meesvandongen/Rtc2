---
'@mvd/table': patch
---

Stop header labels from running under the filter and column-actions buttons.

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

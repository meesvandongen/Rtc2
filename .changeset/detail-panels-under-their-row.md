---
'@mvd/table': patch
---

Fix a detail panel appearing at the top of a virtualized table instead of under
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

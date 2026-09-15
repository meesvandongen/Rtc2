---
'@mvd/table': patch
---

Centre the empty and error states across the whole table in the `grid` layout
modes.

Neither state says anything about a column, so each is one cell across all of
them. A semantic table centres the message on that `colSpan` alone. In `grid`
and `grid-no-grow` the `colSpan` is inert — a row there is a flex line — and a
cell takes its width from the `--rtc-col-size` of the column behind it, which
these two have no column to carry. So the cell fell back to the width of its own
message and stayed at the start of the line: "No records to display" was centred
inside a 204px box at the start of a 1246px table, which reads as left-aligned,
and a longer translation of the same message only moved it further along.

The row was the other half of it. `--rtc-row-height` is a height in a grid
layout rather than the floor a semantic table makes of it, so 116px of padded
message hung out of a 44px row and out of the table's own box, over whatever
came next.

Both states now fill the line and grow the row to hold what is in them, in every
layout mode and for any message — the default one, a localized one, or whatever
`renderEmptyState` returns, which is laid out as its own block rather than
strung across a flex line. They carry two new class names to that end,
`rtc-span-row` on the row and `rtc-span-cell` on the cell, so a stylesheet of
yours can reach either.

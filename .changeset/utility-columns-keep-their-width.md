---
'@mvd/table': patch
---

Stop the generated utility columns from absorbing a wide table's surplus
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

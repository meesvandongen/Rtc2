---
"@mvd/table": minor
---

Set header labels on a diagonal, for the tables that are otherwise all header.

A checklist column holds a tick. Its header holds "Security training reviewed",
which is eight times as wide, and twenty such columns make a table whose header
is bigger than its data — the reason spreadsheets have had rotated headers for
as long as they have had headers. `headerOrientation="diagonal"` turns the
labels off the horizontal and trades the width they wanted for height the table
has to spare, and every column goes back to being as wide as its own content.

`headerAngle` is signed degrees counter-clockwise from horizontal, 45 by
default: the sign chooses which way the labels climb, and so which end of the
table reserves the strip they lean into, while 90 stands them upright, which
costs no width at all. `meta.headerOrientation` overrides the table per column
in both directions, so the columns that identify a row stay flat in a table of
turned ones — and the generated select, expand, row-number and actions columns
never turn, since they hold a control rather than a label.

The rotation is CSS; what CSS cannot do is let the result take part in layout. A
`transform` is applied after sizing, so a turned label sizes nothing — including
the row it is in, which would stay one line tall with the labels standing over
the toolbar. Three lengths are measured from the labels and published to the
stylesheet: the height the tallest one needs, how far along the row every label
starts so the corner it leans away from stays inside its own cell, and the strip
at the end of the table for the longest label to lean into, painted in the
header's own colours so the band does not stop short of the labels crossing it.
Being out of flow is what keeps the other half of the promise: a label that
sizes nothing cannot widen its column, so this composes with
`enableHeaderContentFit` rather than fighting it.

Two smaller things come with it. Everything in a header row that holds a turned
label sits at the foot of the band, flat labels included — in the middle of a
header three times their own height they are both adrift from their column and
in the path of every label leaning across them. And the funnel and column menu
move to the foot of each label, above the data they filter, instead of riding to
the top of the climb where they end up a label's length from their own column.

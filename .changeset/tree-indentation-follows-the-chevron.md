---
'@mvd/table': patch
---

Indent a nested row's chevron, not whichever cell happened to come first.
Sub-row and group depth is now drawn by the expand column — one 16px step per
level, on the chevron itself — and the column reserves room for the deepest row
in the data, so a nested chevron is held rather than clipped.

Depth used to be a spacer inserted into the first cell of the row, which was
the wrong cell in both directions. Where the expand column *was* first, the
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

---
"@mvd/table": minor
---

Put pinned rows where pinning promised they would be.

A pinned row is `position: sticky`, and sticky wants an offset from the edge of
the scroll container — which is not where a pinned row belongs. Two things are
already parked at that edge, and neither was accounted for: a sticky header,
which is opaque and sat on top of the pinned row, and the rows pinned before it,
because sticky offsets do not stack on their own. So the first pinned row of a
table with `enableStickyHeader` disappeared under the header the moment you
scrolled to it, and pinning three rows showed one with two more hidden exactly
behind it. Both offsets are now measured — from the header, the footer and the
pinned rows themselves — so a pinned row clears the header and the rows already
stuck ahead of it, at any density, header height or row height.

The `sticky` mode left a pinned row where the sort had put it, which is what
Material React Table does — and a sticky row holds its edge only while the flow
has not carried it past. A row pinned to the bottom from the middle of the
order was therefore glued to the floor until you scrolled as far as it and came
loose from there on, drifting up the screen and off the top; a row pinned to
the top was not on screen at all until the scroll reached it. Pinned rows now
move to the two ends of the body, which is the only place an edge holds for the
whole scroll range.

`keepPinnedRows` is on by default and always was, which is what keeps a pinned
row on screen after a filter or a page has dropped it. The `sticky` display
mode never rendered those rows: pinning a row and then searching for something
else made it vanish, and a search that matched nothing left a body with no rows
and no empty state either. They are pinned at the edges with the rest now, and
the empty state says so when nothing else matched.

The `top`, `bottom` and `top-and-bottom` modes lift pinned rows into a section
of their own, and each section is now sticky as a block — the top one below the
header, the bottom one above a sticky footer. A section is rendered for
whichever direction has rows pinned to it rather than for the direction the mode
names, so a row pinned by `initialState` or `row.pin()` to the other one is
still rendered, and can still be unpinned from its own menu.

Row pinning works over a virtualized body for the first time. A virtualized row
is positioned absolutely and cannot also be sticky, so `sticky` renders the
sections there instead of doing nothing at all.

Two options come with it: `keepPinnedRows`, to turn that behaviour off, and
`enableRowPinning` as a predicate — `(row) => boolean`, the same shape
`enableRowSelection` and `enableEditing` already take.

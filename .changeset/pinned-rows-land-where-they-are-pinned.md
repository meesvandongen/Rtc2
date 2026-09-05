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
behind it. Every offset is now measured — from the header, the footer and the
pinned rows themselves — so a pinned row clears the header and the rows already
docked ahead of it, at any density, header height or row height.

The `sticky` mode was also only half built. A row was given one offset, and one
offset holds a row in one direction only: with a `top` alone it is simply not on
screen until the scroll reaches it, and with a `bottom` alone it is glued to the
floor until the scroll passes it and comes loose from there on, drifting up the
screen and away. A sticky pinned row now carries **both** offsets, which is what
the mode was always meant to be: the row keeps its place among its neighbours
while that place is on screen, docks under the header once the scroll goes past
it, and waits on the floor while the scroll is still above it. It is never
anywhere else.

Pinning is one choice in that mode, so the row menu offers one **Pin** rather
than a top and a bottom — both sides are held, and `rowPinning.top` / `.bottom`
now decide only where a row a filter has dropped is put back. (`pin` is a new
localization key.)

`keepPinnedRows` is on by default and always was, which is what keeps a pinned
row on screen after a filter or a page has dropped it. The `sticky` display
mode never rendered those rows: pinning a row and then searching for something
else made it vanish, and a search that matched nothing left a body with no rows
and no empty state either. They are folded back in now, at the edge they were
pinned to, and the empty state says so when nothing else matched.

The `top`, `bottom` and `top-and-bottom` modes lift pinned rows into a section
of their own, and each section is now sticky as a block — the top one below the
header, the bottom one above a sticky footer. A section is rendered for
whichever direction has rows pinned to it rather than for the direction the mode
names, so a row pinned by `initialState` or `row.pin()` to the other one is
still rendered, and can still be unpinned from its own menu.

Row pinning works over a virtualized body for the first time. A virtualized row
is positioned absolutely and cannot also be sticky, so `sticky` renders the
sections there instead of doing nothing at all.

A pinned row is also visible as pinned now: `--rtc-row-bg-pinned` is the accent
at 10% mixed into the surface, where it used to be the surface colour itself and
marked nothing. Half the strength of a selected row, which is the other thing a
row can be.

Two options come with it: `keepPinnedRows`, to turn that behaviour off, and
`enableRowPinning` as a predicate — `(row) => boolean`, the same shape
`enableRowSelection` and `enableEditing` already take.

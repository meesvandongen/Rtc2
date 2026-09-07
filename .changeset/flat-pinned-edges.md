---
"@mvd/table": minor
---

Draw the edge of a pinned block as a border rather than a shadow.

A pinned column stuck to the start or end of the table marked its inner edge
with `--rtc-shadow-pin-start` / `--rtc-shadow-pin-end`, and a sticky header with
`--rtc-shadow-sticky`. Those three are gone, replaced by one line —
`--rtc-border-pin`, twice the border width in `--rtc-color-border-strong` — and
the sticky header now leans on the strong bottom border its last row already
had. The table is flat: it no longer asserts an elevation of its own inside a
host design system that has its own ideas about depth, and a theme that wants
the edge louder or quieter has one value to set instead of two shadows to
compose. Menus, popovers and dialogs keep their elevation — they float over the
page rather than divide it, and two of the built-in theme presets style
`--rtc-shadow-menu` deliberately.

It is also the only thing that works on the axis a transposed table pins along.
There a pinned block — the label column, the footer column, a pinned record
section — is one cell per band rather than a single element, so its edge is
painted once per cell. A blurred shadow drawn that way has no good answer: with
the negative spread it stops short of each cell's own top and bottom and the run
comes out scalloped, pinched at every row line; without it the copy bleeds past
them and, since a cell paints after the one above it, smears across the full
width of that one. Borders meet exactly, and one rule now draws the edge in both
orientations.

Overriding `--rtc-shadow-pin-start`, `--rtc-shadow-pin-end` or
`--rtc-shadow-sticky` no longer does anything; set `--rtc-border-pin` instead.

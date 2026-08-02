---
"@rtc2/react-table": patch
---

Fix a see-through sticky header, stretched icon buttons, and a filter panel that
ignored the table's theme.

Three defects that only showed up once a design system was installed:

- **A transparent header colour made the sticky header see-through.** Header
  cells painted `--rtc-header-bg` *instead of* the table surface, so a theme
  entitled to a transparent header — shadcn's is — let the first body row show
  straight through the sticky header while scrolling, which read as two rows
  overlapping. The header colour is now painted *over* the surface, so a header
  cell is opaque whatever the theme puts on it. The same applies to a sticky
  footer and to pinned header cells.

- **Icon-only buttons came out stretched.** `.rtc-icon` is an SVG, and an SVG is
  an inline box: it sat on a text baseline and took the line height of whatever
  font size the host's button used rather than its own 16px. MUI's `IconButton`
  sets a 1.5rem font size, which turned every toolbar button into a 32×51
  rectangle. Icons are now `display: block`, and the wrapper the toolbar puts
  around them is `inline-flex`, so a button is exactly its icon plus its
  padding.

- **A docked filter panel reset the theme.** The panel carries `rtc-vars` so it
  can be rendered standalone, but a declaration on an element beats one
  inherited from an ancestor — nested inside the table it overwrote every
  variable with the package defaults and ignored the `cssVars` set on the table
  root. `rtc-vars` now only declares the palette outside a `.rtc-root`; inside
  one there is nothing to opt into, so the panel inherits.

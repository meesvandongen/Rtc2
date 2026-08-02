# @mvd/table

## 0.2.0

### Minor Changes

- f8eceb4: Name the generated columns properly in the column-visibility menu.

  The menu listed the component's own display columns by their internal id —
  `rtc-row-actions`, `rtc-select`, `rtc-row-number` — which was both unreadable
  and untranslated. They now use the matching localization string (`actions`,
  `select`, `expand`, `rowNumbers`, `move`), as do the `aria-label`s that name a
  column, so a table with a `localization` override reads "Acties" rather than
  `rtc-row-actions`.

  Two additions come with it:

  - `meta.label` on a column definition supplies a human-readable name for a
    column whose `header` is a render function or an element. It takes precedence
    everywhere a column is named.
  - `getDisplayColumnLabel(id, localization)` is exported, for consumers building
    their own column menu.

- Match material-react-table's grouped column modes.

  `groupedColumnMode: 'remove'` produced anonymous group rows. TanStack drops the
  grouped column from the table for that mode and nothing put its value back, so
  every group rendered as a blank row with a chevron and an aggregate — there was
  no way to tell one group from another.

  Following material-react-table, the expand column now stands in for the columns
  `'remove'` takes away: it widens to a data column, its header names them
  ("Department, City"), and each group row shows the group value and its row count
  beside the chevron.

  Three related differences went with it:

  - **Grouping needed `enableExpanding` before a group could be opened.** A group
    row that cannot open is a dead end, so `enableExpanding` now defaults to on
    when grouping is enabled, and the expand column appears whenever a column is
    grouped — not only under `enableExpanding` or `renderDetailPanel`.
  - **The expand chevron was drawn twice under `'reorder'`** — once inside the
    grouped cell, once in the expand column. It now lives only in the expand
    column; the grouped cell keeps the value and the count.
  - **Tree indentation stepped in two places at once** while grouping was active.
    It now goes on the expand column, so nested groups indent once.

  The display columns that address a single record — the drag grip and the row
  actions — also stay blank on group rows, as they do in material-react-table.

### Patch Changes

- f8eceb4: Fix dark mode for browser-drawn chrome and for scrollable overlays.

  `.rtc-root` and `.rtc-vars` now declare `color-scheme` alongside the palette, so
  the parts the browser paints itself follow the theme: the drop-down list of a
  native `<select>`, date and number spinners, and default scrollbars. A dark
  table no longer opens a white select popup.

  Scrollbars are also styled on every scroll container the component owns, not
  just the table viewport. The filter menu, the column and row-action menus, the
  filter panel, the checkbox list inside a filter and the modal editor were all
  falling back to a light scrollbar sitting on a dark surface.

- bfa9e1e: Fix a see-through sticky header, stretched icon buttons, and a filter panel that
  ignored the table's theme.

  Three defects that only showed up once a design system was installed:

  - **A transparent header colour made the sticky header see-through.** Header
    cells painted `--rtc-header-bg` _instead of_ the table surface, so a theme
    entitled to a transparent header — shadcn's is — let the first body row show
    straight through the sticky header while scrolling, which read as two rows
    overlapping. The header colour is now painted _over_ the surface, so a header
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

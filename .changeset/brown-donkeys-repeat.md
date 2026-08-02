---
"@mvd/table": minor
---

Name the generated columns properly in the column-visibility menu.

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

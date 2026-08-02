---
"@rtc2/react-table": minor
---

Match material-react-table's grouped column modes.

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

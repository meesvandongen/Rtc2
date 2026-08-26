import type { RowData } from '@tanstack/react-table'

import type { DataTableInstance, DataTableRow } from '../types'

/** One `<tr>` in the body: a row, or the detail panel that follows it. */
export interface BodyItem<TData extends RowData> {
  kind: 'row' | 'detail'
  row: DataTableRow<TData>
  /** Position among the rows, which is what zebra striping counts. */
  rowIndex: number
}

/**
 * Resolves what the body renders, panels included.
 *
 * A detail panel is an item of its own rather than a second `<tr>` tucked
 * inside its row's, because the virtualizer positions and measures exactly one
 * element per index. A panel hidden inside a row would be left out of both: out
 * of the measurement, so the rows below it would overlap it, and out of the
 * positioning, so it would fall back to its static position — the top of the
 * body, where it would paint over the first row and push every row after it in
 * the DOM down by its own height.
 *
 * The plain body resolves the same items so the two paths cannot disagree about
 * where a panel goes or which rows have one.
 */
export function getBodyItems<TData extends RowData>(
  table: DataTableInstance<TData>,
  rows: Array<DataTableRow<TData>>,
): Array<BodyItem<TData>> {
  if (!table.dataTableOptions.renderDetailPanel) {
    return rows.map((row, rowIndex) => ({ kind: 'row', row, rowIndex }))
  }

  const items: Array<BodyItem<TData>> = []
  rows.forEach((row, rowIndex) => {
    items.push({ kind: 'row', row, rowIndex })
    // Expanding a group row reveals the rows it stands for; there is no
    // `original` behind it for a panel to describe.
    if (row.getIsExpanded() && !row.getIsGrouped()) {
      items.push({ kind: 'detail', row, rowIndex })
    }
  })
  return items
}

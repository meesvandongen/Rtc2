import type { RowData } from '@tanstack/react-table'

import { cx } from '../utils'
import type { DataTableInstance, DataTableRow } from '../types'

export interface DetailRowProps<TData extends RowData> {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
  columnCount: number
  /** Virtualization: measured and positioned by the row virtualizer. */
  virtualRef?: (node: HTMLTableRowElement | null) => void
  virtualStart?: number
  /** Required by `virtualizer.measureElement`, which reads `data-index`. */
  virtualIndex?: number
}

/**
 * The full-width row that carries a row's detail panel.
 *
 * A component of its own, rather than markup inside `BodyRow`, so the panel is
 * a sibling the virtualizer can position and measure — see `getBodyItems`. It
 * also keeps `renderDetailPanel` called from a component that exists only while
 * the panel is on screen: resolving it any higher would build the content of
 * every expanded row in the table, including the ones the window never mounts.
 */
export function DetailRow<TData extends RowData>({
  table,
  row,
  columnCount,
  virtualRef,
  virtualStart,
  virtualIndex,
}: DetailRowProps<TData>) {
  const options = table.dataTableOptions

  return (
    <tr
      ref={virtualRef}
      className={cx('rtc-tr', 'rtc-detail-row')}
      style={
        virtualStart !== undefined
          ? { transform: `translateY(${virtualStart}px)`, position: 'absolute', top: 0, width: '100%' }
          : undefined
      }
      data-index={virtualIndex}
      data-rtc-detail-for={row.id}
    >
      <td className="rtc-td" colSpan={columnCount}>
        <div className="rtc-detail-content">{options.renderDetailPanel?.({ table, row })}</div>
      </td>
    </tr>
  )
}

import type { RowData } from '@tanstack/react-table'
import { useDrag } from '../dragContext'
import { reorder } from '../utils'
import { DragIcon } from './primitives/Icons'
import { IconButton } from './primitives/Controls'
import type { DataTableInstance, DataTableRow } from '../types'

/**
 * Grip for manual row ordering. Also supports keyboard reordering with the
 * arrow keys, since pointer dragging alone is not accessible.
 */
export function RowDragHandle<TData extends RowData>({
  table,
  row,
}: {
  table: DataTableInstance<TData>
  row: DataTableRow<TData>
}) {
  const drag = useDrag()
  const { localization } = table.dataTableOptions

  const move = (delta: number) => {
    table.setRowOrder((order) => {
      const from = order.indexOf(row.id)
      if (from === -1) return order
      return reorder(order, from, Math.min(Math.max(from + delta, 0), order.length - 1))
    })
  }

  return (
    <IconButton
      className="rtc-drag-handle"
      size="sm"
      label={`${localization.move} ${localization.rowNumber}${row.index + 1}`}
      data-rtc-active={drag.kind === 'row' && drag.activeId === row.id}
      onPointerDown={(event) => drag.start('row', row.id, event)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          move(-1)
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          move(1)
        }
      }}
    >
      <DragIcon />
    </IconButton>
  )
}

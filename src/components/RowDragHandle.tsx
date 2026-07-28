import type { RowData } from '@tanstack/react-table'

import { useComponents } from './registry'
import { useDrag } from '../dragContext'
import { reorder } from '../utils'
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
  const ui = useComponents()
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
    <ui.IconButton
      className="rtc-drag-handle"
      size="sm"
      label={`${localization.move} ${row.index + 1}`}
      active={drag.kind === 'row' && drag.activeId === row.id}
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
      <ui.Icon name="drag" />
    </ui.IconButton>
  )
}

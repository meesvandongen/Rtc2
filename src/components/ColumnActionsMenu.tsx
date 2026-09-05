import type { RowData } from '@tanstack/react-table'

import { useComponents, type RtcMenuItem } from './registry'
import { formatMessage } from '../locale'
import { getColumnLabel } from '../utils'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * Per-column overflow menu: sorting, grouping, pinning, hiding, sizing.
 *
 * Built as a data array rather than children because the registry's `Menu`
 * contract is data-driven — that is what lets a config-object library like
 * Mantine back it.
 */
export function ColumnActionsMenu<TData extends RowData>({
  table,
  column,
}: {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
}) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const label = getColumnLabel(column, localization)

  const sorted = column.getIsSorted()
  const pinned = column.getIsPinned()
  const items: RtcMenuItem[] = []

  if ((options.enableSorting ?? true) && column.getCanSort()) {
    items.push(
      {
        id: 'sort-asc',
        label: formatMessage(localization.sortByColumnAsc, { column: label }),
        icon: <ui.Icon name="sortAsc" />,
        active: sorted === 'asc',
        onSelect: () => column.toggleSorting(false, false),
      },
      {
        id: 'sort-desc',
        label: formatMessage(localization.sortByColumnDesc, { column: label }),
        icon: <ui.Icon name="sortDesc" />,
        active: sorted === 'desc',
        onSelect: () => column.toggleSorting(true, false),
      },
    )
    if (sorted) {
      items.push({
        id: 'sort-clear',
        label: localization.clearSort,
        icon: <ui.Icon name="close" />,
        onSelect: () => column.clearSorting(),
      })
    }
    items.push({ type: 'separator', id: 'sep-sort' })
  }

  if ((options.enableGrouping ?? false) && column.getCanGroup()) {
    items.push({
      id: 'group',
      label: formatMessage(
        column.getIsGrouped() ? localization.ungroupByColumn : localization.groupByColumn,
        { column: label },
      ),
      icon: <ui.Icon name="group" />,
      active: column.getIsGrouped(),
      onSelect: () => column.toggleGrouping(),
    })
  }

  if ((options.enableColumnPinning ?? false) && column.getCanPin()) {
    // A pinned column sticks to the start or end of a row upright, and to the
    // top or bottom of the table once it *is* a row. Same state, same command,
    // and the menu has to say which of the two it will do.
    const startLabel = table.ui.transposed ? localization.pinToTop : localization.pinToStart
    const endLabel = table.ui.transposed ? localization.pinToBottom : localization.pinToEnd
    items.push(
      {
        id: 'pin-start',
        label: pinned === 'start' ? localization.unpin : startLabel,
        icon: <ui.Icon name="pin" />,
        active: pinned === 'start',
        onSelect: () => column.pin(pinned === 'start' ? false : 'start'),
      },
      {
        id: 'pin-end',
        label: pinned === 'end' ? localization.unpin : endLabel,
        icon: <ui.Icon name="pin" />,
        active: pinned === 'end',
        onSelect: () => column.pin(pinned === 'end' ? false : 'end'),
      },
    )
    if (pinned) {
      items.push({
        id: 'unpin',
        label: localization.unpin,
        icon: <ui.Icon name="pinOff" />,
        onSelect: () => column.pin(false),
      })
    }
  }

  if ((options.enableColumnResizing ?? false) && column.getCanResize()) {
    items.push({
      id: 'reset-size',
      label: localization.resetColumnSize,
      icon: <ui.Icon name="reset" />,
      onSelect: () => column.resetSize(),
    })
  }

  if (column.getCanHide()) {
    items.push({
      id: 'hide',
      label: formatMessage(localization.hideColumn, { column: label }),
      icon: <ui.Icon name="eyeOff" />,
      onSelect: () => column.toggleVisibility(false),
    })
  }

  if (column.columnDef.meta?.description) {
    items.push(
      { type: 'separator', id: 'sep-desc' },
      { type: 'label', id: 'desc', label: column.columnDef.meta.description },
    )
  }

  if (items.length === 0) return null

  return (
    <ui.Menu
      align="end"
      label={formatMessage(localization.columnActions, { column: label })}
      items={items}
      trigger={
        <ui.IconButton
          size="sm"
          className="rtc-column-actions-trigger"
          label={`${localization.columnActions}: ${label}`}
        >
          <ui.Icon name="more" />
        </ui.IconButton>
      }
    />
  )
}

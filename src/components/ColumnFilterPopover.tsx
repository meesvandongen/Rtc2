import type { RowData } from '@tanstack/react-table'

import { FilterConditions } from './FilterConditions'
import { useComponents } from './registry'
import { formatMessage } from '../locale'
import { getColumnLabel } from '../utils'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * The per-column filter affordance in the header.
 *
 * A funnel button that opens the column's editor in a popover, so a tall
 * control (date range, checkbox list, slider) costs no row height. The button
 * reflects whether the column is currently filtered.
 */
export function ColumnFilterPopover<TData extends RowData>({
  table,
  column,
}: {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
}) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions
  const label = getColumnLabel(column, localization)
  const isActive = column.getIsFiltered()

  return (
    <ui.Popover
      align="start"
      label={formatMessage(localization.filterByColumn, { column: label })}
      trigger={
        <ui.IconButton
          size="sm"
          active={isActive}
          label={formatMessage(localization.filterByColumn, { column: label })}
          className="rtc-filter-trigger"
        >
          <ui.Icon name="filter" />
        </ui.IconButton>
      }
    >
      <div className="rtc-filter-popover" data-rtc-filter-popover={column.id}>
        <div className="rtc-filter-popover-header">
          <ui.Label className="rtc-filter-field-label">{label}</ui.Label>
          {isActive ? (
            <ui.Button
              size="sm"
              variant="quiet"
              onClick={() => column.setFilterValue(undefined)}
            >
              {localization.clearFilter}
            </ui.Button>
          ) : null}
        </div>

        <FilterConditions table={table} column={column} size="sm" />
      </div>
    </ui.Popover>
  )
}

import { useState } from 'react'
import type { RowData } from '@tanstack/react-table'

import { FilterConditions } from './FilterConditions'
import { useComponents } from './registry'
import { formatMessage } from '../locale'
import { usesFilterDrawer } from '../responsive'
import { getColumnLabel } from '../utils'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * The per-column filter affordance in the header.
 *
 * A funnel button that opens the column's editor in a popover, so a tall
 * control (date range, checkbox list, slider) costs no row height. The button
 * reflects whether the column is currently filtered.
 *
 * On a narrow viewport the same editor opens in a `Drawer` instead: a popover
 * anchored to a 24px button in a horizontally-scrolling header has nowhere to
 * go on a phone. See `enableMobileFilterDrawer`.
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
  const triggerLabel = formatMessage(localization.filterByColumn, { column: label })
  const asDrawer = usesFilterDrawer(table)

  const [drawerOpen, setDrawerOpen] = useState(false)

  const trigger = (
    <ui.IconButton
      size="sm"
      active={isActive}
      label={triggerLabel}
      className="rtc-filter-trigger"
      // Only in drawer mode: in popover mode the overlay owns the click, and
      // an `onClick` of ours would fight the trigger it wires up.
      {...(asDrawer ? { onClick: () => setDrawerOpen(true) } : {})}
    >
      <ui.Icon name="filter" />
    </ui.IconButton>
  )

  const clearButton = isActive ? (
    <ui.Button size="sm" variant="quiet" onClick={() => column.setFilterValue(undefined)}>
      {localization.clearFilter}
    </ui.Button>
  ) : null

  if (asDrawer) {
    return (
      <>
        {trigger}
        <ui.Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={label}
          label={triggerLabel}
          closeLabel={localization.close}
          footer={
            <>
              {clearButton ? <span className="rtc-drawer-footer-start">{clearButton}</span> : null}
              <ui.Button size="sm" variant="primary" onClick={() => setDrawerOpen(false)}>
                {localization.done}
              </ui.Button>
            </>
          }
        >
          <div className="rtc-filter-drawer-field" data-rtc-filter-drawer={column.id}>
            <FilterConditions table={table} column={column} />
          </div>
        </ui.Drawer>
      </>
    )
  }

  return (
    <ui.Popover align="start" label={triggerLabel} trigger={trigger}>
      <div className="rtc-filter-popover" data-rtc-filter-popover={column.id}>
        <div className="rtc-filter-popover-header">
          <span className="rtc-filter-field-label">{label}</span>
          {clearButton}
        </div>

        <FilterConditions table={table} column={column} size="sm" />
      </div>
    </ui.Popover>
  )
}

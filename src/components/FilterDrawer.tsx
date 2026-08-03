import type { RowData } from '@tanstack/react-table'

import { defaultComponents } from './defaultComponents'
import { DataTableFilterPanel } from './FilterPanel'
import { DataTableComponentsProvider, useComponents } from './registry'
import type { DataTableInstance } from '../types'

export interface DataTableFilterDrawerProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Edge the sheet slides in from. Defaults to `bottom`. */
  side?: 'bottom' | 'start' | 'end'
}

/**
 * Every filterable column, in a modal sheet.
 *
 * The mobile form of the docked filter panel: same content, but over the table
 * rather than beside it, because a 280px pane and a phone-width table cannot
 * both fit. `<DataTable />` renders this instead of the docked panel below
 * `mobileBreakpoint`; it is exported so a layout that owns its own chrome can
 * put the sheet behind its own button.
 *
 * Open state is `ui.showFilterPanel`, shared with the docked panel, so a table
 * that is resized across the breakpoint keeps the user's intent.
 */
export function DataTableFilterDrawer<TData extends RowData>(
  props: DataTableFilterDrawerProps<TData>,
) {
  // Its own registry, like the panel's: the point of exporting it is that it
  // can be rendered outside `<DataTable />`, where no provider is in scope.
  return (
    <DataTableComponentsProvider
      base={defaultComponents}
      components={props.table.dataTableOptions.components}
    >
      <FilterDrawerContent {...props} />
    </DataTableComponentsProvider>
  )
}

function FilterDrawerContent<TData extends RowData>({
  table,
  side = 'bottom',
}: DataTableFilterDrawerProps<TData>) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions
  const close = () => table.setShowFilterPanel(false)

  return (
    <ui.Drawer
      open={table.ui.showFilterPanel}
      onClose={close}
      side={side}
      title={localization.filters}
      label={localization.filters}
      closeLabel={localization.close}
      footer={
        <>
          {table.state.columnFilters.length > 0 ? (
            <span className="rtc-drawer-footer-start">
              <ui.Button
                size="sm"
                variant="quiet"
                onClick={() => table.resetColumnFilters()}
                className="rtc-filter-clear-all"
              >
                {localization.clearAllFilters}
              </ui.Button>
            </span>
          ) : null}
          <ui.Button size="sm" variant="primary" onClick={close}>
            {localization.done}
          </ui.Button>
        </>
      }
    >
      <DataTableFilterPanel table={table} className="rtc-filter-panel-sheet" hideHeader />
    </ui.Drawer>
  )
}

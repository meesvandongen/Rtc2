import type { RowData } from '@tanstack/react-table'

import { defaultComponents } from './defaultComponents'
import { FilterEditor, filterModeItems, hasFilterModes, currentFilterMode } from './FilterEditor'
import { DataTableComponentsProvider, useComponents } from './registry'
import { isDisplayColumnId } from '../displayColumns'
import { formatMessage } from '../locale'
import { cx, getColumnLabel } from '../utils'
import type { DataTableInstance } from '../types'

export interface DataTableFilterPanelProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Extra class on the panel root. */
  className?: string
  /** Hide the header row with the title and "clear all". */
  hideHeader?: boolean
}

/**
 * A vertical, scrollable list of every filterable column.
 *
 * Exported as a standalone component precisely because tall editors — date
 * ranges, checkbox groups, sliders — do not fit in a table row without forcing
 * every row to that height. Render it inside the table via
 * `filterDisplayMode: 'panel'`, or anywhere else in your layout by passing the
 * instance from `useDataTable`.
 *
 * It installs its own component registry from the table's options rather than
 * relying on an ancestor provider, because the whole point of the standalone
 * form is that it can be rendered outside `<DataTable />`.
 */
export function DataTableFilterPanel<TData extends RowData>(
  props: DataTableFilterPanelProps<TData>,
) {
  return (
    <DataTableComponentsProvider
      base={defaultComponents}
      components={props.table.dataTableOptions.components}
    >
      <FilterPanelContent {...props} />
    </DataTableComponentsProvider>
  )
}

function FilterPanelContent<TData extends RowData>({
  table,
  className,
  hideHeader,
}: DataTableFilterPanelProps<TData>) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  const columns = table
    .getAllLeafColumns()
    .filter((column) => !isDisplayColumnId(column.id) && column.getCanFilter())

  const activeCount = table.state.columnFilters.length

  return (
    <div className={cx('rtc-filter-panel', className)} data-rtc-filter-panel="">
      {hideHeader ? null : (
        <div className="rtc-filter-panel-header">
          <span className="rtc-filter-panel-title">{localization.filters}</span>
          {activeCount > 0 ? (
            <ui.Button
              size="sm"
              variant="quiet"
              onClick={() => table.resetColumnFilters()}
              className="rtc-filter-clear-all"
            >
              {localization.clearAllFilters}
            </ui.Button>
          ) : null}
        </div>
      )}

      <div className="rtc-filter-panel-body">
        {columns.length === 0 ? (
          <p className="rtc-filter-panel-empty">{localization.noFilterableColumns}</p>
        ) : null}

        {columns.map((column) => {
          const label = getColumnLabel(column)
          const isActive = column.getIsFiltered()
          return (
            <div
              className="rtc-filter-field"
              key={column.id}
              data-rtc-filter-field={column.id}
              data-rtc-active={isActive ? 'true' : undefined}
            >
              <div className="rtc-filter-field-header">
                <span className="rtc-filter-field-label">{label}</span>

                {hasFilterModes(table, column as never) ? (
                  <ui.Menu
                    align="end"
                    label={localization.changeFilterMode}
                    items={filterModeItems(table, column as never)}
                    trigger={
                      <ui.IconButton
                        size="sm"
                        label={formatMessage(localization.filterMode, {
                          filterType:
                            localization.filterOperators[
                              currentFilterMode(table, column as never)
                            ] ?? currentFilterMode(table, column as never),
                        })}
                      >
                        <ui.Icon name="filter" />
                      </ui.IconButton>
                    }
                  />
                ) : null}

                {isActive ? (
                  <ui.IconButton
                    size="sm"
                    label={`${localization.clearFilter}: ${label}`}
                    onClick={() => column.setFilterValue(undefined)}
                  >
                    <ui.Icon name="close" />
                  </ui.IconButton>
                ) : null}
              </div>

              <FilterEditor table={table} column={column as never} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

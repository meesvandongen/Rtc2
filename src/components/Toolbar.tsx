import { useEffect, useState } from 'react'
import type { RowData } from '@tanstack/react-table'

import { GroupingChips } from './GroupingChips'
import { Pagination } from './Pagination'
import { useComponents, type RtcMenuItem } from './registry'
import { formatMessage } from '../locale'
import { cx, getColumnLabel } from '../utils'
import type { DataTableDensity, DataTableInstance } from '../types'

const DENSITY_ORDER: DataTableDensity[] = ['comfortable', 'compact', 'spacious']

export function TopToolbar<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const options = table.dataTableOptions
  const showGroupingChips =
    (options.enableGrouping ?? false) && (options.enableGroupingChips ?? false)
  const showPagination =
    (options.enablePagination ?? true) &&
    (options.paginationPosition === 'top' || options.paginationPosition === 'both')

  return (
    <div
      className={cx('rtc-toolbar', options.classNames?.topToolbar)}
      data-rtc-position="top"
      data-rtc-toolbar="top"
    >
      {options.renderTopToolbarActions?.({ table })}
      {showGroupingChips ? <GroupingChips table={table} /> : null}
      <SelectionSummary table={table} />
      <ActiveFilterChips table={table} />
      <span className="rtc-toolbar-spacer" />
      <GlobalFilterField table={table} />
      {showPagination ? <Pagination table={table} /> : null}
      {(options.enableToolbarInternalActions ?? true) ? <InternalActions table={table} /> : null}
    </div>
  )
}

export function BottomToolbar<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const options = table.dataTableOptions
  const showPagination =
    (options.enablePagination ?? true) && (options.paginationPosition ?? 'bottom') !== 'top'

  return (
    <div
      className={cx('rtc-toolbar', options.classNames?.bottomToolbar)}
      data-rtc-position="bottom"
      data-rtc-toolbar="bottom"
    >
      {options.renderBottomToolbarActions?.({ table })}
      <span className="rtc-toolbar-spacer" />
      {showPagination ? <Pagination table={table} /> : null}
    </div>
  )
}

function SelectionSummary<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  if (!options.enableRowSelection) return null
  const selectedCount = Object.values(table.state.rowSelection).filter(Boolean).length
  if (selectedCount === 0) return null

  return (
    <span className="rtc-toolbar-alert" data-rtc-selection-summary="" aria-live="polite">
      {formatMessage(options.localization.selectedCountOfRowCountRowsSelected, {
        selectedCount,
        rowCount: table.getPrePaginatedRowModel().rows.length,
      })}
    </span>
  )
}

/**
 * Removable chips for the active column filters.
 *
 * With filters behind popovers there is no longer a row of visibly-filled
 * inputs, so without this the only cue that a filter is applied would be a
 * highlighted funnel icon somewhere off-screen.
 */
function ActiveFilterChips<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const options = table.dataTableOptions
  if ((options.enableColumnFilters ?? true) === false) return null
  if ((options.showActiveFilterChips ?? true) === false) return null

  const filters = table.state.columnFilters
  if (filters.length === 0) return null

  return (
    <span className="rtc-filter-chips" data-rtc-active-filters="">
      {filters.map((filter) => {
        const column = table.getColumn(filter.id)
        if (!column) return null
        return (
          <span key={filter.id} data-rtc-filter-chip={filter.id}>
            <ui.Badge
              onRemove={() => column.setFilterValue(undefined)}
              removeLabel={`${options.localization.clearFilter}: ${getColumnLabel(column)}`}
            >
              {getColumnLabel(column)}
            </ui.Badge>
          </span>
        )
      })}
    </span>
  )
}

/**
 * Debounced global search.
 *
 * The input is local state so typing stays responsive; the table's filter is
 * updated on a short delay to avoid re-filtering on every keystroke.
 */
function GlobalFilterField<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const enabled = options.enableGlobalFilter ?? true
  const toggleable = options.enableGlobalFilterToggle ?? true
  const visible = !toggleable || table.ui.showGlobalFilter

  const globalFilter = table.state.globalFilter
  const [draft, setDraft] = useState(globalFilter)

  useEffect(() => {
    setDraft(globalFilter)
  }, [globalFilter])

  useEffect(() => {
    if (draft === globalFilter) return
    const timer = setTimeout(() => table.setGlobalFilter(draft), 200)
    return () => clearTimeout(timer)
  }, [draft, globalFilter, table])

  if (!enabled || !visible) return null

  return (
    <div className="rtc-search">
      <ui.TextInput
        type="search"
        value={draft}
        label={localization.search}
        placeholder={localization.search}
        onChange={setDraft}
        dataAttributes={{ 'data-rtc-global-filter': '' }}
      />
      {draft ? (
        <span className="rtc-search-clear">
          <ui.IconButton
            size="sm"
            label={localization.clearSearch}
            onClick={() => {
              setDraft('')
              table.setGlobalFilter('')
            }}
          >
            <ui.Icon name="close" />
          </ui.IconButton>
        </span>
      ) : null}
    </div>
  )
}

function InternalActions<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const filterMode = options.filterDisplayMode ?? 'popover'
  const panelAvailable = filterMode === 'panel' || filterMode === 'popover-and-panel'

  return (
    <div className="rtc-toolbar-actions">
      {options.renderToolbarInternalActions?.({ table })}

      {(options.enableGlobalFilter ?? true) && (options.enableGlobalFilterToggle ?? true) ? (
        <ui.IconButton
          label={localization.showHideSearch}
          active={table.ui.showGlobalFilter}
          onClick={() => table.setShowGlobalFilter((value) => !value)}
        >
          <span data-rtc-action="toggle-search">
            <ui.Icon name="search" />
          </span>
        </ui.IconButton>
      ) : null}

      {(options.enableColumnFilters ?? true) && panelAvailable ? (
        <ui.IconButton
          label={localization.showHideFilters}
          active={table.ui.showFilterPanel}
          onClick={() => table.setShowFilterPanel((value) => !value)}
        >
          <span data-rtc-action="toggle-filters">
            <ui.Icon name="filter" />
          </span>
        </ui.IconButton>
      ) : null}

      {(options.enableColumnVisibility ?? true) ? <ColumnVisibilityMenu table={table} /> : null}

      {(options.enableDensityToggle ?? true) ? (
        <ui.IconButton
          label={localization.toggleDensity}
          onClick={() => {
            const index = DENSITY_ORDER.indexOf(table.ui.density)
            table.setDensity(DENSITY_ORDER[(index + 1) % DENSITY_ORDER.length] as DataTableDensity)
          }}
        >
          <span data-rtc-action="toggle-density" data-rtc-density-value={table.ui.density}>
            <ui.Icon name="density" />
          </span>
        </ui.IconButton>
      ) : null}

      {(options.enableFullScreenToggle ?? true) ? (
        <ui.IconButton
          label={localization.toggleFullScreen}
          active={table.ui.isFullScreen}
          onClick={() => table.setIsFullScreen((value) => !value)}
        >
          <span data-rtc-action="toggle-fullscreen">
            <ui.Icon name={table.ui.isFullScreen ? 'exitFullScreen' : 'fullScreen'} />
          </span>
        </ui.IconButton>
      ) : null}

      {options.isLoadingError ? (
        <span className="rtc-toolbar-alert" role="alert">
          <ui.Icon name="alert" />
        </span>
      ) : null}
    </div>
  )
}

function ColumnVisibilityMenu<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  const items: RtcMenuItem[] = [
    { type: 'label', id: 'label', label: localization.showHideColumns },
    ...table.getAllLeafColumns().map((column) => ({
      type: 'checkbox' as const,
      id: column.id,
      label: getColumnLabel(column),
      checked: column.getIsVisible(),
      disabled: !column.getCanHide(),
      icon: <ui.Icon name={column.getIsVisible() ? 'eye' : 'eyeOff'} />,
      onSelect: () => column.toggleVisibility(),
    })),
    { type: 'separator', id: 'sep' },
    {
      id: 'show-all',
      label: localization.showAllColumns,
      icon: <ui.Icon name="eye" />,
      onSelect: () => table.toggleAllColumnsVisible(true),
    },
    {
      id: 'hide-all',
      label: localization.hideAll,
      icon: <ui.Icon name="eyeOff" />,
      onSelect: () => table.toggleAllColumnsVisible(false),
    },
  ]

  return (
    <ui.Menu
      align="end"
      label={localization.showHideColumns}
      items={items}
      trigger={
        <ui.IconButton label={localization.showHideColumns}>
          <span data-rtc-action="toggle-columns">
            <ui.Icon name="columns" />
          </span>
        </ui.IconButton>
      }
    />
  )
}

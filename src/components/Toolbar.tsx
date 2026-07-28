import type { RowData } from '@tanstack/react-table'
import { useEffect, useState } from 'react'

import { GroupingChips } from './GroupingChips'
import { Pagination } from './Pagination'
import { formatMessage } from '../locale'
import { cx, getColumnLabel } from '../utils'
import { IconButton, TextInput } from './primitives/Controls'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from './primitives/Menu'
import {
  AlertIcon,
  CloseIcon,
  ColumnsIcon,
  DensityIcon,
  ExitFullScreenIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  FullScreenIcon,
  SearchIcon,
} from './primitives/Icons'
import type { DataTableDensity, DataTableInstance } from '../types'

const DENSITY_ORDER: DataTableDensity[] = ['comfortable', 'compact', 'spacious']

export function TopToolbar<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const showGroupingChips = (options.enableGrouping ?? false) && (options.enableGroupingChips ?? false)
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
      <span className="rtc-toolbar-spacer" />
      <GlobalFilterField table={table} />
      {showPagination ? <Pagination table={table} /> : null}
      {(options.enableToolbarInternalActions ?? true) ? <InternalActions table={table} /> : null}
    </div>
  )
}

export function BottomToolbar<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const showPagination =
    (options.enablePagination ?? true) &&
    (options.paginationPosition ?? 'bottom') !== 'top'

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
 * Debounced global search.
 *
 * The input is local state so typing stays responsive; the table's filter is
 * updated on a short delay to avoid re-filtering on every keystroke.
 */
function GlobalFilterField<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
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
      <span className="rtc-search-icon">
        <SearchIcon />
      </span>
      <TextInput
        type="search"
        value={draft}
        placeholder={localization.search}
        aria-label={localization.search}
        data-rtc-global-filter=""
        onChange={(event) => setDraft(event.target.value)}
      />
      {draft ? (
        <IconButton
          className="rtc-search-clear"
          size="sm"
          label={localization.clearSearch}
          onClick={() => {
            setDraft('')
            table.setGlobalFilter('')
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </div>
  )
}

function InternalActions<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const { localization } = options

  return (
    <div className="rtc-toolbar-actions">
      {options.renderToolbarInternalActions?.({ table })}

      {(options.enableGlobalFilter ?? true) && (options.enableGlobalFilterToggle ?? true) ? (
        <IconButton
          label={localization.showHideSearch}
          active={table.ui.showGlobalFilter}
          data-rtc-action="toggle-search"
          onClick={() => table.setShowGlobalFilter((value) => !value)}
        >
          <SearchIcon />
        </IconButton>
      ) : null}

      {(options.enableColumnFilters ?? true) &&
      (options.enableColumnFilterToggle ?? true) &&
      (options.columnFilterDisplayMode ?? 'subheader') === 'subheader' ? (
        <IconButton
          label={localization.showHideFilters}
          active={table.ui.showColumnFilters}
          data-rtc-action="toggle-filters"
          onClick={() => table.setShowColumnFilters((value) => !value)}
        >
          <FilterIcon />
        </IconButton>
      ) : null}

      {(options.enableColumnVisibility ?? true) ? <ColumnVisibilityMenu table={table} /> : null}

      {(options.enableDensityToggle ?? true) ? (
        <IconButton
          label={localization.toggleDensity}
          data-rtc-action="toggle-density"
          data-rtc-density-value={table.ui.density}
          onClick={() => {
            const index = DENSITY_ORDER.indexOf(table.ui.density)
            table.setDensity(DENSITY_ORDER[(index + 1) % DENSITY_ORDER.length] as DataTableDensity)
          }}
        >
          <DensityIcon />
        </IconButton>
      ) : null}

      {(options.enableFullScreenToggle ?? true) ? (
        <IconButton
          label={localization.toggleFullScreen}
          active={table.ui.isFullScreen}
          data-rtc-action="toggle-fullscreen"
          onClick={() => table.setIsFullScreen((value) => !value)}
        >
          {table.ui.isFullScreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
        </IconButton>
      ) : null}

      {options.isLoadingError ? (
        <span className="rtc-toolbar-alert" role="alert">
          <AlertIcon />
        </span>
      ) : null}
    </div>
  )
}

function ColumnVisibilityMenu<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const { localization } = table.dataTableOptions
  const columns = table.getAllLeafColumns()

  return (
    <Menu
      align="end"
      label={localization.showHideColumns}
      trigger={(triggerProps) => (
        <IconButton
          label={localization.showHideColumns}
          data-rtc-action="toggle-columns"
          {...(triggerProps as any)}
        >
          <ColumnsIcon />
        </IconButton>
      )}
    >
      {() => (
        <>
          <MenuLabel>{localization.showHideColumns}</MenuLabel>
          {columns.map((column) => {
            const label = getColumnLabel(column)
            const visible = column.getIsVisible()
            return (
              <MenuItem
                key={column.id}
                role="menuitemcheckbox"
                checked={visible}
                disabled={!column.getCanHide()}
                icon={visible ? <EyeIcon /> : <EyeOffIcon />}
                onClick={() => column.toggleVisibility()}
              >
                {label}
              </MenuItem>
            )
          })}
          <MenuSeparator />
          <MenuItem icon={<EyeIcon />} onClick={() => table.toggleAllColumnsVisible(true)}>
            {localization.showAllColumns}
          </MenuItem>
          <MenuItem icon={<EyeOffIcon />} onClick={() => table.toggleAllColumnsVisible(false)}>
            {localization.hideAll}
          </MenuItem>
        </>
      )}
    </Menu>
  )
}

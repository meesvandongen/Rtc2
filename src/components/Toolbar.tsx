import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { RowData } from '@tanstack/react-table'

import { describeFilter } from './FilterEditor'
import { GroupingChips } from './GroupingChips'
import { Pagination } from './Pagination'
import { useComponents, type RtcMenuItem } from './registry'
import { formatMessage } from '../locale'
import { usesFilterDrawer } from '../responsive'
import { cx, getColumnLabel } from '../utils'
import type { DataTableDensity, DataTableInstance } from '../types'

const DENSITY_ORDER: DataTableDensity[] = ['comfortable', 'compact', 'spacious']

/**
 * Whether a consumer's render slot produced anything to lay out.
 *
 * The values React itself renders as nothing are exactly what a slot returns
 * when it decides not to appear. Anything else counts as content, including an
 * element whose own component renders nothing: the table cannot see inside it,
 * and guessing wrong there would hide a toolbar someone deliberately filled.
 */
function hasSlotContent(node: ReactNode): boolean {
  if (node == null || typeof node === 'boolean' || node === '') return false
  if (Array.isArray(node)) return node.some(hasSlotContent)
  return true
}

export function TopToolbar<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const options = table.dataTableOptions
  const actions = options.renderTopToolbarActions?.({ table })
  const showGroupingChips =
    (options.enableGrouping ?? false) && (options.enableGroupingChips ?? false)
  const showPagination =
    (options.enablePagination ?? true) &&
    (options.paginationPosition === 'top' || options.paginationPosition === 'both')
  const internalActions = (options.enableToolbarInternalActions ?? true)
    ? internalActionSlots(table)
    : null

  // A toolbar with nothing in it is not an empty bar, it is no bar: the
  // padding and the divider on their own read as a stray sliver of chrome
  // rather than as a deliberately blank strip. Every child below decides for
  // itself whether it appears, so this has to ask the same questions they do —
  // which is why those questions live in shared predicates.
  const hasContent =
    hasSlotContent(actions) ||
    showGroupingChips ||
    selectedRowCount(table) > 0 ||
    showsFilterChips(table) ||
    showsGlobalFilterField(table) ||
    showPagination ||
    (internalActions !== null && hasInternalActions(internalActions))
  if (!hasContent) return null

  return (
    <div
      className={cx('rtc-toolbar', options.classNames?.topToolbar)}
      data-rtc-position="top"
      data-rtc-toolbar="top"
    >
      {actions}
      {showGroupingChips ? <GroupingChips table={table} /> : null}
      <SelectionSummary table={table} />
      <ActiveFilterChips table={table} />
      <span className="rtc-toolbar-spacer" />
      <GlobalFilterField table={table} />
      {showPagination ? <Pagination table={table} /> : null}
      {internalActions ? <InternalActions table={table} slots={internalActions} /> : null}
    </div>
  )
}

export function BottomToolbar<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const options = table.dataTableOptions
  const actions = options.renderBottomToolbarActions?.({ table })
  const showPagination =
    (options.enablePagination ?? true) && (options.paginationPosition ?? 'bottom') !== 'top'

  // Pagination is the bottom bar's only built-in occupant, so turning it off
  // with nothing in `renderBottomToolbarActions` left the table sitting on a
  // 17px strip of surface under a full-width border — most visible under a
  // column footer, where it read as a second, empty footer row.
  if (!hasSlotContent(actions) && !showPagination) return null

  return (
    <div
      className={cx('rtc-toolbar', options.classNames?.bottomToolbar)}
      data-rtc-position="bottom"
      data-rtc-toolbar="bottom"
    >
      {actions}
      <span className="rtc-toolbar-spacer" />
      {showPagination ? <Pagination table={table} /> : null}
    </div>
  )
}

/** How many rows the toolbar would report as selected; `0` when it says nothing. */
function selectedRowCount<TData extends RowData>(table: DataTableInstance<TData>): number {
  if (!table.dataTableOptions.enableRowSelection) return 0
  return Object.values(table.state.rowSelection).filter(Boolean).length
}

function SelectionSummary<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const options = table.dataTableOptions
  const selectedCount = selectedRowCount(table)
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

/** Whether any filter chip would be drawn. */
function showsFilterChips<TData extends RowData>(table: DataTableInstance<TData>): boolean {
  const options = table.dataTableOptions
  return (
    (options.enableColumnFilters ?? true) &&
    (options.showActiveFilterChips ?? true) &&
    table.state.columnFilters.length > 0
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
  if (!showsFilterChips(table)) return null

  const filters = table.state.columnFilters

  return (
    <span className="rtc-filter-chips" data-rtc-active-filters="">
      {filters.map((filter) => {
        const column = table.getColumn(filter.id)
        if (!column) return null
        return (
          <span key={filter.id} data-rtc-filter-chip={filter.id}>
            <ui.Badge
              onRemove={() => column.setFilterValue(undefined)}
              removeLabel={`${options.localization.clearFilter}: ${getColumnLabel(column, options.localization)}`}
            >
              {describeFilter(table, column as never)}
            </ui.Badge>
          </span>
        )
      })}
    </span>
  )
}

/**
 * Whether the search box is on screen.
 *
 * Behind a toggle it is off until the button is pressed, which is why this is
 * a question about `ui` state and not only about the options.
 */
function showsGlobalFilterField<TData extends RowData>(table: DataTableInstance<TData>): boolean {
  const options = table.dataTableOptions
  if ((options.enableGlobalFilter ?? true) === false) return false
  return (options.enableGlobalFilterToggle ?? true) === false || table.ui.showGlobalFilter
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

  const globalFilter = table.state.globalFilter
  const [draft, setDraft] = useState(globalFilter)

  useEffect(() => {
    setDraft(globalFilter)
  }, [globalFilter])

  /**
   * The instance is read through a ref rather than depended on.
   *
   * `useTable` returns a fresh object on every render, so `table` in the
   * dependency array re-ran this effect — and the cleanup cleared the pending
   * timer — on every render of the table. A table whose data is replaced faster
   * than the delay therefore never committed the search at all: each render
   * cancelled the debounce before it could fire, and the box kept a term the
   * rows never saw.
   */
  const tableRef = useRef(table)
  tableRef.current = table

  useEffect(() => {
    if (draft === globalFilter) return
    const timer = setTimeout(() => tableRef.current.setGlobalFilter(draft), 200)
    return () => clearTimeout(timer)
  }, [draft, globalFilter])

  if (!showsGlobalFilterField(table)) return null

  return (
    <div className="rtc-search">
      {options.enableGlobalFilterModes ? <SearchModeMenu table={table} /> : null}
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

/**
 * The text-oriented filter fns, which is what a single search box over mixed
 * columns can sensibly offer. Numeric and array fns are still selectable by
 * naming them in `globalFilterModeOptions`.
 */
const DEFAULT_SEARCH_MODES = [
  'includesString',
  'includesStringSensitive',
  'startsWith',
  'endsWith',
  'equalsString',
  'equalsStringSensitive',
] as const

/**
 * How the global search matches — the table-wide counterpart of a column's
 * operator menu.
 *
 * The mode lives in `ui` state rather than a TanStack slice because TanStack
 * takes `globalFilterFn` as an option; `useDataTable` reads it back out of
 * here and hands it down.
 */
function SearchModeMenu<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options
  const current = table.ui.globalFilterFn ?? options.globalFilterFn ?? 'includesString'
  const modes = options.globalFilterModeOptions ?? DEFAULT_SEARCH_MODES

  const label = (mode: string) => localization.filterOperators[mode] ?? mode

  return (
    <ui.Menu
      align="start"
      label={localization.changeSearchMode}
      items={modes.map((mode) => ({
        type: 'checkbox' as const,
        id: mode,
        label: label(mode),
        checked: current === mode,
        onSelect: () => table.setGlobalFilterFn(mode),
      }))}
      trigger={
        <ui.IconButton
          size="sm"
          className="rtc-search-mode"
          label={`${localization.changeSearchMode}: ${label(current)}`}
        >
          <span data-rtc-action="search-mode">
            <ui.Icon name="search" />
          </span>
        </ui.IconButton>
      }
    />
  )
}

/**
 * Which of the toolbar's own actions are switched on.
 *
 * Resolved by the toolbar and handed down rather than decided in
 * `InternalActions`, for two reasons: the toolbar has to know whether it is
 * about to render an empty row of chrome before it commits to rendering
 * itself, and `renderToolbarInternalActions` should be called once per render
 * rather than once to ask the question and once to use the answer.
 */
interface InternalActionSlots {
  custom: ReactNode
  search: boolean
  filters: boolean
  columns: boolean
  density: boolean
  fullScreen: boolean
  error: boolean
}

function internalActionSlots<TData extends RowData>(
  table: DataTableInstance<TData>,
): InternalActionSlots {
  const options = table.dataTableOptions
  const filterMode = options.filterDisplayMode ?? 'popover'
  // On a narrow viewport the sheet is the only filter surface worth offering,
  // so the funnel appears whatever the display mode — including plain
  // `popover`, whose header buttons sit off-screen the moment the table
  // scrolls sideways.
  const panelAvailable =
    filterMode === 'panel' || filterMode === 'popover-and-panel' || usesFilterDrawer(table)

  return {
    custom: options.renderToolbarInternalActions?.({ table }),
    search: (options.enableGlobalFilter ?? true) && (options.enableGlobalFilterToggle ?? true),
    filters: (options.enableColumnFilters ?? true) && panelAvailable,
    columns: options.enableColumnVisibility ?? true,
    density: options.enableDensityToggle ?? true,
    fullScreen: options.enableFullScreenToggle ?? true,
    error: !!options.isLoadingError,
  }
}

/** Whether any of them would draw something. */
function hasInternalActions({ custom, ...flags }: InternalActionSlots): boolean {
  return hasSlotContent(custom) || Object.values(flags).some(Boolean)
}

function InternalActions<TData extends RowData>({
  table,
  slots,
}: {
  table: DataTableInstance<TData>
  slots: InternalActionSlots
}) {
  const ui = useComponents()
  const options = table.dataTableOptions
  const { localization } = options

  return (
    <div className="rtc-toolbar-actions">
      {slots.custom}

      {slots.search ? (
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

      {slots.filters ? (
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

      {slots.columns ? <ColumnVisibilityMenu table={table} /> : null}

      {slots.density ? (
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

      {slots.fullScreen ? (
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

      {slots.error ? (
        // The icon alone announced nothing: an alert with no text content is
        // silent to a screen reader and untranslatable to everyone else.
        <span className="rtc-toolbar-alert" role="alert">
          <ui.Icon name="alert" />
          <span className="rtc-visually-hidden">
            {options.errorMessage ?? localization.errorLoadingData}
          </span>
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
  const options = table.dataTableOptions
  const { localization } = options

  const items: RtcMenuItem[] = [
    { type: 'label', id: 'label', label: localization.showHideColumns },
    ...table.getAllLeafColumns().map((column) => ({
      type: 'checkbox' as const,
      id: column.id,
      label: getColumnLabel(column, localization),
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

  // The two table-wide undos for the other things this menu's columns carry.
  // Both were reachable only by calling the instance: dragging a header or
  // pinning from the column menu had no way back short of reloading.
  if (options.enableColumnPinning && table.getIsSomeColumnsPinned()) {
    items.push({
      id: 'unpin-all',
      label: localization.unpinAll,
      icon: <ui.Icon name="pinOff" />,
      onSelect: () => table.resetColumnPinning(),
    })
  }

  if (options.enableColumnDragging ?? options.enableColumnOrdering) {
    items.push({
      id: 'reset-order',
      label: localization.resetOrder,
      icon: <ui.Icon name="reset" />,
      onSelect: () => table.resetColumnOrder(),
    })
  }

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

import { Fragment, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { RowData } from '@tanstack/react-table'

import { describeFilter } from './FilterEditor'
import { GroupingChips } from './GroupingChips'
import { Pagination } from './Pagination'
import { useComponents, type RtcMenuItem } from './registry'
import {
  TOOLBAR_REGIONS,
  resolveToolbarLayout,
  type ResolvedToolbarNode,
  type ToolbarBar,
} from './toolbarLayout'
import { formatMessage } from '../locale'
import { usesFilterDrawer } from '../responsive'
import { cx, getColumnLabel } from '../utils'
import type { DataTableDensity, DataTableInstance } from '../types'

const DENSITY_ORDER: DataTableDensity[] = ['comfortable', 'compact', 'spacious']

/** The ids whose content comes from a `render*` slot rather than a component. */
const SLOT_ITEMS: Record<
  string,
  'renderTopToolbarActions' | 'renderBottomToolbarActions' | 'renderToolbarInternalActions' | undefined
> = {
  'top-actions': 'renderTopToolbarActions',
  'bottom-actions': 'renderBottomToolbarActions',
  'internal-actions': 'renderToolbarInternalActions',
}

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
  return <Toolbar table={table} bar="top" />
}

export function BottomToolbar<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  return <Toolbar table={table} bar="bottom" />
}

/**
 * One bar, laid out from `toolbarLayout`.
 *
 * A toolbar with nothing in it is not an empty bar, it is no bar: the padding
 * and the divider on their own read as a stray sliver of chrome rather than as
 * a deliberately blank strip. So the whole bar is built as values first — a
 * region with no occupants is dropped, a row with no regions with it, and a bar
 * with no rows is not rendered at all.
 */
function Toolbar<TData extends RowData>({
  table,
  bar,
}: {
  table: DataTableInstance<TData>
  bar: ToolbarBar
}) {
  const options = table.dataTableOptions

  // Slot content is evaluated at most once per bar, and only for the slots
  // this bar turns out to hold: `renderToolbarInternalActions` and friends are
  // consumer functions, and calling one twice to ask a question and then use
  // the answer is what the resolution pass exists to avoid.
  const slots = new Map<string, ReactNode>()

  const rows = resolveToolbarLayout(options, {
    isMobile: table.isMobile,
    visible: candidateItems(table),
  })[bar]

  const built = rows
    .map((row) =>
      TOOLBAR_REGIONS.map((region) => ({
        region,
        children: buildNodes(table, row[region], slots),
      })).filter((entry) => entry.children.length > 0),
    )
    .filter((regions) => regions.length > 0)

  if (built.length === 0) return null

  return (
    <div
      className={cx(
        'rtc-toolbar',
        bar === 'top' ? options.classNames?.topToolbar : options.classNames?.bottomToolbar,
      )}
      data-rtc-position={bar}
      data-rtc-toolbar={bar}
    >
      {built.map((regions, index) => (
        <div className="rtc-toolbar-row" key={index}>
          {regions.map(({ region, children }) => (
            <div className="rtc-toolbar-region" data-rtc-region={region} key={region}>
              {children.map(({ key, node }) => (
                // A keyed fragment rather than a wrapper element: an item sits
                // in the region's flex flow as itself, with no extra box whose
                // alignment and margins the region would have to fight.
                <Fragment key={key}>{node}</Fragment>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

interface BuiltNode {
  key: string
  node: ReactNode
}

/** Resolved nodes turned into elements, with the ones that draw nothing dropped. */
function buildNodes<TData extends RowData>(
  table: DataTableInstance<TData>,
  nodes: ResolvedToolbarNode[],
  slots: Map<string, ReactNode>,
): BuiltNode[] {
  const built: BuiltNode[] = []
  nodes.forEach((node, index) => {
    if (node.kind === 'group') {
      const children = buildNodes(table, node.nodes, slots)
      if (children.length === 0) return
      built.push({
        key: `group:${node.id ?? index}`,
        node: (
          <div
            className="rtc-toolbar-group"
            data-rtc-gap={node.gap}
            data-rtc-toolbar-group={node.id}
          >
            {children.map(({ key, node: child }) => (
              <Fragment key={key}>{child}</Fragment>
            ))}
          </div>
        ),
      })
      return
    }
    const content = itemNode(table, node.id, slots)
    if (content !== null) built.push({ key: `${node.id}:${index}`, node: content })
  })
  return built
}

/**
 * Every item that could draw something, in the order an unplaced one should
 * fall back to.
 *
 * Asked before any slot is called, so the question stays cheap: a slot-backed
 * id is a candidate whenever its render function exists, and is dropped later
 * if calling it produced nothing.
 */
function candidateItems<TData extends RowData>(
  table: DataTableInstance<TData>,
): ReadonlySet<string> {
  const options = table.dataTableOptions
  const ids = new Set<string>()
  const add = (id: string, when: boolean | undefined) => {
    if (when) ids.add(id)
  }

  const internal = options.enableToolbarInternalActions ?? true
  const filterMode = options.filterDisplayMode ?? 'popover'
  // On a narrow viewport the sheet is the only filter surface worth offering,
  // so the funnel appears whatever the display mode — including plain
  // `popover`, whose header buttons sit off-screen the moment the table
  // scrolls sideways.
  const panelAvailable =
    filterMode === 'panel' || filterMode === 'popover-and-panel' || usesFilterDrawer(table)

  add('top-actions', !!options.renderTopToolbarActions)
  add('bottom-actions', !!options.renderBottomToolbarActions)
  add('internal-actions', internal && !!options.renderToolbarInternalActions)
  add('grouping-chips', (options.enableGrouping ?? false) && (options.enableGroupingChips ?? false))
  add('selection-summary', selectedRowCount(table) > 0)
  add('filter-chips', showsFilterChips(table))
  add('search', showsGlobalFilterField(table))
  add('pagination', options.enablePagination ?? true)
  add(
    'search-toggle',
    internal && (options.enableGlobalFilter ?? true) && (options.enableGlobalFilterToggle ?? true),
  )
  add('filter-toggle', internal && (options.enableColumnFilters ?? true) && panelAvailable)
  add('column-visibility', internal && (options.enableColumnVisibility ?? true))
  add('density-toggle', internal && (options.enableDensityToggle ?? true))
  // Off by default, and ignored when `transposed` is set: the option pins the
  // orientation the way `density` does, and a button that cannot change
  // anything is worse than no button.
  add(
    'transpose-toggle',
    internal && (options.enableTransposeToggle ?? false) && options.transposed === undefined,
  )
  add('fullscreen-toggle', internal && (options.enableFullScreenToggle ?? true))
  add('error', internal && !!options.isLoadingError)

  // Last, so an item with no placement of its own lands at `rest` in the order
  // it was registered in.
  for (const id of Object.keys(options.toolbarItems ?? {})) ids.add(id)

  return ids
}

/** One item's content, or `null` when it would draw nothing. */
function itemNode<TData extends RowData>(
  table: DataTableInstance<TData>,
  id: string,
  slots: Map<string, ReactNode>,
): ReactNode {
  switch (id) {
    case 'grouping-chips':
      return <GroupingChips table={table} />
    case 'selection-summary':
      return <SelectionSummary table={table} />
    case 'filter-chips':
      return <ActiveFilterChips table={table} />
    case 'search':
      return <GlobalFilterField table={table} />
    case 'pagination':
      return <Pagination table={table} />
    case 'search-toggle':
      return <SearchToggle table={table} />
    case 'filter-toggle':
      return <FilterToggle table={table} />
    case 'column-visibility':
      return <ColumnVisibilityMenu table={table} />
    case 'density-toggle':
      return <DensityToggle table={table} />
    case 'transpose-toggle':
      return <TransposeToggle table={table} />
    case 'fullscreen-toggle':
      return <FullScreenToggle table={table} />
    case 'error':
      return <ToolbarError table={table} />
    default:
      return slotNode(table, id, slots)
  }
}

/** A `render*` slot's output, or a `toolbarItems` entry's, evaluated once. */
function slotNode<TData extends RowData>(
  table: DataTableInstance<TData>,
  id: string,
  slots: Map<string, ReactNode>,
): ReactNode {
  if (!slots.has(id)) {
    const options = table.dataTableOptions
    const slot = SLOT_ITEMS[id as keyof typeof SLOT_ITEMS]
    const item = slot ? options[slot]?.({ table }) : resolveCustomItem(table, id)
    slots.set(id, hasSlotContent(item) ? item : null)
  }
  return slots.get(id) ?? null
}

function resolveCustomItem<TData extends RowData>(
  table: DataTableInstance<TData>,
  id: string,
): ReactNode {
  const item = table.dataTableOptions.toolbarItems?.[id]
  return typeof item === 'function' ? item({ table }) : item
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

function SearchToggle<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  return (
    <ui.IconButton
      label={localization.showHideSearch}
      active={table.ui.showGlobalFilter}
      onClick={() => table.setShowGlobalFilter((value) => !value)}
    >
      <span data-rtc-action="toggle-search">
        <ui.Icon name="search" />
      </span>
    </ui.IconButton>
  )
}

function FilterToggle<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  return (
    <ui.IconButton
      label={localization.showHideFilters}
      active={table.ui.showFilterPanel}
      onClick={() => table.setShowFilterPanel((value) => !value)}
    >
      <span data-rtc-action="toggle-filters">
        <ui.Icon name="filter" />
      </span>
    </ui.IconButton>
  )
}

function DensityToggle<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  return (
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
  )
}

function TransposeToggle<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  return (
    <ui.IconButton
      label={localization.toggleTranspose}
      active={table.ui.transposed}
      onClick={() => table.setTransposed((value) => !value)}
    >
      <span data-rtc-action="toggle-transpose" data-rtc-transposed={String(table.ui.transposed)}>
        <ui.Icon name="transpose" />
      </span>
    </ui.IconButton>
  )
}

function FullScreenToggle<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions

  return (
    <ui.IconButton
      label={localization.toggleFullScreen}
      active={table.ui.isFullScreen}
      onClick={() => table.setIsFullScreen((value) => !value)}
    >
      <span data-rtc-action="toggle-fullscreen">
        <ui.Icon name={table.ui.isFullScreen ? 'exitFullScreen' : 'fullScreen'} />
      </span>
    </ui.IconButton>
  )
}

function ToolbarError<TData extends RowData>({ table }: { table: DataTableInstance<TData> }) {
  const ui = useComponents()
  const options = table.dataTableOptions

  return (
    // The icon alone announced nothing: an alert with no text content is
    // silent to a screen reader and untranslatable to everyone else.
    <span className="rtc-toolbar-alert" role="alert">
      <ui.Icon name="alert" />
      <span className="rtc-visually-hidden">
        {options.errorMessage ?? options.localization.errorLoadingData}
      </span>
    </span>
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

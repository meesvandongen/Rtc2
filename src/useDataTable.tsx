import type { RowData } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTable } from '@tanstack/react-table'

import { buildDisplayColumns, resolveEnableExpanding } from './displayColumns'
import { GLOBAL_MODE_FILTER_FN, STRUCTURED_FILTER_FN } from './filters/filterFn'
import type { DataTableTableMeta } from './filters/registry'
import { dataTableFeatures } from './features'
import { mergeLocalization, type DataTableLocalization } from './locale'
import { filterDrawerApplies, useIsMobile } from './responsive'
import type {
  DataTableDensity,
  DataTableInstance,
  DataTableOptions,
  DataTableRow,
  DataTableTanStackState,
  DataTableUiState,
} from './types'
import { applyUpdater, compact, useStableArray } from './utils'

const DEFAULT_TANSTACK_STATE: DataTableTanStackState = {
  cellSelection: [],
  columnFilters: [],
  columnOrder: [],
  columnPinning: { start: [], end: [] },
  columnSizing: {},
  columnVisibility: {},
  expanded: {},
  globalFilter: '',
  grouping: [],
  pagination: { pageIndex: 0, pageSize: 10 },
  rowPinning: { top: [], bottom: [] },
  rowSelection: {},
  sorting: [],
}

const DEFAULT_UI_STATE: DataTableUiState = {
  density: 'comfortable',
  isFullScreen: false,
  showFilterPanel: false,
  showGlobalFilter: false,
  editingRowId: null,
  editingCellId: null,
  rowOrder: [],
  columnFilterOperators: {},
  globalFilterFn: null,
}

/** Maps each TanStack slice to the public callback that observes it. */
const TANSTACK_CALLBACKS = {
  cellSelection: 'onCellSelectionChange',
  columnFilters: 'onColumnFiltersChange',
  columnOrder: 'onColumnOrderChange',
  columnPinning: 'onColumnPinningChange',
  columnSizing: 'onColumnSizingChange',
  columnVisibility: 'onColumnVisibilityChange',
  expanded: 'onExpandedChange',
  globalFilter: 'onGlobalFilterChange',
  grouping: 'onGroupingChange',
  pagination: 'onPaginationChange',
  rowPinning: 'onRowPinningChange',
  rowSelection: 'onRowSelectionChange',
  sorting: 'onSortingChange',
} as const satisfies Record<keyof DataTableTanStackState, keyof DataTableOptions<any>>

type SliceKey = keyof DataTableTanStackState

const SLICE_KEYS = Object.keys(TANSTACK_CALLBACKS) as SliceKey[]

/**
 * Narrows a mixed state object down to the TanStack-owned slices.
 *
 * `initialState` and `state` accept UI keys (`density`, `showFilterPanel`, …)
 * alongside the table slices. TanStack builds one atom per key it is handed,
 * so the UI half has to be filtered out before either object reaches it.
 */
function pickSlices(value: object | undefined): Partial<DataTableTanStackState> {
  if (!value) return {}
  const result: Record<string, unknown> = {}
  for (const key of SLICE_KEYS) {
    const entry = (value as Record<string, unknown>)[key]
    if (entry !== undefined) result[key] = entry
  }
  return result as Partial<DataTableTanStackState>
}

/**
 * Builds the table instance behind `<DataTable />`.
 *
 * The component owns every state slice in React state and mirrors TanStack's
 * updater protocol, so a slice can be left uncontrolled, observed through its
 * `on*Change` callback, or fully controlled by passing it in `state` — without
 * the three modes interfering. Controlled values always win over the internal
 * mirror.
 */
export function useDataTable<TData extends RowData>(options: DataTableOptions<TData>): DataTableInstance<TData> {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const hasMounted = useRef(false)
  useEffect(() => {
    hasMounted.current = true
  }, [])

  const controlledRef = useRef(options.state)
  controlledRef.current = options.state

  // Read once, at mount: TanStack captures `initialState` when it constructs
  // the instance, and every later read of it — the auto-reset hooks, the
  // `reset*` APIs — goes through that one snapshot.
  const [initialTanStackState] = useState<DataTableTanStackState>(() => ({
    ...DEFAULT_TANSTACK_STATE,
    pagination: {
      ...DEFAULT_TANSTACK_STATE.pagination,
      pageSize: options.pageSizeOptions?.[0] ?? DEFAULT_TANSTACK_STATE.pagination.pageSize,
    },
    ...pickSlices(options.initialState),
  }))

  const [ownTanStackState, setOwnTanStackState] = useState<DataTableTanStackState>(initialTanStackState)

  const isMobile = useIsMobile(options.mobileBreakpoint)
  const drawerMode = filterDrawerApplies(options, isMobile)

  const [ownUiState, setOwnUiState] = useState<DataTableUiState>(() => {
    const state: DataTableUiState = {
      ...DEFAULT_UI_STATE,
      density: options.density ?? DEFAULT_UI_STATE.density,
      // The docked panel starts open only when it is the sole filter surface.
      showFilterPanel:
        options.initialState?.showFilterPanel ??
        (options.filterDisplayMode === 'panel' && options.enableColumnFilters !== false),
      ...compact(options.initialState as Partial<DataTableUiState>),
    }
    // …but a sheet is a layer over the content, not a pane beside it, and the
    // two do not mean the same thing. "The panel starts open" is a layout
    // choice; the same value read as "a modal covers the table on arrival" is
    // not one anybody made. In drawer mode the surface opens on a gesture and
    // nothing else. (The initializer runs once, so this is the mount value.)
    return drawerMode ? { ...state, showFilterPanel: false } : state
  })

  // The same rule when the breakpoint is crossed at runtime: a pane the reader
  // left open must not become an overlay over what they were reading.
  //
  // A render-phase adjustment rather than an effect, because the difference is
  // observable: an effect commits `open` first and closes it on the next tick,
  // and an overlay library that is handed open-then-immediately-closed inside
  // one tick can be left with its transition half-applied — a full-screen,
  // invisible, click-eating layer. Corrected here, the drawer never renders
  // open at all.
  const [wasDrawerMode, setWasDrawerMode] = useState(drawerMode)
  const correctedShowFilterPanel = useRef(false)
  if (drawerMode !== wasDrawerMode) {
    setWasDrawerMode(drawerMode)
    if (drawerMode && ownUiState.showFilterPanel) {
      setOwnUiState((prev) => ({ ...prev, showFilterPanel: false }))
      correctedShowFilterPanel.current = true
    }
  }

  const tanStackState = useMemo<DataTableTanStackState>(
    () => ({ ...ownTanStackState, ...pickSlices(options.state) }),
    [ownTanStackState, options.state],
  )

  const ui = useMemo<DataTableUiState>(
    () => ({
      ...ownUiState,
      ...compact(options.state as Partial<DataTableUiState>),
      ...(options.density ? { density: options.density } : {}),
    }),
    [ownUiState, options.state, options.density],
  )

  const uiRef = useRef(ui)
  uiRef.current = ui

  /**
   * The state handed to TanStack, with the search mode folded into the global
   * filter value when the reader is allowed to change it.
   *
   * This is what makes picking a mode re-filter immediately rather than on the
   * next keystroke: the filtered row model memoizes on the filter *state*, and
   * a mode carried only in `options.globalFilterFn` is not part of it. See
   * `GlobalFilterWithMode`.
   *
   * Only wrapped while there is something to search for. An empty query has to
   * stay the empty string, because that is what TanStack reads as "no global
   * filter" — wrapped, `''` becomes a truthy value and every row goes through
   * the mode's comparator, so under `equalsString` clearing the box would empty
   * the table. The visible consequence is only that switching modes over an
   * empty box does nothing, which is correct: there is nothing to match yet.
   */
  const globalFilterMode = ui.globalFilterFn ?? options.globalFilterFn ?? 'includesString'
  const tanStackStateForTable = useMemo<DataTableTanStackState>(() => {
    if (!options.enableGlobalFilterModes || !tanStackState.globalFilter) return tanStackState
    return {
      ...tanStackState,
      globalFilter: { query: tanStackState.globalFilter, mode: globalFilterMode } as never,
    }
  }, [tanStackState, options.enableGlobalFilterModes, globalFilterMode])

  // TanStack slice handlers. Stable identities: the latest options and
  // controlled values are read through refs rather than closed over.
  const sliceHandlers = useMemo(() => {
    const make = (key: SliceKey) => (updater: unknown) => {
      let resolved: unknown
      setOwnTanStackState((prev) => {
        const controlled = (controlledRef.current as Record<string, unknown> | undefined)?.[key]
        const current = controlled !== undefined ? controlled : prev[key]
        resolved = applyUpdater(updater as never, current as never)
        return Object.is(resolved, prev[key]) ? prev : { ...prev, [key]: resolved }
      })
      const callback = (optionsRef.current as unknown as Record<string, unknown>)[TANSTACK_CALLBACKS[key]]
      if (typeof callback === 'function') (callback as (value: unknown) => void)(resolved)
    }
    return Object.fromEntries(SLICE_KEYS.map((key) => [TANSTACK_CALLBACKS[key], make(key)])) as Record<
      string,
      (updater: unknown) => void
    >
  }, [])

  const setUi = useCallback(
    <K extends keyof DataTableUiState>(
      key: K,
      updater: DataTableUiState[K] | ((old: DataTableUiState[K]) => DataTableUiState[K]),
      callbackName?: keyof DataTableOptions<TData>,
    ) => {
      const next = applyUpdater(updater, uiRef.current[key])
      setOwnUiState((prev) => (Object.is(prev[key], next) ? prev : { ...prev, [key]: next }))
      if (callbackName) {
        const callback = (optionsRef.current as unknown as Record<string, unknown>)[callbackName]
        if (typeof callback === 'function') (callback as (value: unknown) => void)(next)
      }
    },
    [],
  )

  const localization = useMemo<DataTableLocalization>(
    () => mergeLocalization(options.localization),
    [options.localization],
  )

  // Per-column floors measured from the headers. Derived from layout rather
  // than chosen, so it is kept out of the public UI state.
  const [headerMinSizes, setHeaderMinSizes] = useState<Record<string, number>>({})

  // Pending edits for `cell` / `row` / `modal` edit modes, keyed row → column.
  const [editValues, setEditValues] = useState<Record<string, Record<string, unknown>>>({})

  const setEditValue = useCallback((rowId: string, columnId: string, value: unknown) => {
    setEditValues((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [columnId]: value } }))
  }, [])

  const clearEditValues = useCallback((rowId?: string) => {
    setEditValues((prev) => {
      if (!rowId) return {}
      if (!(rowId in prev)) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }, [])

  // `tableRef` breaks the cycle between display columns (which need the
  // instance to render) and the instance (which needs the columns).
  const tableRef = useRef<DataTableInstance<TData> | null>(null)
  const getTable = useCallback(() => tableRef.current as DataTableInstance<TData>, [])

  // Guard against callers passing a freshly-built array on every render.
  const stableUserColumns = useStableArray(options.columns) as typeof options.columns
  const stableData = useStableArray(options.data) as typeof options.data

  // Only whether anything is grouped changes the display columns; which
  // columns are grouped is read at render time by the expand column.
  const hasGrouping = tanStackState.grouping.length > 0
  const groupingRef = useRef(tanStackState.grouping)
  groupingRef.current = tanStackState.grouping

  const columns = useMemo(() => {
    const { leading, trailing } = buildDisplayColumns({
      options: optionsRef.current,
      grouping: groupingRef.current,
      getTable,
    })
    // Every column routes through the one structured filter fn, which reads
    // the operator out of the filter value. A column that sets its own
    // `filterFn` explicitly keeps it, as an escape hatch to raw TanStack.
    const userColumns = stableUserColumns.map((column) =>
      column.filterFn ? column : ({ ...column, filterFn: STRUCTURED_FILTER_FN } as typeof column),
    )
    return [...leading, ...userColumns, ...trailing]
  }, [
    stableUserColumns,
    getTable,
    // Display-column composition depends only on these flags.
    options.enableRowSelection,
    options.enableMultiRowSelection,
    options.enableSelectAll,
    options.selectDisplayMode,
    options.enableExpanding,
    options.enableExpandAll,
    options.renderDetailPanel,
    options.enableGrouping,
    options.groupedColumnMode,
    hasGrouping,
    options.enableRowNumbers,
    options.rowNumberDisplayMode,
    options.enableRowActions,
    options.renderRowActions,
    options.rowActionMenuItems,
    options.enableEditing,
    options.editMode,
    options.enableRowOrdering,
    options.positionActionsColumn,
  ])

  const hasDetailPanel = !!options.renderDetailPanel

  const tableMeta = useMemo<DataTableTableMeta>(
    () => ({ rtcFilterConfig: { dataTypes: options.dataTypes, filterNow: options.filterNow } }),
    [options.dataTypes, options.filterNow],
  )

  const table = useTable<typeof dataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data: stableData,
    state: tanStackStateForTable,
    // TanStack's auto-reset hooks restore `table.initialState` rather than the
    // feature default — and one of them, `autoResetExpanded`, fires the first
    // time the grouped row model computes, which is during the mount render.
    // Without this the initial `expanded` is wiped before anything paints and
    // `initialState={{ expanded: true }}` renders a collapsed table.
    initialState: initialTanStackState,
    ...(options.getRowId ? { getRowId: options.getRowId as never } : {}),
    ...(options.getSubRows ? { getSubRows: options.getSubRows as never } : {}),
    ...(options.defaultColumn ? { defaultColumn: options.defaultColumn as never } : {}),
    ...sliceHandlers,

    enableSorting: options.enableSorting ?? true,
    enableMultiSort: options.enableMultiSort ?? true,
    enableSortingRemoval: options.enableSortingRemoval ?? true,
    sortDescFirst: options.sortDescFirst ?? false,
    ...(options.maxMultiSortColCount !== undefined
      ? { maxMultiSortColCount: options.maxMultiSortColCount }
      : {}),
    manualSorting: options.manualSorting ?? false,

    // The structured filter fn receives `row.table`, which is the internal
    // instance — not the shallow copy `useTable` returns — so its
    // configuration travels on the options rather than being assigned to the
    // instance alongside `dataTableOptions`.
    meta: tableMeta,

    enableFilters: options.enableFilters ?? true,
    enableColumnFilters: options.enableColumnFilters ?? true,
    manualFiltering: options.manualFiltering ?? false,
    enableGlobalFilter: options.enableGlobalFilter ?? true,
    // With modes on, one registered fn dispatches on the mode carried in the
    // filter value; without them, the option names the fn directly.
    globalFilterFn: (options.enableGlobalFilterModes
      ? GLOBAL_MODE_FILTER_FN
      : globalFilterMode) as never,

    enableGrouping: options.enableGrouping ?? false,
    groupedColumnMode: options.groupedColumnMode ?? 'reorder',
    manualGrouping: options.manualGrouping ?? false,
    manualAggregation: !(options.enableAggregation ?? true),

    enableExpanding: resolveEnableExpanding(options),
    manualExpanding: options.manualExpanding ?? false,
    paginateExpandedRows: options.paginateExpandedRows ?? true,
    ...(hasDetailPanel && !options.getRowCanExpand
      ? { getRowCanExpand: () => true }
      : options.getRowCanExpand
        ? { getRowCanExpand: options.getRowCanExpand as never }
        : {}),

    manualPagination: options.manualPagination ?? false,
    ...(options.rowCount !== undefined ? { rowCount: options.rowCount } : {}),
    ...(options.pageCount !== undefined ? { pageCount: options.pageCount } : {}),
    // TanStack resets the page index whenever the core/filtered/sorted models
    // recompute — including their first computation, which would discard
    // `initialState.pagination.pageIndex`. Hold the reset off until after the
    // first commit so a restored page survives mount.
    autoResetPageIndex:
      options.autoResetPageIndex ?? (!options.manualPagination && hasMounted.current),

    enableRowSelection: (options.enableRowSelection ?? false) as never,
    enableMultiRowSelection: (options.enableMultiRowSelection ?? true) &&
      options.selectDisplayMode !== 'radio',
    enableSubRowSelection: options.enableSubRowSelection ?? true,

    enableCellSelection: options.enableCellSelection ?? false,
    enableCellRangeSelection: options.enableCellRangeSelection ?? false,
    enableMultiCellRangeSelection: options.enableMultiCellRangeSelection ?? false,

    enableHiding: options.enableHiding ?? options.enableColumnVisibility ?? true,
    enableColumnPinning: options.enableColumnPinning ?? false,
    enableRowPinning: options.enableRowPinning ?? false,
    enableColumnResizing: options.enableColumnResizing ?? false,
    columnResizeMode: options.columnResizeMode ?? 'onChange',
    columnResizeDirection: options.columnResizeDirection ?? options.direction ?? 'ltr',
  })

  const instance = table as unknown as DataTableInstance<TData>
  tableRef.current = instance

  instance.dataTableOptions = { ...options, localization }
  instance.ui = ui
  instance.isMobile = isMobile
  // Assigned every render, not from an effect: `useTable` hands back a fresh
  // shallow copy each time, so anything written to the previous one is gone.
  instance.headerMinSizes = headerMinSizes
  instance.setHeaderMinSizes = setHeaderMinSizes
  instance.editValues = editValues
  instance.setEditValue = setEditValue
  instance.clearEditValues = clearEditValues

  instance.setDensity = useCallback(
    (density: DataTableDensity) => setUi('density', density, 'onDensityChange'),
    [setUi],
  )
  instance.setIsFullScreen = useCallback(
    (value: boolean | ((old: boolean) => boolean)) =>
      setUi('isFullScreen', value, 'onIsFullScreenChange'),
    [setUi],
  )
  instance.setShowFilterPanel = useCallback(
    (value: boolean | ((old: boolean) => boolean)) =>
      setUi('showFilterPanel', value, 'onShowFilterPanelChange'),
    [setUi],
  )
  instance.setShowGlobalFilter = useCallback(
    (value: boolean | ((old: boolean) => boolean)) =>
      setUi('showGlobalFilter', value, 'onShowGlobalFilterChange'),
    [setUi],
  )
  instance.setEditingRowId = useCallback(
    (rowId: string | null) => setUi('editingRowId', rowId),
    [setUi],
  )
  instance.setEditingCellId = useCallback(
    (cellId: string | null) => setUi('editingCellId', cellId),
    [setUi],
  )
  instance.setRowOrder = useCallback(
    (order: string[] | ((old: string[]) => string[])) => setUi('rowOrder', order, 'onRowOrderChange'),
    [setUi],
  )
  instance.setColumnFilterOperator = useCallback(
    (columnId: string, operatorId: string) =>
      setUi(
        'columnFilterOperators',
        (old) => ({ ...old, [columnId]: operatorId }),
        'onColumnFilterOperatorsChange',
      ),
    [setUi],
  )
  instance.setGlobalFilterFn = useCallback(
    (filterFn: string | null) => setUi('globalFilterFn', filterFn, 'onGlobalFilterFnChange'),
    [setUi],
  )

  /**
   * Final render order: TanStack's paginated model, re-sequenced by the
   * user's manual row order, with pinned rows lifted out when they are
   * rendered in dedicated top/bottom sections.
   */
  instance.getRenderRows = useCallback(() => {
    const current = tableRef.current
    if (!current) return []
    const opts = optionsRef.current

    // `getRowModel()` is the fully-processed model, which includes pagination
    // whenever the pagination feature is registered — and it always is here.
    // Rendering every row therefore has to read the pre-paginated model.
    let rows: Array<DataTableRow<TData>> =
      opts.enablePagination === false || opts.manualPagination
        ? (current.getPrePaginatedRowModel().rows as Array<DataTableRow<TData>>)
        : (current.getPaginatedRowModel().rows as Array<DataTableRow<TData>>)

    const order = uiRef.current.rowOrder
    if (opts.enableRowOrdering && order.length > 0) {
      const rank = new Map(order.map((id, index) => [id, index]))
      rows = rows
        .slice()
        .sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    }

    if (opts.enableRowPinning && (opts.rowPinningDisplayMode ?? 'sticky') !== 'sticky') {
      rows = rows.filter((row) => !row.getIsPinned())
    }

    return rows
  }, [])

  // Aggregate state observer. Mirrors v8's `onStateChange`, which v9 dropped.
  const onStateChange = options.onStateChange
  useEffect(() => {
    onStateChange?.({ ...tanStackState, ...ui })
  }, [onStateChange, tanStackState, ui])

  // Report the drawer-mode correction once the render that made it has
  // committed. Notifying from the render itself would be a side effect at the
  // wrong moment, and leaving it unreported would tell an observer the panel
  // is open while the sheet is shut.
  useEffect(() => {
    if (!correctedShowFilterPanel.current) return
    correctedShowFilterPanel.current = false
    optionsRef.current.onShowFilterPanelChange?.(false)
  })

  // Seed the manual row order the first time rows become available.
  const rowOrderInitialized = useRef(false)
  useEffect(() => {
    if (!options.enableRowOrdering || rowOrderInitialized.current) return
    const ids = table.getCoreRowModel().rows.map((row) => row.id)
    if (ids.length === 0) return
    rowOrderInitialized.current = true
    if (uiRef.current.rowOrder.length === 0) instance.setRowOrder(ids)
  }, [options.enableRowOrdering, options.data, table, instance])

  // Escape leaves full-screen, matching the platform convention.
  useEffect(() => {
    if (!ui.isFullScreen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') instance.setIsFullScreen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [ui.isFullScreen, instance])

  return instance
}

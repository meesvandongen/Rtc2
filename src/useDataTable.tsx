import type { RowData } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTable } from '@tanstack/react-table'

import { buildDisplayColumns } from './displayColumns'
import { dataTableFeatures } from './features'
import { defaultLocalization, type DataTableLocalization } from './locale'
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
  columnFilterFns: {},
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

  const [ownTanStackState, setOwnTanStackState] = useState<DataTableTanStackState>(() => ({
    ...DEFAULT_TANSTACK_STATE,
    pagination: {
      ...DEFAULT_TANSTACK_STATE.pagination,
      pageSize: options.pageSizeOptions?.[0] ?? DEFAULT_TANSTACK_STATE.pagination.pageSize,
    },
    ...compact(options.initialState as Partial<DataTableTanStackState>),
  }))

  const [ownUiState, setOwnUiState] = useState<DataTableUiState>(() => ({
    ...DEFAULT_UI_STATE,
    density: options.density ?? DEFAULT_UI_STATE.density,
    // The docked panel starts open only when it is the sole filter surface.
    showFilterPanel:
      options.initialState?.showFilterPanel ??
      (options.filterDisplayMode === 'panel' && options.enableColumnFilters !== false),
    ...compact(options.initialState as Partial<DataTableUiState>),
  }))

  const tanStackState = useMemo<DataTableTanStackState>(
    () => ({ ...ownTanStackState, ...compact(options.state as Partial<DataTableTanStackState>) }),
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
    () => ({
      ...defaultLocalization,
      ...options.localization,
      filterOperators: {
        ...defaultLocalization.filterOperators,
        ...options.localization?.filterOperators,
      },
    }),
    [options.localization],
  )

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

  const columns = useMemo(() => {
    const { leading, trailing } = buildDisplayColumns({ options: optionsRef.current, getTable })
    // Column-level filter fn overrides chosen from the operator menu are
    // applied here because `filterFn` lives on the column def, not on state.
    const userColumns = stableUserColumns.map((column) => {
      const id = (column as { id?: string; accessorKey?: string }).id ??
        (column as { accessorKey?: string }).accessorKey
      const override = id ? ui.columnFilterFns[id] : undefined
      return override ? ({ ...column, filterFn: override } as typeof column) : column
    })
    return [...leading, ...userColumns, ...trailing]
  }, [
    stableUserColumns,
    ui.columnFilterFns,
    getTable,
    // Display-column composition depends only on these flags.
    options.enableRowSelection,
    options.enableMultiRowSelection,
    options.enableSelectAll,
    options.selectDisplayMode,
    options.enableExpanding,
    options.enableExpandAll,
    options.renderDetailPanel,
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

  const table = useTable<typeof dataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data: stableData,
    state: tanStackState,
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

    enableFilters: options.enableFilters ?? true,
    enableColumnFilters: options.enableColumnFilters ?? true,
    manualFiltering: options.manualFiltering ?? false,
    enableGlobalFilter: options.enableGlobalFilter ?? true,
    globalFilterFn: (options.globalFilterFn ?? 'includesString') as never,

    enableGrouping: options.enableGrouping ?? false,
    groupedColumnMode: options.groupedColumnMode ?? 'reorder',
    manualGrouping: options.manualGrouping ?? false,
    manualAggregation: !(options.enableAggregation ?? true),

    enableExpanding: options.enableExpanding ?? hasDetailPanel,
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
  instance.setColumnFilterFn = useCallback(
    (columnId: string, fn: string) =>
      setUi(
        'columnFilterFns',
        (old) => ({ ...old, [columnId]: fn }),
        'onColumnFilterFnsChange',
      ),
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

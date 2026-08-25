import type { RowData } from '@tanstack/react-table'
import type { CSSProperties, ReactNode } from 'react'
import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  GroupingState,
  Header,
  PaginationState,
  Row,
  RowPinningState,
  RowSelectionState,
  SortingState,
  CellSelectionState,
  ColumnVisibilityState,
} from '@tanstack/react-table'

import type { DataTableComponentsOverride, RtcMenuItem } from './components/registry'
import type { ColumnDataType, ColumnDataTypes, FilterTypeMeta } from './filters/types'
import type { DataTableFeatures } from './features'
import type { DataTableLocalization } from './locale'

export type { DataTableFeatures } from './features'

/** Row density presets. Each maps to a `--rtc-row-height-*` CSS variable. */
export type DataTableDensity = 'compact' | 'comfortable' | 'spacious'

/**
 * Table layout strategy.
 * - `semantic` — native `table-layout: auto`; column sizes are hints.
 * - `grid` — CSS grid rows; column sizes are authoritative, columns still grow.
 * - `grid-no-grow` — as `grid`, but columns never stretch to fill the container.
 */
export type DataTableLayoutMode = 'semantic' | 'grid' | 'grid-no-grow'

/** Which editing affordance is presented, mirroring Material React Table's modes. */
export type DataTableEditMode = 'cell' | 'row' | 'table' | 'modal'

/** Built-in filter editors selectable per column via `meta.filterVariant`. */
export type DataTableFilterVariant =
  | 'text'
  | 'autocomplete'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'range'
  | 'range-slider'
  | 'date'
  | 'date-range'

/** Built-in cell editors selectable per column via `meta.editVariant`. */
export type DataTableEditVariant = 'text' | 'number' | 'select' | 'checkbox' | 'date'

export interface DataTableSelectOption {
  label: string
  value: string
}

/**
 * Per-column configuration that has no home on TanStack's own column def.
 *
 * Registered as the v9 `columnMeta` type-only slot, so `columnDef.meta` is
 * typed as this interface everywhere in the component.
 */
export interface DataTableColumnMeta {
  /**
   * A human-readable name for the column, used by the column-visibility menu,
   * the grouping chips, the filter panel and every `aria-label` that names a
   * column. Only needed when `header` is a render function or an element,
   * since a plain-string header is already the name.
   */
  label?: string
  /**
   * The column's filter data type: a registered id, or an inline definition
   * for a one-off column. Determines which operators are offered and how the
   * operand is edited. Inferred from the data when omitted.
   */
  dataType?: string | ColumnDataType
  /** Restrict the operators offered, by id, in menu order. */
  filterOperators?: string[]
  /** Type-specific configuration: date granularity, timezone, units. */
  filterTypeMeta?: FilterTypeMeta
  /** @deprecated Superseded by `dataType`; still mapped for compatibility. */
  filterVariant?: DataTableFilterVariant
  /** Options for `select` / `multi-select` / `autocomplete` filters. Falls back to faceted unique values. */
  filterSelectOptions?: Array<DataTableSelectOption | string>
  /** Placeholder for the column's filter input. */
  filterPlaceholder?: string
  /** Hide the filter-operator (filter mode) menu for this column. */
  enableFilterModes?: boolean
  /** Allow stacking several conditions on this column, overriding the table option. */
  enableMultipleFilterConditions?: boolean
  /** Filter fn names offered in this column's operator menu. */
  filterModeOptions?: Array<keyof typeof import('./features').dataTableFilterFns>
  /** Which editor to render when the cell is in edit mode. */
  editVariant?: DataTableEditVariant
  /** Options for a `select` editor. */
  editSelectOptions?: Array<DataTableSelectOption | string>
  /** Horizontal alignment for header, body and footer cells of this column. */
  align?: 'left' | 'center' | 'right'
  /** Extra class applied to every cell in the column. */
  className?: string
  /** Short help text rendered in the column actions menu. */
  description?: string
  /**
   * Make this column's cells copy their value when clicked.
   *
   * Overrides the table-level `enableClickToCopy`, so one identifier column
   * can opt in without turning the whole table into buttons.
   */
  enableClickToCopy?: boolean
}

export type DataTableColumn<TData extends RowData, TValue = unknown> = ColumnDef<DataTableFeatures, TData, TValue>
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>
export type DataTableCell<TData extends RowData, TValue = unknown> = Cell<DataTableFeatures, TData, TValue>
export type DataTableColumnInstance<TData extends RowData, TValue = unknown> = Column<
  DataTableFeatures,
  TData,
  TValue
>
export type DataTableHeader<TData extends RowData, TValue = unknown> = Header<DataTableFeatures, TData, TValue>

/**
 * State slices the component can own or accept as controlled input. Mirrors
 * TanStack's own state shape plus the presentation-only slices the component
 * adds (density, full screen, editing targets, row order, detail panels).
 */
export interface DataTableUiState {
  density: DataTableDensity
  isFullScreen: boolean
  /** Whether the docked filter panel is open. */
  showFilterPanel: boolean
  showGlobalFilter: boolean
  /** Row id currently in row/modal edit mode, or `null`. */
  editingRowId: string | null
  /** `rowId:columnId` of the cell in cell-edit mode, or `null`. */
  editingCellId: string | null
  /** Row ids, in display order, when `enableRowOrdering` is on. */
  rowOrder: string[]
  /**
   * Operator chosen per column *before* a value has been entered.
   *
   * Once a filter has a value the operator lives inside it; this is only the
   * draft the editor shows while the column is still unfiltered.
   */
  columnFilterOperators: Record<string, string>
  /**
   * Filter fn the global search is using, when `enableGlobalFilterModes` lets
   * the reader choose one. `null` means "whatever `globalFilterFn` says".
   *
   * UI state rather than a TanStack slice: TanStack takes the global filter fn
   * as an *option*, not as state, so the chosen mode has to be owned here and
   * handed back down through `setOptions`.
   */
  globalFilterFn: string | null
}

export interface DataTableTanStackState {
  cellSelection: CellSelectionState
  columnFilters: ColumnFiltersState
  columnOrder: ColumnOrderState
  columnPinning: ColumnPinningState
  columnSizing: ColumnSizingState
  columnVisibility: ColumnVisibilityState
  expanded: ExpandedState
  globalFilter: string
  grouping: GroupingState
  pagination: PaginationState
  rowPinning: RowPinningState
  rowSelection: RowSelectionState
  sorting: SortingState
}

export type DataTableInitialState = Partial<DataTableTanStackState> & Partial<DataTableUiState>

/** Arguments handed to the `render*` slot props and event callbacks. */
export interface DataTableRenderContext<TData extends RowData> {
  table: DataTableInstance<TData>
}

export interface DataTableRowRenderContext<TData extends RowData> extends DataTableRenderContext<TData> {
  row: DataTableRow<TData>
}

export interface DataTableCellRenderContext<TData extends RowData> extends DataTableRowRenderContext<TData> {
  cell: DataTableCell<TData>
  column: DataTableColumnInstance<TData>
}

export interface DataTableEditSubmitContext<TData extends RowData> extends DataTableRowRenderContext<TData> {
  /** The row's original object merged with every pending edit for that row. */
  values: TData
  /** Only the changed columns, keyed by column id. */
  changes: Record<string, unknown>
  exitEditingMode: () => void
}

export interface DataTableCellEditContext<TData extends RowData> extends DataTableCellRenderContext<TData> {
  value: unknown
}

/** Props spread onto a DOM node by a `*Props` slot. */
export type SlotProps<T> = T | ((ctx: any) => T)

export interface DataTableClassNames {
  root?: string
  container?: string
  table?: string
  head?: string
  headRow?: string
  headCell?: string
  body?: string
  bodyRow?: string
  bodyCell?: string
  foot?: string
  footRow?: string
  footCell?: string
  topToolbar?: string
  bottomToolbar?: string
}

/**
 * The full option surface of `<DataTable />` / `useDataTable()`.
 *
 * Every behaviour is opt-in through an `enable*` flag, every string is
 * overridable through `localization`, and every visual slot has a `render*`
 * escape hatch.
 */
export interface DataTableOptions<TData extends RowData> {
  // ---------------------------------------------------------------- data ----
  columns: Array<DataTableColumn<TData, any>>
  data: TData[]
  /** Stable row identity. Strongly recommended when rows can reorder or persist selection. */
  getRowId?: (originalRow: TData, index: number, parent?: DataTableRow<TData>) => string
  /** Sub-rows for tree data / expanding. */
  getSubRows?: (originalRow: TData, index: number) => TData[] | undefined
  /** Default column def merged into every column. */
  defaultColumn?: Partial<DataTableColumn<TData, any>>

  // --------------------------------------------------------------- state ----
  initialState?: DataTableInitialState
  /** Controlled state. Any slice provided here must be kept in sync via its `on*Change`. */
  state?: Partial<DataTableTanStackState & DataTableUiState>
  onStateChange?: (state: DataTableTanStackState & DataTableUiState) => void
  onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void
  onColumnFiltersChange?: (
    updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState),
  ) => void
  onGlobalFilterChange?: (updater: string | ((old: string) => string)) => void
  onPaginationChange?: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void
  onRowSelectionChange?: (
    updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState),
  ) => void
  onColumnVisibilityChange?: (
    updater: ColumnVisibilityState | ((old: ColumnVisibilityState) => ColumnVisibilityState),
  ) => void
  onColumnOrderChange?: (updater: ColumnOrderState | ((old: ColumnOrderState) => ColumnOrderState)) => void
  onColumnPinningChange?: (
    updater: ColumnPinningState | ((old: ColumnPinningState) => ColumnPinningState),
  ) => void
  onColumnSizingChange?: (
    updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState),
  ) => void
  onGroupingChange?: (updater: GroupingState | ((old: GroupingState) => GroupingState)) => void
  onExpandedChange?: (updater: ExpandedState | ((old: ExpandedState) => ExpandedState)) => void
  onRowPinningChange?: (updater: RowPinningState | ((old: RowPinningState) => RowPinningState)) => void
  onCellSelectionChange?: (
    updater: CellSelectionState | ((old: CellSelectionState) => CellSelectionState),
  ) => void
  onDensityChange?: (density: DataTableDensity) => void
  onIsFullScreenChange?: (isFullScreen: boolean) => void
  onShowFilterPanelChange?: (show: boolean) => void
  onShowGlobalFilterChange?: (show: boolean) => void
  onRowOrderChange?: (rowOrder: string[]) => void
  onColumnFilterOperatorsChange?: (operators: Record<string, string>) => void
  onGlobalFilterFnChange?: (filterFn: string | null) => void

  // ------------------------------------------------------------ behaviour ----
  enableSorting?: boolean
  enableMultiSort?: boolean
  enableSortingRemoval?: boolean
  sortDescFirst?: boolean
  maxMultiSortColCount?: number

  enableColumnFilters?: boolean
  enableFilters?: boolean
  /** Show the per-column operator (filter mode) menu. */
  enableFilterModes?: boolean
  /**
   * Where column filters are edited.
   *
   * There is deliberately no in-table filter row: tall editors (date ranges,
   * checkbox groups, sliders) force every row to their height.
   * - `popover` — a funnel button per header column.
   * - `panel` — a vertical scrollable pane docked beside the table.
   * - `popover-and-panel` — both.
   * - `none` — no built-in UI; drive filters yourself, or render
   *   `<DataTableFilterPanel table={table} />` wherever you like.
   */
  filterDisplayMode?: 'popover' | 'panel' | 'popover-and-panel' | 'none'
  /** Which side the docked filter panel appears on. */
  filterPanelPosition?: 'start' | 'end'
  /**
   * On a narrow viewport, edit filters in a modal sheet instead.
   *
   * Defaults to on. Below `mobileBreakpoint` the header funnel opens the
   * column's editor in a `Drawer`, the docked panel is replaced by a
   * full-height sheet, and the toolbar always offers the funnel that opens it
   * — a popover anchored to a 24px button and a 280px pane docked beside the
   * rows are both unusable on a phone. Has no effect when
   * `filterDisplayMode: 'none'`.
   */
  enableMobileFilterDrawer?: boolean
  /**
   * Viewport width below which the table treats itself as mobile. A number is
   * pixels; a string is any CSS length (`'40em'`). Defaults to `640`.
   */
  mobileBreakpoint?: number | string
  /** Removable chips in the toolbar for each active column filter. Defaults to on. */
  showActiveFilterChips?: boolean
  /**
   * Extra filter data types, merged over the built-ins. Register a type here
   * to use it by id from `meta.dataType` across every column.
   */
  dataTypes?: ColumnDataTypes
  /**
   * Allow several conditions on one column (`age > 20 AND age < 30`).
   * Off by default: one condition is what most tables need.
   */
  enableMultipleFilterConditions?: boolean
  /**
   * Fixes the clock used by relative date operators. Supply it to make
   * "in the last 7 days" deterministic in tests and snapshots.
   */
  filterNow?: Date
  enableGlobalFilter?: boolean
  /** The filter fn the global search starts with. */
  globalFilterFn?: keyof typeof import('./features').dataTableFilterFns
  /**
   * Let the reader change how the global search matches, from a menu on the
   * search field — the table-wide counterpart of `enableFilterModes`.
   */
  enableGlobalFilterModes?: boolean
  /** Which fns that menu offers. Defaults to the text-oriented ones. */
  globalFilterModeOptions?: Array<keyof typeof import('./features').dataTableFilterFns>
  enableFaceting?: boolean

  enablePagination?: boolean
  paginationDisplayMode?: 'default' | 'pages' | 'simple'
  /** Position of the pagination control. */
  paginationPosition?: 'top' | 'bottom' | 'both'
  pageSizeOptions?: number[]
  /** Server-side pagination: the component stops slicing rows itself. */
  manualPagination?: boolean
  rowCount?: number
  pageCount?: number
  /**
   * Return to the first page when the data, filters or sorting change.
   * Defaults to `true` for client-side pagination, but never on the initial
   * render, so `initialState.pagination.pageIndex` is honoured.
   */
  autoResetPageIndex?: boolean

  manualSorting?: boolean
  manualFiltering?: boolean
  manualGrouping?: boolean
  manualExpanding?: boolean

  enableRowSelection?: boolean | ((row: DataTableRow<TData>) => boolean)
  enableMultiRowSelection?: boolean
  enableSubRowSelection?: boolean
  enableSelectAll?: boolean
  /** Render a radio group instead of checkboxes (implies single selection). */
  selectDisplayMode?: 'checkbox' | 'radio' | 'switch'
  /** Clicking anywhere in a row toggles its selection. */
  enableClickToSelect?: boolean

  enableCellSelection?: boolean
  enableCellRangeSelection?: boolean
  enableMultiCellRangeSelection?: boolean

  /**
   * Clicking a cell copies its value to the clipboard.
   *
   * Off by default, and usually better set per column via
   * `meta.enableClickToCopy`: it turns every cell into a button, which is
   * right for an id or an email and wrong for a paragraph of prose. Grouped,
   * aggregated and placeholder cells never get the affordance — there is no
   * single value under them to copy.
   *
   * Composes with the rest: the copy button stops the click from reaching the
   * row, so `enableClickToSelect` does not fire, while cell selection
   * (pointer-down) and `editMode: 'cell'` (double-click) are untouched.
   */
  enableClickToCopy?: boolean

  enableColumnVisibility?: boolean
  enableHiding?: boolean
  enableColumnOrdering?: boolean
  enableColumnDragging?: boolean
  enableColumnPinning?: boolean
  enableRowPinning?: boolean
  rowPinningDisplayMode?: 'sticky' | 'top' | 'bottom' | 'top-and-bottom'
  enableColumnResizing?: boolean
  columnResizeMode?: 'onChange' | 'onEnd'
  columnResizeDirection?: 'ltr' | 'rtl'

  enableGrouping?: boolean
  /** Show the drag-to-group chip area in the top toolbar. */
  enableGroupingChips?: boolean
  /**
   * Where a grouped column goes. `reorder` (the default) moves it to the front
   * of the table, `remove` drops it and shows the group value next to the
   * expand chevron instead, `false` leaves the column order alone.
   */
  groupedColumnMode?: 'reorder' | 'remove' | false
  enableAggregation?: boolean

  /** Defaults to on when grouping or a detail panel is in play. */
  enableExpanding?: boolean
  enableExpandAll?: boolean
  getRowCanExpand?: (row: DataTableRow<TData>) => boolean
  paginateExpandedRows?: boolean
  /** Custom content revealed when a row expands. Enables the detail-panel column. */
  renderDetailPanel?: (ctx: DataTableRowRenderContext<TData>) => ReactNode

  enableRowNumbers?: boolean
  /** `static` numbers rows by position on the page; `original` uses the source index. */
  rowNumberDisplayMode?: 'static' | 'original'
  enableRowActions?: boolean
  renderRowActions?: (ctx: DataTableRowRenderContext<TData>) => ReactNode
  /** Where the built-in display columns are placed. */
  displayColumnPosition?: 'start' | 'end'
  positionActionsColumn?: 'first' | 'last'

  enableRowOrdering?: boolean

  enableEditing?: boolean | ((row: DataTableRow<TData>) => boolean)
  editMode?: DataTableEditMode
  onEditingRowSave?: (ctx: DataTableEditSubmitContext<TData>) => void | Promise<void>
  onEditingRowCancel?: (ctx: DataTableRowRenderContext<TData>) => void
  onCellEditComplete?: (ctx: DataTableCellEditContext<TData>) => void
  /** Called for `table` edit mode on every committed cell change. */
  onDataChange?: (nextData: TData[]) => void

  enableColumnActions?: boolean
  enableToolbar?: boolean
  enableTopToolbar?: boolean
  enableBottomToolbar?: boolean
  enableToolbarInternalActions?: boolean
  enableDensityToggle?: boolean
  enableFullScreenToggle?: boolean
  enableGlobalFilterToggle?: boolean
  enableColumnFilterToggle?: boolean

  enableStickyHeader?: boolean
  enableStickyFooter?: boolean
  enableTableHead?: boolean
  enableTableFooter?: boolean
  /** Zebra striping. */
  enableStripes?: boolean
  enableRowHover?: boolean
  /** Draw cell borders. */
  enableBorders?: boolean | 'horizontal' | 'vertical' | 'all' | 'none'

  enableRowVirtualization?: boolean
  enableColumnVirtualization?: boolean
  rowVirtualizerOptions?: { overscan?: number; estimateSize?: (index: number) => number }
  columnVirtualizerOptions?: { overscan?: number }

  enableKeyboardNavigation?: boolean

  // ----------------------------------------------------------- appearance ----
  layoutMode?: DataTableLayoutMode
  /**
   * Never render a column narrower than its own header. On by default.
   *
   * A header carries a label plus up to three controls; a narrow declared
   * `size` truncates the label to nothing. The table widens the column to fit
   * and scrolls horizontally instead. Turn it off for a table that must fit
   * its container at any cost.
   */
  enableHeaderContentFit?: boolean
  density?: DataTableDensity
  /** Fixed height for the scroll container, e.g. `'520px'`. Required for virtualization. */
  height?: string | number
  maxHeight?: string | number
  /** Text direction. `rtl` mirrors pinning, resizing and icons. */
  direction?: 'ltr' | 'rtl'
  className?: string
  classNames?: DataTableClassNames
  style?: CSSProperties
  /** CSS custom properties applied to the root, e.g. `{ '--rtc-accent': 'tomato' }`. */
  cssVars?: Record<string, string | number>
  caption?: ReactNode

  // ---------------------------------------------------------------- state ----
  isLoading?: boolean
  /** Show a slim progress bar without replacing the body with skeletons. */
  showProgressBars?: boolean
  isSaving?: boolean
  isLoadingError?: boolean
  errorMessage?: ReactNode
  skeletonRowCount?: number

  localization?: Partial<DataTableLocalization>

  /**
   * Swap the interactive components the table renders — buttons, inputs,
   * overlays — for your own design system. Anything omitted falls back to the
   * built-in primitive. See `DataTableComponents`.
   */
  components?: DataTableComponentsOverride

  // ----------------------------------------------------------------- slots ----
  renderTopToolbarActions?: (ctx: DataTableRenderContext<TData>) => ReactNode
  renderBottomToolbarActions?: (ctx: DataTableRenderContext<TData>) => ReactNode
  renderToolbarInternalActions?: (ctx: DataTableRenderContext<TData>) => ReactNode
  renderEmptyState?: (ctx: DataTableRenderContext<TData>) => ReactNode
  /**
   * Overflow-menu entries for a row, as data rather than children — the
   * registry's `Menu` takes an items array so config-object libraries can
   * back it.
   */
  rowActionMenuItems?: (ctx: DataTableRowRenderContext<TData>) => RtcMenuItem[]
  renderCaption?: (ctx: DataTableRenderContext<TData>) => ReactNode

  // ------------------------------------------------------------ prop slots ----
  tableProps?: React.HTMLAttributes<HTMLTableElement>
  containerProps?: React.HTMLAttributes<HTMLDivElement>
  rowProps?: (ctx: DataTableRowRenderContext<TData>) => React.HTMLAttributes<HTMLTableRowElement>
  cellProps?: (ctx: DataTableCellRenderContext<TData>) => React.HTMLAttributes<HTMLTableCellElement>
  headCellProps?: (ctx: {
    table: DataTableInstance<TData>
    header: DataTableHeader<TData, any>
    column: DataTableColumnInstance<TData, any>
  }) => React.HTMLAttributes<HTMLTableCellElement>
}

/**
 * The object returned by `useDataTable`. It is the TanStack v9 table instance
 * augmented with the component's own UI state and helpers.
 */
export type DataTableInstance<TData extends RowData> = import('@tanstack/react-table').ReactTable<
  DataTableFeatures,
  TData
> & {
  /** Resolved component options, with defaults applied. */
  dataTableOptions: DataTableOptions<TData> & {
    localization: DataTableLocalization
  }
  /** Presentation state owned by the component rather than TanStack. */
  ui: DataTableUiState
  /**
   * Whether the viewport is narrower than `mobileBreakpoint`.
   *
   * Not part of `ui` state, for the same reason as `headerMinSizes`: it is
   * measured rather than chosen, so it has no business round-tripping through
   * `initialState` or being reported by `onStateChange`.
   */
  isMobile: boolean
  setDensity: (density: DataTableDensity) => void
  setIsFullScreen: (value: boolean | ((old: boolean) => boolean)) => void
  setShowFilterPanel: (value: boolean | ((old: boolean) => boolean)) => void
  setShowGlobalFilter: (value: boolean | ((old: boolean) => boolean)) => void
  setEditingRowId: (rowId: string | null) => void
  setEditingCellId: (cellId: string | null) => void
  setRowOrder: (order: string[] | ((old: string[]) => string[])) => void
  setColumnFilterOperator: (columnId: string, operatorId: string) => void
  setGlobalFilterFn: (filterFn: string | null) => void
  /** Pending edit values, keyed `rowId` → `columnId` → value. */
  editValues: Record<string, Record<string, unknown>>
  setEditValue: (rowId: string, columnId: string, value: unknown) => void
  clearEditValues: (rowId?: string) => void
  /** Rows in final render order, after row-ordering and pinning are applied. */
  getRenderRows: () => Array<DataTableRow<TData>>
  /**
   * Per-column floor, in pixels, measured from the header's own content.
   *
   * Not part of `ui` state: it is derived from layout rather than chosen by
   * anyone, so it should not round-trip through `initialState` or be reported
   * by `onStateChange`. See `enableHeaderContentFit`.
   */
  headerMinSizes: Record<string, number>
  setHeaderMinSizes: (sizes: Record<string, number>) => void
}

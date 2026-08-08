// Collected by the build into `dist/style.css` and stripped from the JS
// output, so consumers import `@mvd/table/styles.css` themselves —
// importing this module does not inject styles.
import './styles.css'

export { DataTable, type DataTableProps } from './DataTable'
export { useDataTable } from './useDataTable'

export {
  dataTableFeatures,
  dataTableFilterFns,
  dataTableSortFns,
  dataTableAggregationFns,
  type DataTableFeatures,
} from './features'

export {
  DISPLAY_COLUMN_IDS,
  getDisplayColumnLabel,
  isDisplayColumnId,
  type DisplayColumnId,
} from './displayColumns'

export {
  defaultLocalization,
  formatMessage,
  type DataTableLocalization,
} from './locale'

export {
  cellEditId,
  commitCellEdit,
  commitRowEdit,
  getEditValue,
  isCellEditing,
  isRowEditable,
} from './editing'

export { toCsv, stringifyValue } from './utils'

/** Viewport helpers behind the mobile filter drawer. */
export {
  DEFAULT_MOBILE_BREAKPOINT,
  mobileMediaQuery,
  useIsMobile,
  useMediaQuery,
  usesFilterDrawer,
} from './responsive'

export {
  dataTableThemes,
  materialTheme,
  shadcnTheme,
  antTheme,
  linearTheme,
  spreadsheetTheme,
  softTheme,
  highContrastTheme,
  type DataTableTheme,
  type DataTableThemeName,
} from './themes'

/**
 * The component registry: swap the table's buttons, inputs and overlays for
 * your own design system.
 */
export {
  DataTableComponentsProvider,
  useComponents,
  type DataTableComponents,
  type DataTableComponentsOverride,
  type RtcBadgeProps,
  type RtcLabelProps,
  type RtcButtonProps,
  type RtcCheckboxProps,
  type RtcDialogProps,
  type RtcDrawerProps,
  type RtcIconButtonProps,
  type RtcIconName,
  type RtcIconProps,
  type RtcMenuItem,
  type RtcMenuProps,
  type RtcMultiSelectProps,
  type RtcNumberInputProps,
  type RtcOption,
  type RtcPopoverProps,
  type RtcProgressBarProps,
  type RtcRadioProps,
  type RtcRangeSliderProps,
  type RtcSelectProps,
  type RtcSize,
  type RtcSkeletonProps,
  type RtcSwitchProps,
  type RtcTextInputProps,
  type RtcTooltipProps,
} from './components/registry'
export { defaultComponents } from './components/defaultComponents'

/**
 * Filter data types: register your own to teach the table a new kind of
 * column, or reuse a built-in as the basis for one.
 */
export {
  defaultDataTypes,
  resolveDataType,
  resolveTypeMeta,
  findOperator,
  toConditions,
  fromConditions,
  joinOf,
} from './filters/registry'
export { textDataType, enumDataType } from './filters/dataTypes/text'
export { numberDataType, durationDataType } from './filters/dataTypes/number'
export { booleanDataType } from './filters/dataTypes/boolean'
export { dateDataType, dateTimeDataType } from './filters/dataTypes/date'
export {
  collectionDataType,
  geoPointDataType,
  parseGeoPoint,
  haversineKm,
  type GeoPoint,
} from './filters/dataTypes/collection'
export {
  NoOperand,
  TextOperand,
  NumberOperand,
  NumberRangeOperand,
  SliderOperand,
  SelectOperand,
  MultiSelectOperand,
  CheckboxGroupOperand,
} from './filters/operands'
export { evaluateConditions, STRUCTURED_FILTER_FN } from './filters/filterFn'
export {
  DATE_PRESETS,
  presetInterval,
  lastNInterval,
  nextNInterval,
  toEpoch,
  startOf,
  addUnits,
  type DatePresetId,
  type DateUnit,
  type Interval,
} from './filters/temporal'
export type {
  ColumnDataType,
  ColumnDataTypes,
  ColumnFilterValue,
  DescribeContext,
  FilterArity,
  FilterCondition,
  FilterModifiers,
  FilterOperandProps,
  FilterOperator,
  FilterTestContext,
  FilterTypeMeta,
} from './filters/types'

/** Filter surfaces, usable standalone with an instance from `useDataTable`. */
export { DataTableFilterPanel, type DataTableFilterPanelProps } from './components/FilterPanel'
export {
  DataTableFilterDrawer,
  type DataTableFilterDrawerProps,
} from './components/FilterDrawer'
export { ColumnFilterPopover } from './components/ColumnFilterPopover'
export { FilterConditions } from './components/FilterConditions'
export {
  FilterEditor,
  columnOperators,
  currentOperatorId,
  currentOperatorLabel,
  describeFilter,
  filterOperatorItems,
  hasFilterOperatorChoice,
  type FilterEditorProps,
} from './components/FilterEditor'

export type {
  DataTableCell,
  DataTableCellEditContext,
  DataTableCellRenderContext,
  DataTableClassNames,
  DataTableColumn,
  DataTableColumnInstance,
  DataTableColumnMeta,
  DataTableDensity,
  DataTableEditMode,
  DataTableEditSubmitContext,
  DataTableEditVariant,
  DataTableFilterVariant,
  DataTableHeader,
  DataTableInitialState,
  DataTableInstance,
  DataTableLayoutMode,
  DataTableOptions,
  DataTableRenderContext,
  DataTableRow,
  DataTableRowRenderContext,
  DataTableSelectOption,
  DataTableTanStackState,
  DataTableUiState,
} from './types'

/**
 * Typed column builder for this component's feature set.
 *
 * @example
 * const helper = createDataTableColumnHelper<Person>()
 * const columns = helper.columns([helper.accessor('name', { header: 'Name' })])
 */
export { createColumnHelper as createTanStackColumnHelper } from '@tanstack/react-table'
export { createDataTableColumnHelper } from './columnHelper'

export type {
  CellSelectionState,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  ExpandedState,
  GroupingState,
  PaginationState,
  RowPinningState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table'

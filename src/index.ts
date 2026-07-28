// Collected by the build into `dist/style.css` and stripped from the JS
// output, so consumers import `@rtc2/react-table/styles.css` themselves —
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

/** Re-exported primitives so consumers can build matching custom toolbars. */
export { Button, Checkbox, IconButton, Select, TextInput } from './components/primitives/Controls'
export { Menu, MenuItem, MenuLabel, MenuSeparator } from './components/primitives/Menu'

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

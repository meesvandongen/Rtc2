/**
 * Every user-visible string the component can render.
 *
 * Pass a partial override through the `localization` option; anything omitted
 * falls back to the English default below. Values containing `{placeholders}`
 * are interpolated with `formatMessage`.
 */
export interface DataTableLocalization {
  actions: string
  and: string
  cancel: string
  changeFilterMode: string
  changeSearchMode: string
  clearFilter: string
  clearSearch: string
  clearSort: string
  clickToCopy: string
  collapse: string
  collapseAll: string
  columnActions: string
  copiedToClipboard: string
  edit: string
  expand: string
  expandAll: string
  filterByColumn: string
  filterMode: string
  filters: string
  clearAllFilters: string
  noFilterableColumns: string
  goToFirstPage: string
  goToLastPage: string
  goToNextPage: string
  goToPreviousPage: string
  grab: string
  groupByColumn: string
  groupedBy: string
  hideAll: string
  hideColumn: string
  loading: string
  max: string
  min: string
  move: string
  noRecordsToDisplay: string
  noResultsFound: string
  of: string
  pagination: string
  or: string
  pinToEnd: string
  pinToStart: string
  pinToTop: string
  pinToBottom: string
  resetColumnSize: string
  resetOrder: string
  rowActions: string
  rowNumber: string
  rowNumbers: string
  rowsPerPage: string
  save: string
  search: string
  select: string
  selectedCountOfRowCountRowsSelected: string
  showAll: string
  showAllColumns: string
  showHideColumns: string
  showHideFilters: string
  showHideSearch: string
  sortByColumnAsc: string
  sortByColumnDesc: string
  sortedByColumnAsc: string
  sortedByColumnDesc: string
  thenBy: string
  toggleDensity: string
  toggleFullScreen: string
  toggleSelectAll: string
  toggleSelectRow: string
  toggleVisibility: string
  ungroupByColumn: string
  unpin: string
  unpinAll: string
  errorLoadingData: string
  filterVariantEmpty: string
  filterVariantNotEmpty: string
  filterOperators: Record<string, string>
}

export const defaultLocalization: DataTableLocalization = {
  actions: 'Actions',
  and: 'and',
  cancel: 'Cancel',
  changeFilterMode: 'Change filter mode',
  changeSearchMode: 'Change search mode',
  clearFilter: 'Clear filter',
  clearSearch: 'Clear search',
  clearSort: 'Clear sort',
  clickToCopy: 'Click to copy',
  collapse: 'Collapse',
  collapseAll: 'Collapse all',
  columnActions: 'Column actions',
  copiedToClipboard: 'Copied to clipboard',
  edit: 'Edit',
  expand: 'Expand',
  expandAll: 'Expand all',
  filterByColumn: 'Filter by {column}',
  filterMode: 'Filter mode: {filterType}',
  filters: 'Filters',
  clearAllFilters: 'Clear all',
  noFilterableColumns: 'No filterable columns',
  goToFirstPage: 'Go to first page',
  goToLastPage: 'Go to last page',
  goToNextPage: 'Go to next page',
  goToPreviousPage: 'Go to previous page',
  grab: 'Grab',
  groupByColumn: 'Group by {column}',
  groupedBy: 'Grouped by',
  hideAll: 'Hide all',
  hideColumn: 'Hide {column} column',
  loading: 'Loading',
  max: 'Max',
  min: 'Min',
  move: 'Move',
  noRecordsToDisplay: 'No records to display',
  noResultsFound: 'No results found',
  of: 'of',
  pagination: 'Pagination',
  or: 'or',
  pinToEnd: 'Pin to end',
  pinToStart: 'Pin to start',
  pinToTop: 'Pin to top',
  pinToBottom: 'Pin to bottom',
  resetColumnSize: 'Reset column size',
  resetOrder: 'Reset order',
  rowActions: 'Row actions',
  rowNumber: '#',
  rowNumbers: 'Row numbers',
  rowsPerPage: 'Rows per page',
  save: 'Save',
  search: 'Search',
  select: 'Select',
  selectedCountOfRowCountRowsSelected: '{selectedCount} of {rowCount} row(s) selected',
  showAll: 'Show all',
  showAllColumns: 'Show all columns',
  showHideColumns: 'Show/hide columns',
  showHideFilters: 'Show/hide filters',
  showHideSearch: 'Show/hide search',
  sortByColumnAsc: 'Sort by {column} ascending',
  sortByColumnDesc: 'Sort by {column} descending',
  sortedByColumnAsc: 'Sorted by {column} ascending',
  sortedByColumnDesc: 'Sorted by {column} descending',
  thenBy: ', then by ',
  toggleDensity: 'Toggle density',
  toggleFullScreen: 'Toggle full screen',
  toggleSelectAll: 'Toggle select all',
  toggleSelectRow: 'Toggle select row',
  toggleVisibility: 'Toggle visibility',
  ungroupByColumn: 'Ungroup by {column}',
  unpin: 'Unpin',
  unpinAll: 'Unpin all',
  errorLoadingData: 'Error loading data',
  filterVariantEmpty: 'Is empty',
  filterVariantNotEmpty: 'Is not empty',
  filterOperators: {
    arrIncludes: 'Includes',
    arrIncludesAll: 'Includes all',
    arrIncludesSome: 'Includes some',
    between: 'Between',
    betweenInclusive: 'Between inclusive',
    empty: 'Is empty',
    endsWith: 'Ends with',
    equals: 'Equals',
    equalsString: 'Equals',
    equalsStringSensitive: 'Equals (case sensitive)',
    greaterThan: 'Greater than',
    greaterThanOrEqualTo: 'Greater than or equal to',
    inNumberRange: 'Between',
    includesString: 'Contains',
    includesStringSensitive: 'Contains (case sensitive)',
    lessThan: 'Less than',
    lessThanOrEqualTo: 'Less than or equal to',
    notEmpty: 'Is not empty',
    startsWith: 'Starts with',
    weakEquals: 'Equals (loose)',
  },
}

/** Replaces `{token}` placeholders in a localized string. */
export function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

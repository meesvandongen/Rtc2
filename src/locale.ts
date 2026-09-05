/**
 * Every user-visible string the component can render.
 *
 * Pass a partial override through the `localization` option; anything omitted
 * falls back to the English default below, one key at a time — the nested
 * records (`filterOperators`, `datePresets`, `dateUnits`, `bounds`) are merged
 * rather than replaced, so naming one date preset does not un-translate the
 * other thirteen. Values containing `{placeholders}` are interpolated with
 * `formatMessage`.
 */
export interface DataTableLocalization {
  actions: string
  and: string
  amount: string
  unit: string
  cancel: string
  changeFilterMode: string
  changeSearchMode: string
  clearFilter: string
  clearSearch: string
  clearSort: string
  clickToCopy: string
  close: string
  collapse: string
  collapseAll: string
  columnActions: string
  copiedToClipboard: string
  done: string
  edit: string
  expand: string
  expandAll: string
  filterByColumn: string
  filters: string
  from: string
  to: string
  selectPeriod: string
  booleanTrue: string
  booleanFalse: string
  latitude: string
  longitude: string
  radiusKm: string
  addCondition: string
  removeCondition: string
  matchAll: string
  matchAny: string
  bounds: Record<'north' | 'south' | 'east' | 'west', string>
  weekdays: string[]
  dateUnits: Record<string, string>
  datePresets: Record<string, string>
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
  pin: string
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
  ungroupByColumn: string
  unpin: string
  unpinAll: string
  errorLoadingData: string
  /**
   * Operator names, keyed by operator id — and optionally by
   * `dataTypeId.operatorId`, which wins over the bare id.
   *
   * The scoped form exists because one operator id is shared by data types
   * that want to name it differently: `equals` is "Equals" on a text column
   * but "Is" on an `enum`, and `dateIs` is "Is on" for a `date` and "Is at"
   * for a `datetime`. Without it a translator could only pick one reading for
   * all of them. See `filterOperatorLabel`.
   */
  filterOperators: Record<string, string>
}

export const defaultLocalization: DataTableLocalization = {
  actions: 'Actions',
  and: 'and',
  amount: 'amount',
  unit: 'unit',
  cancel: 'Cancel',
  changeFilterMode: 'Change filter mode',
  changeSearchMode: 'Change search mode',
  clearFilter: 'Clear filter',
  clearSearch: 'Clear search',
  clearSort: 'Clear sort',
  clickToCopy: 'Click to copy',
  close: 'Close',
  collapse: 'Collapse',
  collapseAll: 'Collapse all',
  columnActions: 'Column actions',
  copiedToClipboard: 'Copied to clipboard',
  done: 'Done',
  edit: 'Edit',
  expand: 'Expand',
  expandAll: 'Expand all',
  filterByColumn: 'Filter by {column}',
  filters: 'Filters',
  from: 'From',
  to: 'To',
  selectPeriod: 'Select period',
  booleanTrue: 'Yes',
  booleanFalse: 'No',
  latitude: 'Latitude',
  longitude: 'Longitude',
  radiusKm: 'Radius (km)',
  addCondition: 'Add condition',
  removeCondition: 'Remove condition',
  matchAll: 'Match all',
  matchAny: 'Match any',
  bounds: { north: 'North', south: 'South', east: 'East', west: 'West' },
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dateUnits: {
    day: 'days',
    week: 'weeks',
    month: 'months',
    quarter: 'quarters',
    year: 'years',
  },
  datePresets: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    nextWeek: 'Next week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    nextMonth: 'Next month',
    thisQuarter: 'This quarter',
    lastQuarter: 'Last quarter',
    thisYear: 'This year',
    lastYear: 'Last year',
    yearToDate: 'Year to date',
  },
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
  pin: 'Pin',
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
  ungroupByColumn: 'Ungroup by {column}',
  unpin: 'Unpin',
  unpinAll: 'Unpin all',
  errorLoadingData: 'Error loading data',
  filterOperators: {
    // Structured data-type operators.
    contains: 'Contains',
    equals: 'Equals',
    notEquals: 'Does not equal',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    matchesRegex: 'Matches regex',
    isAnyOf: 'Is any of',
    isOneOfChecklist: 'Is any of (checklist)',
    isEmpty: 'Is empty',
    isNotEmpty: 'Is not empty',
    greaterThan: 'Greater than',
    greaterThanOrEqual: 'Greater than or equal to',
    lessThan: 'Less than',
    lessThanOrEqual: 'Less than or equal to',
    between: 'Between',
    betweenExclusive: 'Between (exclusive)',
    inRangeSlider: 'In range',
    booleanIs: 'Is',
    dateIs: 'Is on',
    dateBefore: 'Is before',
    dateOnOrBefore: 'Is on or before',
    dateAfter: 'Is after',
    dateOnOrAfter: 'Is on or after',
    dateBetween: 'Is between',
    dateInPeriod: 'Is in period',
    dateInLast: 'Is in the last',
    dateInNext: 'Is in the next',
    dateWeekdayIs: 'Day of week is',
    dateTimeOfDayBetween: 'Time of day between',
    containsAnyOf: 'Contains any of',
    containsAllOf: 'Contains all of',
    containsNoneOf: 'Contains none of',
    countEquals: 'Item count equals',
    countAtLeast: 'Item count at least',
    geoWithinRadius: 'Within radius of',
    geoWithinBounds: 'Within bounding box',
    // Type-scoped readings, which win over the bare ids above. Picking a known
    // value from a list is "is", not "equals"; a timestamp happens "at" a
    // moment rather than "on" a day.
    'enum.equals': 'Is',
    'datetime.dateIs': 'Is at',
    // Raw TanStack filter fns, still selectable per column via `filterFn`.
    // Ids shared with the structured operators above are not repeated.
    arrIncludes: 'Includes',
    arrIncludesAll: 'Includes all',
    arrIncludesSome: 'Includes some',
    betweenInclusive: 'Between inclusive',
    empty: 'Is empty',
    equalsString: 'Equals',
    equalsStringSensitive: 'Equals (case sensitive)',
    greaterThanOrEqualTo: 'Greater than or equal to',
    inNumberRange: 'Between',
    includesString: 'Contains',
    includesStringSensitive: 'Contains (case sensitive)',
    lessThanOrEqualTo: 'Less than or equal to',
    notEmpty: 'Is not empty',
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

/**
 * Resolves a caller's partial overrides against the English defaults.
 *
 * The nested records are merged key by key rather than replaced wholesale: a
 * caller who renames one date preset, or one operator, means only that one.
 * Spreading the top level alone silently reverted the other thirteen presets
 * to English — the failure was invisible until someone opened the period
 * picker in a translated table.
 *
 * `weekdays` is the exception: it is a positional array, Sunday first, so a
 * partial one would leave a translated table with English tail days. An
 * override replaces it whole and is validated to be seven long.
 */
export function mergeLocalization(
  overrides: Partial<DataTableLocalization> | undefined,
): DataTableLocalization {
  if (!overrides) return defaultLocalization
  return {
    ...defaultLocalization,
    ...overrides,
    bounds: { ...defaultLocalization.bounds, ...overrides.bounds },
    dateUnits: { ...defaultLocalization.dateUnits, ...overrides.dateUnits },
    datePresets: { ...defaultLocalization.datePresets, ...overrides.datePresets },
    filterOperators: {
      ...defaultLocalization.filterOperators,
      ...overrides.filterOperators,
    },
    weekdays:
      overrides.weekdays?.length === 7 ? overrides.weekdays : defaultLocalization.weekdays,
  }
}

/**
 * The displayed name of one filter operator.
 *
 * Tried most specific first: `dataTypeId.operatorId`, so a data type can name
 * a shared operator its own way; then the bare `operatorId`; and only then the
 * operator's own `label`, which is a fallback for operators a caller added
 * without touching `localization`.
 */
export function filterOperatorLabel(
  localization: DataTableLocalization,
  dataTypeId: string,
  operatorId: string,
  fallback: string,
): string {
  return (
    localization.filterOperators[`${dataTypeId}.${operatorId}`] ??
    localization.filterOperators[operatorId] ??
    fallback
  )
}

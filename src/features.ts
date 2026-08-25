import {
  aggregationFn_count,
  aggregationFn_extent,
  aggregationFn_first,
  aggregationFn_last,
  aggregationFn_max,
  aggregationFn_mean,
  aggregationFn_median,
  aggregationFn_min,
  aggregationFn_sum,
  aggregationFn_unique,
  aggregationFn_uniqueCount,
  cellSelectionFeature,
  columnFacetingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_arrIncludesAll,
  filterFn_arrIncludesSome,
  filterFn_between,
  filterFn_betweenInclusive,
  filterFn_empty,
  filterFn_endsWith,
  filterFn_equals,
  filterFn_equalsString,
  filterFn_equalsStringSensitive,
  filterFn_greaterThan,
  filterFn_greaterThanOrEqualTo,
  filterFn_inNumberRange,
  filterFn_includesString,
  filterFn_includesStringSensitive,
  filterFn_lessThan,
  filterFn_lessThanOrEqualTo,
  filterFn_notEmpty,
  filterFn_startsWith,
  filterFn_weakEquals,
  globalFilteringFeature,
  metaHelper,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
} from '@tanstack/react-table'

import {
  GLOBAL_MODE_FILTER_FN,
  STRUCTURED_FILTER_FN,
  isGlobalFilterWithMode,
} from './filters/filterFn'
import type { DataTableTableMeta } from './filters/registry'
import { structuredFilterFn } from './filters/tanstack'
import type { DataTableColumnMeta } from './types'

/**
 * Global filter fn that reads its mode out of the filter value.
 *
 * See `GlobalFilterWithMode` for why the mode travels in the value rather than
 * in `options.globalFilterFn`. It dispatches to one of the fns registered
 * below, applying that fn's own `resolveFilterValue` first — the table
 * normally does that once per filter before calling, and skipping it would
 * make a case-insensitive search silently case-sensitive.
 */
function globalModeFilterFn(
  row: any,
  columnId: string,
  filterValue: unknown,
  addMeta?: (meta: any) => void,
): boolean {
  const registry = dataTableFilterFns as unknown as Record<string, any>
  if (!isGlobalFilterWithMode(filterValue)) {
    return registry.includesString(row, columnId, filterValue, addMeta)
  }
  const target = registry[filterValue.mode] ?? registry.includesString
  const resolved = target.resolveFilterValue
    ? target.resolveFilterValue(filterValue.query)
    : filterValue.query
  return target(row, columnId, resolved, addMeta)
}

/**
 * Every filter function the component exposes through the column-filter
 * operator menu, keyed by the name used in `columnDef.filterFn`.
 */
export const dataTableFilterFns = {
  arrIncludes: filterFn_arrIncludes,
  arrIncludesAll: filterFn_arrIncludesAll,
  arrIncludesSome: filterFn_arrIncludesSome,
  between: filterFn_between,
  betweenInclusive: filterFn_betweenInclusive,
  empty: filterFn_empty,
  endsWith: filterFn_endsWith,
  equals: filterFn_equals,
  equalsString: filterFn_equalsString,
  equalsStringSensitive: filterFn_equalsStringSensitive,
  greaterThan: filterFn_greaterThan,
  greaterThanOrEqualTo: filterFn_greaterThanOrEqualTo,
  inNumberRange: filterFn_inNumberRange,
  includesString: filterFn_includesString,
  includesStringSensitive: filterFn_includesStringSensitive,
  lessThan: filterFn_lessThan,
  lessThanOrEqualTo: filterFn_lessThanOrEqualTo,
  notEmpty: filterFn_notEmpty,
  startsWith: filterFn_startsWith,
  weakEquals: filterFn_weakEquals,
  /**
   * The structured filter used by every column. The built-ins above stay
   * registered so a caller can still opt a column into a raw TanStack filter.
   */
  [STRUCTURED_FILTER_FN]: structuredFilterFn,
  /** Global search whose mode the reader can change; see `globalModeFilterFn`. */
  [GLOBAL_MODE_FILTER_FN]: globalModeFilterFn,
} as const

export const dataTableSortFns = {
  alphanumeric: sortFn_alphanumeric,
  alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
  basic: sortFn_basic,
  datetime: sortFn_datetime,
  text: sortFn_text,
  textCaseSensitive: sortFn_textCaseSensitive,
} as const

export const dataTableAggregationFns = {
  count: aggregationFn_count,
  extent: aggregationFn_extent,
  first: aggregationFn_first,
  last: aggregationFn_last,
  max: aggregationFn_max,
  mean: aggregationFn_mean,
  median: aggregationFn_median,
  min: aggregationFn_min,
  sum: aggregationFn_sum,
  unique: aggregationFn_unique,
  uniqueCount: aggregationFn_uniqueCount,
} as const

/**
 * The batteries-included TanStack Table v9 feature set backing `<DataTable />`.
 *
 * v9 gates state and instance APIs on the registered feature list, and the
 * component surfaces every one of them behind `enable*` props, so the set is
 * fixed rather than assembled per table. Registering everything trades v9's
 * per-feature tree-shaking for a single stable table type; build your own
 * `tableFeatures({ ... })` and use `useTable` directly when bundle size for a
 * narrow table matters more than the component's prop surface.
 */
export const dataTableFeatures = tableFeatures({
  cellSelectionFeature,
  columnFacetingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,

  expandedRowModel: createExpandedRowModel(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filteredRowModel: createFilteredRowModel(),
  groupedRowModel: createGroupedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),

  filterFns: dataTableFilterFns,
  sortFns: dataTableSortFns,
  aggregationFns: dataTableAggregationFns,

  columnMeta: metaHelper<DataTableColumnMeta>(),
  tableMeta: metaHelper<DataTableTableMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures

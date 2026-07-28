import type { RowData } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'

import type { DataTableFeatures } from './features'

/**
 * `createColumnHelper` pre-bound to the component's feature set.
 *
 * Using it means `meta` is typed as `DataTableColumnMeta` and every
 * feature-specific column option (`filterFn`, `aggregationFn`, `sortFn`, …)
 * is checked against the registered function names.
 */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

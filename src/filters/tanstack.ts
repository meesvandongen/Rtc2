import { constructFilterFn } from '@tanstack/react-table'

import { evaluateConditions } from './filterFn'
import {
  joinOf,
  resolveDataType,
  resolveTypeMeta,
  toConditions,
  type FilterTableRef,
} from './registry'

/** See the note in `./registry` on why this module avoids `../types`. */
type TableRef = FilterTableRef & {
  getColumn: (id: string) => any
}

/**
 * The one filter function registered with TanStack.
 *
 * Every column uses it. Rather than swapping `columnDef.filterFn` when the
 * user picks a different comparison — which meant the operator lived outside
 * the filter value and could not be serialised or restored — the operator is
 * part of the value, and this function dispatches on it.
 *
 * That is what makes the filter state self-describing: `{ op, value }` round
 * trips through a URL or an API without a parallel map of which function each
 * column happens to be using.
 */
export const structuredFilterFn = constructFilterFn({
  filter: (dataValue: unknown, filterValue: unknown, row: any, columnId: string) => {
    if (filterValue == null) return true

    const table = row.table as TableRef
    const column = table.getColumn(columnId)
    if (!column) return true

    const dataType = resolveDataType(table, column)
    const meta = resolveTypeMeta(column, dataType)

    const conditions = toConditions(filterValue, dataType)
    if (conditions.length === 0) return true

    // One clock reading per pass, not per row: rows either side of a boundary
    // must be judged against the same "now".
    const now = getFilterNow(table)

    return evaluateConditions(dataValue, conditions, joinOf(filterValue), dataType, meta, now)
  },
  /** Drop the filter only when the value is gone entirely. */
  autoRemove: (filterValue: unknown) => filterValue == null,
})

/**
 * A `now` that is stable for the duration of a filter pass.
 *
 * Cached on the table instance and refreshed only when the filter state
 * changes, so relative operators ("in the last 7 days") do not shift beneath
 * rows mid-evaluation, and re-renders do not silently re-bucket data.
 */
const NOW_CACHE = new WeakMap<object, { key: string; now: Date }>()

function getFilterNow(table: TableRef): Date {
  const override = table.options.meta?.rtcFilterConfig?.filterNow
  if (override) return override

  const key = JSON.stringify(table.options.state?.columnFilters ?? [])
  const cached = NOW_CACHE.get(table)
  if (cached && cached.key === key) return cached.now
  const now = new Date()
  NOW_CACHE.set(table, { key, now })
  return now
}

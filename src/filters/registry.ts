import { booleanDataType } from './dataTypes/boolean'
import { collectionDataType, geoPointDataType } from './dataTypes/collection'
import { dateDataType, dateTimeDataType } from './dataTypes/date'
import { durationDataType, numberDataType } from './dataTypes/number'
import { enumDataType, textDataType } from './dataTypes/text'
import type {
  ColumnDataType,
  ColumnDataTypes,
  FilterCondition,
  FilterTypeMeta,
} from './types'

/** What the filter layer needs from a table, carried on `options.meta`. */
export interface FilterConfig {
  dataTypes?: ColumnDataTypes
  filterNow?: Date
}

/**
 * The table meta this component registers with TanStack.
 *
 * The filter config travels here rather than on the instance because
 * `useTable` returns a fresh shallow copy `{ ...table, options, state }` on
 * every render: a property assigned to the returned object never reaches the
 * internal table, and `row.table` — all a filter function gets — is the
 * internal one. Options do reach both, via `table.setOptions`.
 */
export interface DataTableTableMeta {
  rtcFilterConfig?: FilterConfig
}

/**
 * `FilterTableRef` and `FilterColumnRef` are structural rather than
 * `DataTableInstance` / `DataTableColumnInstance`.
 *
 * Importing those here would close a cycle — `types.ts` → `features.ts` →
 * `filters/tanstack.ts` → this module → `types.ts` — which TypeScript resolves
 * by degrading `DataTableInstance` to a non-generic type across the package.
 * The public wrappers in `components/FilterEditor.tsx` keep the strong types.
 */
export interface FilterTableRef {
  options: { meta?: DataTableTableMeta; state?: { columnFilters?: unknown } }
  getCoreRowModel: () => { rows: Array<{ getValue: (columnId: string) => unknown }> }
}

export interface FilterColumnRef {
  id: string
  columnDef: { meta?: { dataType?: unknown; filterVariant?: string; filterTypeMeta?: unknown } }
}

/** The types every table understands out of the box. */
export const defaultDataTypes: ColumnDataTypes = {
  text: textDataType,
  enum: enumDataType,
  number: numberDataType,
  duration: durationDataType,
  boolean: booleanDataType,
  date: dateDataType,
  datetime: dateTimeDataType,
  collection: collectionDataType,
  geoPoint: geoPointDataType,
}

/** Legacy `meta.filterVariant` values mapped onto the data types. */
const VARIANT_TO_TYPE: Record<string, string> = {
  text: 'text',
  autocomplete: 'text',
  select: 'enum',
  'multi-select': 'collection',
  checkbox: 'enum',
  range: 'number',
  'range-slider': 'number',
  date: 'date',
  'date-range': 'date',
}

/**
 * Guesses a data type from a sample cell value.
 *
 * Only reached when a column declares neither `meta.dataType` nor
 * `meta.filterVariant`. Inference is a convenience for quick tables; anything
 * load-bearing should declare its type.
 */
function inferFromData(table: FilterTableRef, column: FilterColumnRef): string {
  const rows = table.getCoreRowModel().rows
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const value = rows[index]?.getValue(column.id)
    if (value == null || value === '') continue
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (Array.isArray(value)) return 'collection'
    if (value instanceof Date) return 'datetime'
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      if ('lat' in record && ('lng' in record || 'lon' in record)) return 'geoPoint'
      return 'text'
    }
    if (typeof value === 'string') {
      // Date-only strings are far more common in table data than timestamps,
      // so only an explicit time component upgrades to `datetime`.
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value)) return 'datetime'
    }
    return 'text'
  }
  return 'text'
}

/** Resolves the data type governing a column's filter. */
export function resolveDataType(table: FilterTableRef, column: FilterColumnRef): ColumnDataType {
  const registry = { ...defaultDataTypes, ...table.options.meta?.rtcFilterConfig?.dataTypes }
  const meta = column.columnDef.meta

  // An inline definition wins, so a one-off column need not touch the registry.
  if (meta?.dataType && typeof meta.dataType === 'object') return meta.dataType as ColumnDataType
  if (typeof meta?.dataType === 'string' && registry[meta.dataType]) {
    return registry[meta.dataType]!
  }
  if (typeof meta?.filterVariant === 'string') {
    const mapped = VARIANT_TO_TYPE[meta.filterVariant]
    if (mapped && registry[mapped]) return registry[mapped]!
  }
  return registry[inferFromData(table, column)] ?? registry.text!
}

/** Column-level configuration handed to operators and operand editors. */
export function resolveTypeMeta(
  column: FilterColumnRef,
  dataType: ColumnDataType,
): FilterTypeMeta {
  const meta = (column.columnDef.meta?.filterTypeMeta ?? {}) as FilterTypeMeta
  // Date-times default to minute precision; plain dates to whole days.
  const dateGranularity =
    meta.dateGranularity ?? (dataType.id === 'datetime' ? 'minute' : 'day')
  return { ...meta, dateGranularity }
}

export function findOperator(dataType: ColumnDataType, id: string) {
  return dataType.operators.find((operator) => operator.id === id)
}

/**
 * Normalises a stored filter value into a list of conditions.
 *
 * A bare value — a string, a number, a `[min, max]` tuple — is read as the
 * operand of the data type's default operator. That keeps `columnFilters`
 * seeded from a URL, a controlled prop or a saved view working without the
 * caller having to know the structured shape.
 */
export function toConditions(value: unknown, dataType?: ColumnDataType): FilterCondition[] {
  if (value == null) return []
  if (!Array.isArray(value) && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.conditions)) return record.conditions as FilterCondition[]
    if (typeof record.op === 'string') return [value as FilterCondition]
  }
  return dataType ? [{ op: dataType.defaultOperator, value }] : []
}

export function joinOf(value: unknown): 'and' | 'or' {
  const record = (value ?? {}) as Record<string, unknown>
  return record.join === 'or' ? 'or' : 'and'
}

/** Rebuilds a filter value from conditions, collapsing the single case. */
export function fromConditions(
  conditions: FilterCondition[],
  join: 'and' | 'or',
): unknown {
  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]
  return { join, conditions }
}

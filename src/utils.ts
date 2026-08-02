import type { DataTableSelectOption } from './types'

import { useRef } from 'react'

import { getDisplayColumnLabel } from './displayColumnIds'
import type { DataTableLocalization } from './locale'

/**
 * Returns a stable reference for an array whose elements have not changed.
 *
 * TanStack v9 requires `columns` and `data` to keep their identity between
 * renders; a caller that writes `columns={cols.slice(0, 6)}` inline hands the
 * table a fresh array every time, which feeds a render → setOptions → render
 * loop. Element-wise comparison is cheap next to that failure mode, and it
 * turns the common inline-`slice`/`filter` case into a stable input.
 */
export function useStableArray<T>(value: readonly T[]): readonly T[] {
  const ref = useRef(value)
  const previous = ref.current
  if (
    previous !== value &&
    (previous.length !== value.length || previous.some((item, index) => item !== value[index]))
  ) {
    ref.current = value
  }
  return ref.current
}

/** TanStack-style updater resolution. */
export function applyUpdater<T>(updater: T | ((old: T) => T), old: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(old) : updater
}

export function cx(...values: Array<string | false | null | undefined>): string | undefined {
  const joined = values.filter(Boolean).join(' ')
  return joined === '' ? undefined : joined
}

/** Drops `undefined` entries so a partial controlled-state object can be spread safely. */
export function compact<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {}
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) result[key] = entry
  }
  return result as Partial<T>
}

export function normalizeOptions(
  options: Array<DataTableSelectOption | string> | undefined,
): DataTableSelectOption[] {
  if (!options) return []
  return options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option,
  )
}

/** Immutably move an item between positions, used by column and row reordering. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length) return list
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return list
  next.splice(to, 0, moved)
  return next
}

export function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

/** Human-readable label for a cell value used by faceted filters and CSV export. */
export function stringifyValue(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * A human-readable name for a column.
 *
 * `columnDef.header` may be a render function or a React element, neither of
 * which stringifies into anything usable for an `aria-label` or a menu entry.
 * For those, `meta.label` is the column's own answer, and the display columns
 * the component generates have a translated name of their own. Only when all
 * three are missing does this fall back to the id.
 */
export function getColumnLabel(
  column: { id: string; columnDef: { header?: unknown; meta?: { label?: string } } },
  localization?: DataTableLocalization,
): string {
  const metaLabel = column.columnDef.meta?.label
  if (typeof metaLabel === 'string' && metaLabel !== '') return metaLabel

  const header = column.columnDef.header
  if (typeof header === 'string' && header !== '') return header

  const displayLabel = localization && getDisplayColumnLabel(column.id, localization)
  return displayLabel || column.id
}

/** Serializes the table's visible columns and given rows as RFC 4180 CSV. */
export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (cell: string) =>
    /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

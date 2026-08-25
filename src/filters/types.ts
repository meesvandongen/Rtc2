import type { ComponentType, ReactNode } from 'react'
import type { Column, RowData, Table } from '@tanstack/react-table'

import type { RtcOption, RtcSize } from '../components/registry'
import type { DataTableLocalization } from '../locale'

/**
 * This module is intentionally leaf-level: it imports no other table module
 * beyond the component registry and the strings. `DataTableColumnMeta` refers
 * to `ColumnDataType`, so importing the table's own types back here would
 * create a cycle that silently degrades `DataTableInstance` to a non-generic
 * type across the whole package.
 *
 * `TFeatures = any` is deliberate: TanStack's feature map has an explicit
 * `any` branch that exposes every feature API, so operand editors still see
 * the full instance surface without this module depending on the feature set.
 */

/**
 * Column filtering, modelled as data types rather than a flat variant list.
 *
 * The previous design had one `filterVariant` enum that conflated two
 * independent things — what kind of value a column holds, and which comparison
 * is being made — and a hand-written operator table. That does not scale: a
 * date column alone needs "on", "before", "between", "in the last N days" and
 * "day of week is", each with a different operand shape, and the same is true
 * for every other non-trivial type.
 *
 * Here a **data type** owns a list of **operators**. Each operator declares its
 * arity, how to test a value, and optionally its own operand editor. Adding a
 * new type — coordinates, IP ranges, semver — means registering one object, not
 * editing the component.
 */

/** How many operands an operator takes. */
export type FilterArity = 0 | 1 | 2 | 'n'

/**
 * Cross-cutting toggles that would otherwise double the operator list.
 *
 * Case sensitivity as a modifier is why there is one `contains` rather than
 * `contains` plus `containsCaseSensitive`.
 */
export interface FilterModifiers {
  caseSensitive?: boolean
  ignoreDiacritics?: boolean
  /** Invert the operator's result. Lets one operator serve "is"/"is not". */
  negate?: boolean
  /** Keep null/undefined rows that a comparison would otherwise drop. */
  includeNulls?: boolean
}

/** One comparison applied to a column. */
export interface FilterCondition {
  op: string
  value?: unknown
  modifiers?: FilterModifiers
}

/**
 * A column's filter state.
 *
 * A bare condition is the common case; the grouped form supports several
 * conditions on one column (`age > 20 AND age < 30`), which a single
 * operator cannot express.
 */
export type ColumnFilterValue =
  | FilterCondition
  | { join: 'and' | 'or'; conditions: FilterCondition[] }

/** Everything an operator's `test` may need beyond the two values. */
export interface FilterTestContext {
  modifiers: FilterModifiers
  /**
   * Evaluation timestamp, fixed for the whole filter pass.
   *
   * Relative operators ("in the last 7 days") must not read the clock
   * per-row, or rows near a boundary would compare against different nows.
   */
  now: Date
  /** Column-level configuration, e.g. date granularity or a timezone. */
  meta: FilterTypeMeta
}

/** Per-column knobs a data type may read. Extend via declaration merging. */
export interface FilterTypeMeta {
  /** Smallest meaningful unit for date comparisons. */
  dateGranularity?: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
  /** Compare dates in the viewer's zone or in UTC. */
  dateTimeZone?: 'local' | 'utc'
  /** Base unit stored in the cell for duration columns. */
  durationUnit?: 'ms' | 's' | 'm' | 'h' | 'd'
  /** Step for numeric operands. */
  step?: number
  /** Unit suffix shown next to numeric operands. */
  unit?: string
  [key: string]: unknown
}

export interface FilterOperandProps<TData extends RowData = any> {
  value: unknown
  onChange: (value: unknown) => void
  operator: FilterOperator
  table: Table<any, TData>
  column: Column<any, TData, any>
  /** Passed explicitly so operand editors need nothing from table options. */
  localization: DataTableLocalization
  /** Faceted values for the column, already de-duplicated and sorted. */
  options: RtcOption[]
  /** Faceted numeric bounds, when the column has them. */
  bounds?: [number, number]
  size?: RtcSize
  meta: FilterTypeMeta
  /** Accessible label prefix, e.g. "Filter by Age". */
  label: string
}

export interface FilterOperator {
  id: string
  /** Fallback label; `localization.filterOperators[id]` wins when present. */
  label: string
  arity: FilterArity
  /**
   * The predicate. `dataValue` has already been through the type's
   * `resolveDataValue`; `operand` is the condition's `value`.
   */
  test: (dataValue: unknown, operand: unknown, ctx: FilterTestContext) => boolean
  /** Operand editor, when the type's default does not fit this operator. */
  Operand?: ComponentType<FilterOperandProps>
  /** Seed the operand when the user switches to this operator. */
  initialValue?: (previous: unknown) => unknown
  /** True when the operand is chosen from the column's faceted values. */
  usesFacets?: boolean
  /** Skip the filter entirely while this returns true (nothing entered yet). */
  isIncomplete?: (operand: unknown) => boolean
}

export interface ColumnDataType {
  id: string
  /** Operators offered for this type, in menu order. */
  operators: FilterOperator[]
  defaultOperator: string
  /** Operand editor used by operators that do not supply their own. */
  Operand: ComponentType<FilterOperandProps>
  /**
   * Normalise a cell value before comparison — `Date` to epoch milliseconds,
   * numeric strings to numbers, and so on.
   */
  resolveDataValue?: (value: unknown, meta: FilterTypeMeta) => unknown
  /** Short human summary of a condition, used for the toolbar chips. */
  describe?: (condition: FilterCondition, ctx: DescribeContext) => ReactNode
}

export interface DescribeContext {
  /** Localised operator label. */
  operatorLabel: string
  columnLabel: string
  meta: FilterTypeMeta
  /**
   * The table's strings.
   *
   * A summary is prose, so it needs more than the operator's name: the boolean
   * type spells out its own yes/no, the date type names its presets and
   * rolling units. Handing over the whole object keeps a `describe` from
   * having to reach for the table it was never given.
   */
  localization: DataTableLocalization
}

/** The registry: data type id → definition. */
export type ColumnDataTypes = Record<string, ColumnDataType>

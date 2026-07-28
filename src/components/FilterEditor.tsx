import { useMemo } from 'react'
import type { RowData } from '@tanstack/react-table'

import { useComponents, type RtcMenuItem, type RtcOption } from './registry'
import {
  findOperator,
  fromConditions,
  joinOf,
  resolveDataType,
  resolveTypeMeta,
  toConditions,
} from '../filters/registry'
import type { FilterCondition, FilterOperator } from '../filters/types'
import { formatMessage } from '../locale'
import { getColumnLabel, normalizeOptions, stringifyValue } from '../utils'
import type { DataTableColumnInstance, DataTableInstance } from '../types'

/**
 * The editor for one column's filter.
 *
 * It renders an operator picker plus whatever operand the chosen operator
 * declares. Because operators come from the column's data type, this component
 * has no knowledge of dates, numbers or coordinates — adding a type does not
 * change it.
 */

/**
 * Whether an operand carries nothing the user has entered.
 *
 * Recurses one level into tuples and structured operands so `[undefined,
 * undefined]` and `{ lat: undefined }` both read as blank.
 */
function isBlankOperand(value: unknown): boolean {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.every(isBlankOperand)
  if (typeof value === 'object') return Object.values(value).every(isBlankOperand)
  return false
}

/** Faceted values, recomputed whenever the surrounding filter state changes. */
function useFacets<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
  enabled: boolean,
): { options: RtcOption[]; bounds?: [number, number] } {
  const meta = column.columnDef.meta
  const enableFaceting = table.dataTableOptions.enableFaceting ?? true
  const filterSignal = table.state.columnFilters
  const globalSignal = table.state.globalFilter

  return useMemo(() => {
    const bounds = column.getFacetedMinMaxValues?.() ?? undefined
    if (meta?.filterSelectOptions) {
      return { options: normalizeOptions(meta.filterSelectOptions), bounds }
    }
    if (!enabled || !enableFaceting) return { options: [], bounds }
    const unique = column.getFacetedUniqueValues()
    if (!unique) return { options: [], bounds }
    const options = Array.from(unique.keys())
      .flatMap((key) => (Array.isArray(key) ? key : [key]))
      .filter((key) => key != null && key !== '')
      .map((key) => stringifyValue(key))
      .filter((key, index, all) => all.indexOf(key) === index)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ label: key, value: key }))
    return { options, bounds }
  }, [column, meta?.filterSelectOptions, enabled, enableFaceting, filterSignal, globalSignal])
}

/** Operators available for a column, honouring `meta.filterOperators`. */
export function columnOperators<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): FilterOperator[] {
  const dataType = resolveDataType(table, column)
  const allowed = column.columnDef.meta?.filterOperators
  if (!allowed) return dataType.operators
  return allowed
    .map((id) => findOperator(dataType, id))
    .filter((operator): operator is FilterOperator => !!operator)
}

/** The operator a column's editor should currently show. */
export function currentOperatorId<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
  conditionIndex = 0,
): string {
  const dataType = resolveDataType(table, column)
  const existing = toConditions(column.getFilterValue(), dataType)[conditionIndex]
  if (existing) return existing.op
  // The draft only applies to the first row: any later condition was added
  // explicitly and therefore always has a stored operator of its own.
  const draft = conditionIndex === 0 ? table.ui.columnFilterOperators[column.id] : undefined
  if (draft) return draft
  const operators = columnOperators(table, column)
  return operators.some((operator) => operator.id === dataType.defaultOperator)
    ? dataType.defaultOperator
    : (operators[0]?.id ?? dataType.defaultOperator)
}

function localizedOperatorLabel<TData extends RowData>(
  table: DataTableInstance<TData>,
  operator: FilterOperator,
): string {
  return table.dataTableOptions.localization.filterOperators[operator.id] ?? operator.label
}

export interface FilterEditorProps<TData extends RowData> {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
  /** Compact controls, for the popover. */
  size?: 'sm' | 'md'
  /** Index of the condition being edited, for multi-condition columns. */
  conditionIndex?: number
}

export function FilterEditor<TData extends RowData>({
  table,
  column,
  size = 'md',
  conditionIndex = 0,
}: FilterEditorProps<TData>) {
  const dataType = resolveDataType(table, column)
  const typeMeta = resolveTypeMeta(column, dataType)
  const filterValue = column.getFilterValue()
  const conditions = toConditions(filterValue, dataType)

  const operatorId = currentOperatorId(table, column, conditionIndex)
  const operator = findOperator(dataType, operatorId) ?? dataType.operators[0]!
  const operand = conditions[conditionIndex]?.value

  const { options, bounds } = useFacets(table, column, !!operator.usesFacets)

  const label = formatMessage(table.dataTableOptions.localization.filterByColumn, {
    column: getColumnLabel(column),
  })

  const setOperand = (next: unknown) => {
    const updated = [...conditions]
    updated[conditionIndex] = { op: operatorId, value: next }
    // Emptying every operand removes the filter, rather than leaving a shell
    // behind that would still count as "filtered". Note this tests for *blank*,
    // not for incomplete: a structured operand such as the geo centre is built
    // up one field at a time, and discarding it while it is half-entered would
    // make it impossible ever to finish. Incomplete conditions are skipped at
    // evaluation time instead, so rows are never hidden mid-edit.
    const allBlank = updated.every((condition) => {
      const conditionOperator = findOperator(dataType, condition.op)
      return conditionOperator?.arity !== 0 && isBlankOperand(condition.value)
    })
    column.setFilterValue(
      allBlank ? undefined : fromConditions(updated, joinOf(filterValue)),
    )
  }

  const Operand = operator.Operand ?? dataType.Operand

  return (
    <Operand
      value={operand}
      onChange={setOperand}
      operator={operator}
      table={table as never}
      column={column as never}
      options={options}
      bounds={bounds}
      size={size}
      meta={typeMeta}
      label={label}
      localization={table.dataTableOptions.localization}
    />
  )
}

/** Menu items for switching a column's operator. */
export function filterOperatorItems<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
  conditionIndex = 0,
): RtcMenuItem[] {
  const dataType = resolveDataType(table, column)
  const filterValue = column.getFilterValue()
  const conditions = toConditions(filterValue, dataType)
  const current = currentOperatorId(table, column, conditionIndex)

  return columnOperators(table, column).map((operator) => ({
    type: 'checkbox' as const,
    id: operator.id,
    checked: current === operator.id,
    label: localizedOperatorLabel(table, operator),
    onSelect: () => {
      if (conditionIndex === 0) table.setColumnFilterOperator(column.id, operator.id)
      // Operand shapes differ per operator (scalar, tuple, object), so the
      // value is reseeded rather than carried across incompatible shapes.
      const seeded = operator.initialValue?.(conditions[conditionIndex]?.value)
      const updated = [...conditions]
      updated[conditionIndex] = { op: operator.id, value: seeded }
      // An arity-0 operator ("is empty") is complete the moment it is chosen
      // and must be stored even though it carries no operand; anything else
      // waits for a value before it becomes a filter.
      const pending = operator.arity !== 0 && isBlankOperand(seeded)
      column.setFilterValue(
        pending && updated.length === 1
          ? undefined
          : fromConditions(updated, joinOf(filterValue)),
      )
    },
  }))
}

export function hasFilterOperatorChoice<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): boolean {
  const enabled =
    column.columnDef.meta?.enableFilterModes ?? table.dataTableOptions.enableFilterModes ?? true
  return enabled && columnOperators(table, column).length > 1
}

export function currentOperatorLabel<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
  conditionIndex = 0,
): string {
  const dataType = resolveDataType(table, column)
  const id = currentOperatorId(table, column, conditionIndex)
  const operator = findOperator(dataType, id)
  return operator ? localizedOperatorLabel(table, operator) : id
}

/** Human summary of a column's active filter, used by the toolbar chips. */
export function describeFilter<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): string {
  const dataType = resolveDataType(table, column)
  const typeMeta = resolveTypeMeta(column, dataType)
  const columnLabel = getColumnLabel(column)
  const conditions = toConditions(column.getFilterValue(), dataType)
  if (conditions.length === 0) return columnLabel

  const describeOne = (condition: FilterCondition) => {
    const operator = findOperator(dataType, condition.op)
    const operatorLabel = operator ? localizedOperatorLabel(table, operator) : condition.op
    const described = dataType.describe?.(condition, {
      operatorLabel,
      columnLabel,
      meta: typeMeta,
      // Presets are localised, so the summary needs the table's strings.
      presetLabels: table.dataTableOptions.localization.datePresets,
    } as never)
    return typeof described === 'string'
      ? described
      : `${columnLabel} ${operatorLabel.toLowerCase()}`
  }

  const joiner = joinOf(column.getFilterValue()) === 'or' ? ' or ' : ' and '
  return conditions.map(describeOne).join(joiner)
}

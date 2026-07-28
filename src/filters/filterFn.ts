import type { ColumnDataType, FilterCondition, FilterTypeMeta } from './types'
import { findOperator } from './registry'

/**
 * Evaluates a structured filter value against one cell.
 *
 * Kept free of React and of the table instance so it can be reused for
 * server-side previews, tests, and the single TanStack filter fn below.
 */
export function evaluateConditions(
  dataValue: unknown,
  conditions: FilterCondition[],
  join: 'and' | 'or',
  dataType: ColumnDataType,
  meta: FilterTypeMeta,
  now: Date,
): boolean {
  const active = conditions.filter((condition) => {
    const operator = findOperator(dataType, condition.op)
    if (!operator) return false
    // A half-entered condition must not hide every row while the user types.
    return !operator.isIncomplete?.(condition.value)
  })
  if (active.length === 0) return true

  const resolved = dataType.resolveDataValue
    ? dataType.resolveDataValue(dataValue, meta)
    : dataValue

  const results = active.map((condition) => {
    const operator = findOperator(dataType, condition.op)!
    const modifiers = condition.modifiers ?? {}
    const outcome = operator.test(resolved, condition.value, { modifiers, now, meta })
    return modifiers.negate ? !outcome : outcome
  })

  return join === 'or' ? results.some(Boolean) : results.every(Boolean)
}

/** Id under which the structured filter fn is registered with TanStack. */
export const STRUCTURED_FILTER_FN = 'rtcCondition'

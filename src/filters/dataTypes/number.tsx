import {
  MultiSelectOperand,
  NoOperand,
  NumberOperand,
  NumberRangeOperand,
  SliderOperand,
} from '../operands'
import type { ColumnDataType, FilterOperator } from '../types'

const toNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Comparisons drop null rows; `includeNulls` keeps them. */
const compare =
  (predicate: (data: number, operand: number) => boolean) =>
  (data: unknown, operand: unknown, ctx: { modifiers: { includeNulls?: boolean } }) => {
    const left = toNumber(data)
    const right = toNumber(operand)
    if (right == null) return true
    if (left == null) return !!ctx.modifiers.includeNulls
    return predicate(left, right)
  }

const rangeTest =
  (inclusive: boolean) =>
  (data: unknown, operand: unknown, ctx: { modifiers: { includeNulls?: boolean } }) => {
    const bounds = Array.isArray(operand) ? operand : []
    const min = toNumber(bounds[0])
    const max = toNumber(bounds[1])
    if (min == null && max == null) return true
    const left = toNumber(data)
    if (left == null) return !!ctx.modifiers.includeNulls
    if (min != null && (inclusive ? left < min : left <= min)) return false
    if (max != null && (inclusive ? left > max : left >= max)) return false
    return true
  }

const numberOperators: FilterOperator[] = [
  { id: 'equals', label: 'Equals', arity: 1, test: compare((a, b) => a === b) },
  { id: 'notEquals', label: 'Does not equal', arity: 1, test: compare((a, b) => a !== b) },
  { id: 'greaterThan', label: 'Greater than', arity: 1, test: compare((a, b) => a > b) },
  {
    id: 'greaterThanOrEqual',
    label: 'Greater than or equal to',
    arity: 1,
    test: compare((a, b) => a >= b),
  },
  { id: 'lessThan', label: 'Less than', arity: 1, test: compare((a, b) => a < b) },
  {
    id: 'lessThanOrEqual',
    label: 'Less than or equal to',
    arity: 1,
    test: compare((a, b) => a <= b),
  },
  {
    id: 'between',
    label: 'Between',
    arity: 2,
    Operand: NumberRangeOperand,
    initialValue: () => [undefined, undefined],
    isIncomplete: (operand) =>
      !Array.isArray(operand) || (toNumber(operand[0]) == null && toNumber(operand[1]) == null),
    test: rangeTest(true),
  },
  {
    id: 'betweenExclusive',
    label: 'Between (exclusive)',
    arity: 2,
    Operand: NumberRangeOperand,
    initialValue: () => [undefined, undefined],
    isIncomplete: (operand) =>
      !Array.isArray(operand) || (toNumber(operand[0]) == null && toNumber(operand[1]) == null),
    test: rangeTest(false),
  },
  {
    id: 'inRangeSlider',
    label: 'In range',
    arity: 2,
    Operand: SliderOperand,
    initialValue: () => [undefined, undefined],
    isIncomplete: (operand) => !Array.isArray(operand),
    test: rangeTest(true),
  },
  {
    id: 'isAnyOf',
    label: 'Is any of',
    arity: 'n',
    usesFacets: true,
    Operand: MultiSelectOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand) =>
      Array.isArray(operand) && operand.some((candidate) => toNumber(candidate) === toNumber(data)),
  },
  {
    id: 'isEmpty',
    label: 'Is empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toNumber(data) == null,
  },
  {
    id: 'isNotEmpty',
    label: 'Is not empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toNumber(data) != null,
  },
]

export const numberDataType: ColumnDataType = {
  id: 'number',
  operators: numberOperators,
  defaultOperator: 'between',
  Operand: NumberOperand,
  resolveDataValue: (value) => toNumber(value),
  describe: (condition, ctx) => {
    const unit = ctx.meta.unit ? ` ${ctx.meta.unit}` : ''
    if (Array.isArray(condition.value)) {
      const [min, max] = condition.value as Array<number | undefined>
      if (min != null && max != null) return `${ctx.columnLabel} ${min}–${max}${unit}`
      if (min != null) return `${ctx.columnLabel} ≥ ${min}${unit}`
      if (max != null) return `${ctx.columnLabel} ≤ ${max}${unit}`
      return ctx.columnLabel
    }
    if (condition.value == null) return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()}`
    return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${condition.value}${unit}`
  },
}

/**
 * Durations, stored as a plain number in `meta.durationUnit`.
 *
 * The operators are the numeric ones; only the operand editor differs, so the
 * user types "90 minutes" against a column stored in milliseconds.
 */
export const durationDataType: ColumnDataType = {
  ...numberDataType,
  id: 'duration',
  describe: (condition, ctx) => {
    const unit = ctx.meta.durationUnit ?? 'ms'
    if (Array.isArray(condition.value)) {
      const [min, max] = condition.value as Array<number | undefined>
      return `${ctx.columnLabel} ${min ?? '…'}–${max ?? '…'}${unit}`
    }
    return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${condition.value ?? ''}${unit}`
  },
}

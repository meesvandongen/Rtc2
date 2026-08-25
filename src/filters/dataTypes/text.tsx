import {
  CheckboxGroupOperand,
  MultiSelectOperand,
  NoOperand,
  SelectOperand,
  TextOperand,
} from '../operands'
import type { ColumnDataType, FilterOperator, FilterTestContext } from '../types'

/** Applies the case and diacritic modifiers before comparison. */
function normalize(value: unknown, ctx: FilterTestContext): string {
  let text = value == null ? '' : String(value)
  if (!ctx.modifiers.caseSensitive) text = text.toLowerCase()
  if (ctx.modifiers.ignoreDiacritics) {
    text = text.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  }
  return text
}

const isBlank = (value: unknown) => value == null || String(value).trim() === ''

const textOperators: FilterOperator[] = [
  {
    id: 'contains',
    label: 'Contains',
    arity: 1,
    test: (data, operand, ctx) => normalize(data, ctx).includes(normalize(operand, ctx)),
  },
  {
    id: 'equals',
    label: 'Equals',
    arity: 1,
    test: (data, operand, ctx) => normalize(data, ctx) === normalize(operand, ctx),
  },
  {
    id: 'startsWith',
    label: 'Starts with',
    arity: 1,
    test: (data, operand, ctx) => normalize(data, ctx).startsWith(normalize(operand, ctx)),
  },
  {
    id: 'endsWith',
    label: 'Ends with',
    arity: 1,
    test: (data, operand, ctx) => normalize(data, ctx).endsWith(normalize(operand, ctx)),
  },
  {
    id: 'matchesRegex',
    label: 'Matches regex',
    arity: 1,
    test: (data, operand, ctx) => {
      if (typeof operand !== 'string' || operand === '') return true
      try {
        // A partially-typed pattern is invalid far more often than not, so an
        // unparseable regex matches everything rather than throwing mid-keystroke.
        return new RegExp(operand, ctx.modifiers.caseSensitive ? '' : 'i').test(
          data == null ? '' : String(data),
        )
      } catch {
        return true
      }
    },
  },
  {
    id: 'isAnyOf',
    label: 'Is any of',
    arity: 'n',
    usesFacets: true,
    Operand: MultiSelectOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand, ctx) =>
      Array.isArray(operand) &&
      operand.some((candidate) => normalize(candidate, ctx) === normalize(data, ctx)),
  },
  {
    id: 'isOneOfChecklist',
    label: 'Is any of (checklist)',
    arity: 'n',
    usesFacets: true,
    Operand: CheckboxGroupOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand, ctx) =>
      Array.isArray(operand) &&
      operand.some((candidate) => normalize(candidate, ctx) === normalize(data, ctx)),
  },
  {
    id: 'isEmpty',
    label: 'Is empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => isBlank(data),
  },
  {
    id: 'isNotEmpty',
    label: 'Is not empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => !isBlank(data),
  },
]

export const textDataType: ColumnDataType = {
  id: 'text',
  operators: textOperators,
  defaultOperator: 'contains',
  Operand: TextOperand,
  describe: (condition, ctx) => {
    const { value } = condition
    if (condition.op === 'isEmpty' || condition.op === 'isNotEmpty') {
      return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()}`
    }
    const shown = Array.isArray(value) ? value.join(', ') : String(value ?? '')
    return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} "${shown}"`
  },
}

/**
 * Single-choice enumerations.
 *
 * Split from `text` because the sensible default is picking a known value, not
 * substring matching, and the operator list is correspondingly shorter.
 */
export const enumDataType: ColumnDataType = {
  ...textDataType,
  id: 'enum',
  defaultOperator: 'equals',
  operators: [
    // `equals` against a faceted value, so the default operand becomes a
    // picker rather than a free-text box. Picking a known value reads as "is"
    // rather than "equals"; the label here is the fallback, and the displayed
    // string comes from `localization.filterOperators['enum.equals']`.
    { ...textOperators.find((operator) => operator.id === 'equals')!, label: 'Is', usesFacets: true },
    ...textOperators.filter((operator) =>
      ['isAnyOf', 'isOneOfChecklist', 'isEmpty', 'isNotEmpty'].includes(operator.id),
    ),
  ],
  Operand: SelectOperand,
}

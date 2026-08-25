import { useComponents } from '../../components/registry'
import { NoOperand } from '../operands'
import type { ColumnDataType, FilterOperandProps, FilterOperator } from '../types'

const toBool = (value: unknown): boolean | null => {
  if (value == null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value).trim().toLowerCase()
  if (['true', 'yes', '1', 'y'].includes(text)) return true
  if (['false', 'no', '0', 'n'].includes(text)) return false
  return null
}

function BooleanOperand({ value, onChange, size, label, localization }: FilterOperandProps) {
  const ui = useComponents()
  return (
    <ui.Select
      size={size}
      label={label}
      value={value === true ? 'true' : value === false ? 'false' : ''}
      placeholder={localization.showAll}
      options={[
        { value: 'true', label: localization.booleanTrue },
        { value: 'false', label: localization.booleanFalse },
      ]}
      onChange={(next) => onChange(next === '' ? undefined : next === 'true')}
      dataAttributes={{ 'data-rtc-operand': 'boolean' }}
    />
  )
}

const booleanOperators: FilterOperator[] = [
  {
    id: 'booleanIs',
    label: 'Is',
    arity: 1,
    isIncomplete: (operand) => typeof operand !== 'boolean',
    test: (data, operand, ctx) => {
      if (typeof operand !== 'boolean') return true
      const left = toBool(data)
      if (left == null) return !!ctx.modifiers.includeNulls
      return left === operand
    },
  },
  {
    id: 'isEmpty',
    label: 'Is empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toBool(data) == null,
  },
  {
    id: 'isNotEmpty',
    label: 'Is not empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toBool(data) != null,
  },
]

export const booleanDataType: ColumnDataType = {
  id: 'boolean',
  operators: booleanOperators,
  defaultOperator: 'booleanIs',
  Operand: BooleanOperand,
  resolveDataValue: (value) => toBool(value),
  describe: (condition, ctx) =>
    typeof condition.value === 'boolean'
      ? // The chip has to read like the picker the user chose from, so this
        // spells out the localized yes/no rather than stringifying the boolean.
        `${ctx.columnLabel}: ${
          condition.value ? ctx.localization.booleanTrue : ctx.localization.booleanFalse
        }`
      : `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()}`,
}

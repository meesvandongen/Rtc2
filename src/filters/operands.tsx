import { useComponents } from '../components/registry'
import type { FilterOperandProps } from './types'

/**
 * Operand editors shared across data types.
 *
 * Each one renders through the component registry, so a host design system's
 * inputs are used here exactly as they are elsewhere in the table.
 */

export function NoOperand() {
  return null
}

export function TextOperand({ value, onChange, size, label }: FilterOperandProps) {
  const ui = useComponents()
  return (
    <ui.TextInput
      size={size}
      label={label}
      placeholder={label}
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
      dataAttributes={{ 'data-rtc-operand': 'text' }}
    />
  )
}

export function NumberOperand({ value, onChange, size, label, meta }: FilterOperandProps) {
  const ui = useComponents()
  return (
    <ui.NumberInput
      size={size}
      label={label}
      placeholder={meta.unit ? `${label} (${meta.unit})` : label}
      value={typeof value === 'number' ? value : undefined}
      onChange={onChange}
      dataAttributes={{ 'data-rtc-operand': 'number' }}
    />
  )
}

/** Two numeric operands, stored as a `[min, max]` tuple. */
export function NumberRangeOperand({
  value,
  onChange,
  size,
  label,
  localization,
}: FilterOperandProps) {
  const ui = useComponents()
  const range = Array.isArray(value) ? (value as Array<number | undefined>) : []

  const set = (index: 0 | 1, next: number | undefined) => {
    const updated: Array<number | undefined> = [range[0], range[1]]
    updated[index] = next
    onChange(updated)
  }

  return (
    <div className="rtc-filter-range">
      <ui.NumberInput
        size={size}
        label={`${label} ${localization.min}`}
        placeholder={localization.min}
        value={range[0]}
        onChange={(next) => set(0, next)}
      />
      <ui.NumberInput
        size={size}
        label={`${label} ${localization.max}`}
        placeholder={localization.max}
        value={range[1]}
        onChange={(next) => set(1, next)}
      />
    </div>
  )
}

/** Dual-thumb slider bounded by the column's faceted min/max. */
export function SliderOperand({ value, onChange, bounds, label }: FilterOperandProps) {
  const ui = useComponents()
  const min = bounds?.[0] ?? 0
  const max = bounds?.[1] ?? 100
  const range = Array.isArray(value) ? (value as Array<number | undefined>) : []
  return (
    <ui.RangeSlider
      label={label}
      min={min}
      max={max}
      value={[range[0] ?? min, range[1] ?? max]}
      onChange={(next) => onChange(next)}
    />
  )
}

export function SelectOperand({
  value,
  onChange,
  options,
  size,
  label,
  localization,
}: FilterOperandProps) {
  const ui = useComponents()
  return (
    <ui.Select
      size={size}
      label={label}
      value={typeof value === 'string' ? value : ''}
      placeholder={localization.showAll}
      options={options}
      onChange={(next) => onChange(next || undefined)}
      dataAttributes={{ 'data-rtc-operand': 'select' }}
    />
  )
}

export function MultiSelectOperand({ value, onChange, options, size, label }: FilterOperandProps) {
  const ui = useComponents()
  return (
    <ui.MultiSelect
      size={size}
      label={label}
      value={Array.isArray(value) ? (value as string[]) : []}
      options={options}
      onChange={(next) => onChange(next.length > 0 ? next : undefined)}
    />
  )
}

/** Faceted values as a wrapping set of toggles, for short domains. */
export function CheckboxGroupOperand({ value, onChange, options, label }: FilterOperandProps) {
  const ui = useComponents()
  const selected = Array.isArray(value) ? (value as string[]) : []
  return (
    <div className="rtc-filter-checkboxes" role="group" aria-label={label}>
      {options.map((option) => {
        const checked = selected.includes(option.value)
        return (
          <label key={option.value} className="rtc-filter-chip" data-rtc-active={checked}>
            <ui.Checkbox
              checked={checked}
              label={option.label}
              onChange={() => {
                const next = checked
                  ? selected.filter((item) => item !== option.value)
                  : [...selected, option.value]
                onChange(next.length > 0 ? next : undefined)
              }}
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

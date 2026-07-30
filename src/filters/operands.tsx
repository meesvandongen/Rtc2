import { useEffect, useRef, useState } from 'react'

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

/**
 * Dual-thumb slider bounded by the column's faceted min/max.
 *
 * The thumbs are local state and the filter is updated on a short delay, the
 * same shape as the global search field: dragging is a stream of events, and
 * the table is far too expensive to re-filter on each one.
 *
 * The cost of getting this wrong is not a dropped frame. React counts a commit
 * that ends with sync-, continuous- or default-lane work *already queued* as a
 * nested update, and throws "Maximum update depth exceeded" (error 185) on the
 * fifty-first in an unbroken row. One filter update never settles in a single
 * commit here: measured against one applied filter and quiesced, the run is
 * three commits, only the last of which leaves the queue empty. Under a long
 * drag that last commit stops being reached and the count climbs to the limit —
 * observed at move 759 of a sustained drag with pagination disabled.
 *
 * Committing on a delay leaves the queue time to drain: the same drag peaks at
 * a nesting depth of 2. It also drops the per-drag work from a table-wide
 * re-filter per pointer move to one, which is the reason to do it anyway.
 */
export function SliderOperand({ value, onChange, bounds, label }: FilterOperandProps) {
  const ui = useComponents()
  const min = bounds?.[0] ?? 0
  const max = bounds?.[1] ?? 100
  const range = Array.isArray(value) ? (value as Array<number | undefined>) : []
  const low = range[0] ?? min
  const high = range[1] ?? max

  const [draft, setDraft] = useState<[number, number]>([low, high])
  // Read through a ref: the operand's `onChange` is rebuilt on every render of
  // the editor, and depending on it would restart the timer before it fires.
  const commitRef = useRef(onChange)
  commitRef.current = onChange

  useEffect(() => {
    setDraft((previous) => (previous[0] === low && previous[1] === high ? previous : [low, high]))
  }, [low, high])

  useEffect(() => {
    if (draft[0] === low && draft[1] === high) return
    const timer = setTimeout(() => commitRef.current(draft), 150)
    return () => clearTimeout(timer)
  }, [draft, low, high])

  return <ui.RangeSlider label={label} min={min} max={max} value={draft} onChange={setDraft} />
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

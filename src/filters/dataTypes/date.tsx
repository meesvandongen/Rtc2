import { useComponents } from '../../components/registry'
import { NoOperand } from '../operands'
import {
  DATE_PRESETS,
  dayOfWeek,
  fromInputValue,
  lastNInterval,
  minutesOfDay,
  nextNInterval,
  parseTimeOfDay,
  presetInterval,
  startOf,
  toEpoch,
  toInputValue,
  type DatePresetId,
  type DateUnit,
} from '../temporal'
import type {
  ColumnDataType,
  DescribeContext,
  FilterCondition,
  FilterOperandProps,
  FilterOperator,
  FilterTestContext,
} from '../types'

/**
 * Temporal filtering.
 *
 * This is the type that motivated the whole data-type model. A date column
 * genuinely needs several unrelated operand shapes — a single date, two dates,
 * a named period, a rolling window, a set of weekdays, a time-of-day band —
 * and the flat `filterVariant` enum could express exactly one of them.
 *
 * Every comparison truncates to `meta.dateGranularity` (default `day` for
 * dates, `minute` for date-times) so that "on 3 March" matches a row stored at
 * 14:37 on 3 March, which is what people mean.
 */

const RELATIVE_UNITS: DateUnit[] = ['day', 'week', 'month', 'quarter', 'year']

function granularity(ctx: FilterTestContext): DateUnit {
  return (ctx.meta.dateGranularity as DateUnit | undefined) ?? 'day'
}

/** Truncated comparison against a single operand date. */
function compareAt(
  data: unknown,
  operand: unknown,
  ctx: FilterTestContext,
  predicate: (left: number, right: number) => boolean,
): boolean {
  const right = typeof operand === 'number' ? operand : toEpoch(operand)
  if (right == null) return true
  const left = toEpoch(data)
  if (left == null) return !!ctx.modifiers.includeNulls
  const unit = granularity(ctx)
  return predicate(startOf(left, unit, ctx.meta), startOf(right, unit, ctx.meta))
}

/** Half-open interval membership, `[start, end)`. */
function inInterval(data: unknown, ctx: FilterTestContext, start: number, end: number): boolean {
  const left = toEpoch(data)
  if (left == null) return !!ctx.modifiers.includeNulls
  return left >= start && left < end
}

// ------------------------------------------------------------- operands ----

function DateOperandInput({
  value,
  onChange,
  size,
  label,
  meta,
}: FilterOperandProps & { withTime?: boolean }) {
  const ui = useComponents()
  const withTime = meta.dateGranularity != null && meta.dateGranularity !== 'day'
  const epoch = typeof value === 'number' ? value : toEpoch(value)
  return (
    <ui.TextInput
      type={withTime ? 'datetime-local' : 'date'}
      size={size}
      label={label}
      value={toInputValue(epoch, withTime, meta)}
      onChange={(next) => onChange(fromInputValue(next, meta) ?? undefined)}
      dataAttributes={{ 'data-rtc-operand': 'date' }}
    />
  )
}

function DateRangeOperand({
  value,
  onChange,
  size,
  label,
  meta,
  localization,
}: FilterOperandProps) {
  const ui = useComponents()
  const withTime = meta.dateGranularity != null && meta.dateGranularity !== 'day'
  const range = Array.isArray(value) ? (value as Array<number | undefined>) : []

  const set = (index: 0 | 1, next: string) => {
    const updated: Array<number | undefined> = [range[0], range[1]]
    updated[index] = fromInputValue(next, meta) ?? undefined
    onChange(updated)
  }

  return (
    <div className="rtc-filter-stack">
      <ui.TextInput
        type={withTime ? 'datetime-local' : 'date'}
        size={size}
        label={`${label} ${localization.from}`}
        value={toInputValue(range[0] ?? null, withTime, meta)}
        onChange={(next) => set(0, next)}
        dataAttributes={{ 'data-rtc-operand': 'date-from' }}
      />
      <ui.TextInput
        type={withTime ? 'datetime-local' : 'date'}
        size={size}
        label={`${label} ${localization.to}`}
        value={toInputValue(range[1] ?? null, withTime, meta)}
        onChange={(next) => set(1, next)}
        dataAttributes={{ 'data-rtc-operand': 'date-to' }}
      />
    </div>
  )
}

function PresetOperand({ value, onChange, size, label, localization }: FilterOperandProps) {
  const ui = useComponents()
  return (
    <ui.Select
      size={size}
      label={label}
      value={typeof value === 'string' ? value : ''}
      placeholder={localization.selectPeriod}
      options={DATE_PRESETS.map((preset) => ({
        value: preset,
        label: localization.datePresets[preset] ?? preset,
      }))}
      onChange={(next) => onChange(next || undefined)}
      dataAttributes={{ 'data-rtc-operand': 'preset' }}
    />
  )
}

/** `{ n, unit }` — a rolling window such as "in the last 3 weeks". */
function RollingOperand({ value, onChange, size, label, localization }: FilterOperandProps) {
  const ui = useComponents()
  const current = (value ?? {}) as { n?: number; unit?: DateUnit }
  return (
    <div className="rtc-filter-range">
      <ui.NumberInput
        size={size}
        label={`${label} ${localization.amount}`}
        value={current.n}
        min={1}
        onChange={(n) => onChange({ ...current, n })}
        dataAttributes={{ 'data-rtc-operand': 'rolling-n' }}
      />
      <ui.Select
        size={size}
        label={`${label} ${localization.unit}`}
        value={current.unit ?? 'day'}
        options={RELATIVE_UNITS.map((unit) => ({
          value: unit,
          label: localization.dateUnits[unit] ?? unit,
        }))}
        onChange={(unit) => onChange({ ...current, unit: unit as DateUnit })}
      />
    </div>
  )
}

function WeekdayOperand({ value, onChange, label, localization }: FilterOperandProps) {
  const ui = useComponents()
  const selected = Array.isArray(value) ? (value as number[]) : []
  return (
    <div className="rtc-filter-checkboxes" role="group" aria-label={label}>
      {localization.weekdays.map((name, index) => {
        const checked = selected.includes(index)
        return (
          <label key={name} className="rtc-filter-chip" data-rtc-active={checked}>
            <ui.Checkbox
              checked={checked}
              label={name}
              onChange={() => {
                const next = checked
                  ? selected.filter((day) => day !== index)
                  : [...selected, index]
                onChange(next.length > 0 ? next : undefined)
              }}
            />
            {name}
          </label>
        )
      })}
    </div>
  )
}

/** Two `HH:MM` values, matched against every row's time regardless of date. */
function TimeOfDayOperand({ value, onChange, size, label, localization }: FilterOperandProps) {
  const ui = useComponents()
  const range = Array.isArray(value) ? (value as Array<string | undefined>) : []
  const set = (index: 0 | 1, next: string) => {
    const updated: Array<string | undefined> = [range[0], range[1]]
    updated[index] = next || undefined
    onChange(updated)
  }
  return (
    <div className="rtc-filter-range">
      <ui.TextInput
        type="time"
        size={size}
        label={`${label} ${localization.from}`}
        placeholder="09:00"
        value={range[0] ?? ''}
        onChange={(next) => set(0, next)}
      />
      <ui.TextInput
        type="time"
        size={size}
        label={`${label} ${localization.to}`}
        placeholder="17:00"
        value={range[1] ?? ''}
        onChange={(next) => set(1, next)}
      />
    </div>
  )
}

// ------------------------------------------------------------ operators ----

const dateOperators: FilterOperator[] = [
  {
    id: 'dateIs',
    label: 'Is on',
    arity: 1,
    test: (data, operand, ctx) => compareAt(data, operand, ctx, (a, b) => a === b),
  },
  {
    id: 'dateBefore',
    label: 'Is before',
    arity: 1,
    test: (data, operand, ctx) => compareAt(data, operand, ctx, (a, b) => a < b),
  },
  {
    id: 'dateOnOrBefore',
    label: 'Is on or before',
    arity: 1,
    test: (data, operand, ctx) => compareAt(data, operand, ctx, (a, b) => a <= b),
  },
  {
    id: 'dateAfter',
    label: 'Is after',
    arity: 1,
    test: (data, operand, ctx) => compareAt(data, operand, ctx, (a, b) => a > b),
  },
  {
    id: 'dateOnOrAfter',
    label: 'Is on or after',
    arity: 1,
    test: (data, operand, ctx) => compareAt(data, operand, ctx, (a, b) => a >= b),
  },
  {
    id: 'dateBetween',
    label: 'Is between',
    arity: 2,
    Operand: DateRangeOperand,
    initialValue: () => [undefined, undefined],
    isIncomplete: (operand) =>
      !Array.isArray(operand) || (operand[0] == null && operand[1] == null),
    test: (data, operand, ctx) => {
      const bounds = Array.isArray(operand) ? operand : []
      const from = typeof bounds[0] === 'number' ? bounds[0] : toEpoch(bounds[0])
      const to = typeof bounds[1] === 'number' ? bounds[1] : toEpoch(bounds[1])
      const left = toEpoch(data)
      if (left == null) return !!ctx.modifiers.includeNulls
      const unit = granularity(ctx)
      const at = startOf(left, unit, ctx.meta)
      if (from != null && at < startOf(from, unit, ctx.meta)) return false
      // Inclusive of the end date's whole unit, so "to 3 March" includes it.
      if (to != null && at > startOf(to, unit, ctx.meta)) return false
      return true
    },
  },
  {
    id: 'dateInPeriod',
    label: 'Is in period',
    arity: 1,
    Operand: PresetOperand,
    isIncomplete: (operand) => typeof operand !== 'string' || operand === '',
    test: (data, operand, ctx) => {
      if (typeof operand !== 'string') return true
      const interval = presetInterval(operand as DatePresetId, ctx.now, ctx.meta)
      return inInterval(data, ctx, interval.start, interval.end)
    },
  },
  {
    id: 'dateInLast',
    label: 'Is in the last',
    arity: 1,
    Operand: RollingOperand,
    initialValue: () => ({ n: 7, unit: 'day' as DateUnit }),
    isIncomplete: (operand) => !operand || typeof (operand as any).n !== 'number',
    test: (data, operand, ctx) => {
      const { n, unit } = (operand ?? {}) as { n?: number; unit?: DateUnit }
      if (typeof n !== 'number') return true
      const interval = lastNInterval(n, unit ?? 'day', ctx.now, ctx.meta)
      return inInterval(data, ctx, interval.start, interval.end)
    },
  },
  {
    id: 'dateInNext',
    label: 'Is in the next',
    arity: 1,
    Operand: RollingOperand,
    initialValue: () => ({ n: 7, unit: 'day' as DateUnit }),
    isIncomplete: (operand) => !operand || typeof (operand as any).n !== 'number',
    test: (data, operand, ctx) => {
      const { n, unit } = (operand ?? {}) as { n?: number; unit?: DateUnit }
      if (typeof n !== 'number') return true
      const interval = nextNInterval(n, unit ?? 'day', ctx.now, ctx.meta)
      return inInterval(data, ctx, interval.start, interval.end)
    },
  },
  {
    id: 'dateWeekdayIs',
    label: 'Day of week is',
    arity: 'n',
    Operand: WeekdayOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand, ctx) => {
      if (!Array.isArray(operand) || operand.length === 0) return true
      const left = toEpoch(data)
      if (left == null) return !!ctx.modifiers.includeNulls
      return operand.includes(dayOfWeek(left, ctx.meta))
    },
  },
  {
    id: 'dateTimeOfDayBetween',
    label: 'Time of day between',
    arity: 2,
    Operand: TimeOfDayOperand,
    initialValue: () => [undefined, undefined],
    isIncomplete: (operand) =>
      !Array.isArray(operand) ||
      (parseTimeOfDay(operand[0]) == null && parseTimeOfDay(operand[1]) == null),
    test: (data, operand, ctx) => {
      const bounds = Array.isArray(operand) ? operand : []
      const from = parseTimeOfDay(bounds[0])
      const to = parseTimeOfDay(bounds[1])
      if (from == null && to == null) return true
      const left = toEpoch(data)
      if (left == null) return !!ctx.modifiers.includeNulls
      const minutes = minutesOfDay(left, ctx.meta)
      // A window that wraps midnight (22:00–02:00) is a union, not a range.
      if (from != null && to != null && from > to) return minutes >= from || minutes <= to
      if (from != null && minutes < from) return false
      if (to != null && minutes > to) return false
      return true
    },
  },
  {
    id: 'isEmpty',
    label: 'Is empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toEpoch(data) == null,
  },
  {
    id: 'isNotEmpty',
    label: 'Is not empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toEpoch(data) != null,
  },
]

function describeDate(condition: FilterCondition, ctx: DescribeContext) {
  const { op, value } = condition
  if (op === 'dateInPeriod' && typeof value === 'string') {
    return `${ctx.columnLabel}: ${ctx.localization.datePresets[value] ?? value}`
  }
  if ((op === 'dateInLast' || op === 'dateInNext') && value) {
    const { n, unit } = value as { n?: number; unit?: DateUnit }
    const unitLabel = unit ? (ctx.localization.dateUnits[unit] ?? unit) : ''
    return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${n} ${unitLabel}`.trimEnd()
  }
  if (Array.isArray(value)) {
    const format = (entry: unknown) =>
      typeof entry === 'number' ? toInputValue(entry, false, ctx.meta) : (entry ?? '…')
    return `${ctx.columnLabel} ${format(value[0])} – ${format(value[1])}`
  }
  if (value == null) return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()}`
  return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${
    typeof value === 'number' ? toInputValue(value, false, ctx.meta) : value
  }`
}

export const dateDataType: ColumnDataType = {
  id: 'date',
  operators: dateOperators,
  defaultOperator: 'dateBetween',
  Operand: DateOperandInput,
  resolveDataValue: (value) => toEpoch(value),
  describe: describeDate,
}

/**
 * Date-times differ from dates only in default granularity — minute rather
 * than day — which is exactly the distinction the flat variant list could not
 * express.
 *
 * "Is on" becomes "Is at", because a timestamp happens at a moment rather than
 * on a day. The label here is only the fallback: the displayed string comes
 * from `localization.filterOperators['datetime.dateIs']`, which is how a
 * translated table keeps the distinction.
 */
export const dateTimeDataType: ColumnDataType = {
  ...dateDataType,
  id: 'datetime',
  operators: dateOperators.map((operator) =>
    operator.id === 'dateIs' ? { ...operator, label: 'Is at' } : operator,
  ),
}

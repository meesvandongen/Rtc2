import type { FilterTypeMeta } from './types'

/**
 * Date arithmetic for the temporal data types.
 *
 * Deliberately dependency-free and built on the platform `Date`. Two things
 * are handled explicitly rather than left to chance:
 *
 * - **Granularity.** "On 3 March" must match every instant during that day, so
 *   comparisons truncate both sides to the column's granularity instead of
 *   comparing raw timestamps. This is what makes `is`, `before` and `between`
 *   behave the way people expect on a date column that actually stores times.
 * - **Timezone.** Truncation happens in the viewer's zone by default, or in UTC
 *   when the column asks for it. Full IANA zone support would need a data
 *   dependency; `local` and `utc` cover the cases where getting it wrong
 *   silently shifts rows across a day boundary.
 */

export type DateUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second'

export type DatePresetId =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'thisWeek'
  | 'lastWeek'
  | 'nextWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'nextMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'yearToDate'

export const DATE_PRESETS: DatePresetId[] = [
  'today',
  'yesterday',
  'tomorrow',
  'thisWeek',
  'lastWeek',
  'nextWeek',
  'thisMonth',
  'lastMonth',
  'nextMonth',
  'thisQuarter',
  'lastQuarter',
  'thisYear',
  'lastYear',
  'yearToDate',
]

/** A half-open interval `[start, end)` in epoch milliseconds. */
export interface Interval {
  start: number
  end: number
}

const MS = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 } as const

function isUtc(meta: FilterTypeMeta): boolean {
  return meta.dateTimeZone === 'utc'
}

/** Parses whatever a cell might hold into epoch ms, or `null`. */
export function toEpoch(value: unknown): number | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

/** Start of the containing unit, in the configured zone. */
export function startOf(epoch: number, unit: DateUnit, meta: FilterTypeMeta): number {
  const utc = isUtc(meta)
  const date = new Date(epoch)

  const get = {
    year: () => (utc ? date.getUTCFullYear() : date.getFullYear()),
    month: () => (utc ? date.getUTCMonth() : date.getMonth()),
    day: () => (utc ? date.getUTCDate() : date.getDate()),
    weekday: () => (utc ? date.getUTCDay() : date.getDay()),
    hour: () => (utc ? date.getUTCHours() : date.getHours()),
    minute: () => (utc ? date.getUTCMinutes() : date.getMinutes()),
    second: () => (utc ? date.getUTCSeconds() : date.getSeconds()),
  }

  const build = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
    utc ? Date.UTC(y, mo, d, h, mi, s, 0) : new Date(y, mo, d, h, mi, s, 0).getTime()

  switch (unit) {
    case 'year':
      return build(get.year(), 0, 1)
    case 'quarter':
      return build(get.year(), Math.floor(get.month() / 3) * 3, 1)
    case 'month':
      return build(get.year(), get.month(), 1)
    case 'week': {
      // ISO weeks start on Monday.
      const offset = (get.weekday() + 6) % 7
      return build(get.year(), get.month(), get.day() - offset)
    }
    case 'day':
      return build(get.year(), get.month(), get.day())
    case 'hour':
      return build(get.year(), get.month(), get.day(), get.hour())
    case 'minute':
      return build(get.year(), get.month(), get.day(), get.hour(), get.minute())
    case 'second':
      return build(get.year(), get.month(), get.day(), get.hour(), get.minute(), get.second())
  }
}

/** Start of the unit immediately after the one containing `epoch`. */
export function endOf(epoch: number, unit: DateUnit, meta: FilterTypeMeta): number {
  return addUnits(startOf(epoch, unit, meta), 1, unit, meta)
}

export function addUnits(
  epoch: number,
  amount: number,
  unit: DateUnit,
  meta: FilterTypeMeta,
): number {
  const utc = isUtc(meta)
  const date = new Date(epoch)

  if (unit === 'year' || unit === 'quarter' || unit === 'month') {
    const months = unit === 'year' ? amount * 12 : unit === 'quarter' ? amount * 3 : amount
    if (utc) {
      const next = new Date(epoch)
      next.setUTCMonth(next.getUTCMonth() + months)
      return next.getTime()
    }
    const next = new Date(epoch)
    next.setMonth(next.getMonth() + months)
    return next.getTime()
  }

  // Day-and-below arithmetic on a fixed millisecond grid would drift across a
  // DST boundary in local mode, so days go through the calendar instead.
  if (unit === 'day' || unit === 'week') {
    const days = unit === 'week' ? amount * 7 : amount
    if (utc) {
      const next = new Date(epoch)
      next.setUTCDate(next.getUTCDate() + days)
      return next.getTime()
    }
    const next = new Date(epoch)
    next.setDate(next.getDate() + days)
    return next.getTime()
  }

  void date
  return epoch + amount * MS[unit]
}

/** The interval a named preset covers, relative to `now`. */
export function presetInterval(
  preset: DatePresetId,
  now: Date,
  meta: FilterTypeMeta,
): Interval {
  const t = now.getTime()
  const span = (unit: DateUnit, offset: number): Interval => {
    const start = addUnits(startOf(t, unit, meta), offset, unit, meta)
    return { start, end: addUnits(start, 1, unit, meta) }
  }

  switch (preset) {
    case 'today':
      return span('day', 0)
    case 'yesterday':
      return span('day', -1)
    case 'tomorrow':
      return span('day', 1)
    case 'thisWeek':
      return span('week', 0)
    case 'lastWeek':
      return span('week', -1)
    case 'nextWeek':
      return span('week', 1)
    case 'thisMonth':
      return span('month', 0)
    case 'lastMonth':
      return span('month', -1)
    case 'nextMonth':
      return span('month', 1)
    case 'thisQuarter':
      return span('quarter', 0)
    case 'lastQuarter':
      return span('quarter', -1)
    case 'thisYear':
      return span('year', 0)
    case 'lastYear':
      return span('year', -1)
    case 'yearToDate':
      return { start: startOf(t, 'year', meta), end: endOf(t, 'day', meta) }
  }
}

/** `[now - n units, now)`, aligned to the unit boundary. */
export function lastNInterval(
  n: number,
  unit: DateUnit,
  now: Date,
  meta: FilterTypeMeta,
): Interval {
  const end = endOf(now.getTime(), unit, meta)
  return { start: addUnits(end, -n, unit, meta), end }
}

/** `[now, now + n units)`, aligned to the unit boundary. */
export function nextNInterval(
  n: number,
  unit: DateUnit,
  now: Date,
  meta: FilterTypeMeta,
): Interval {
  const start = startOf(now.getTime(), unit, meta)
  return { start, end: addUnits(start, n, unit, meta) }
}

/** Minutes since midnight, in the configured zone. */
export function minutesOfDay(epoch: number, meta: FilterTypeMeta): number {
  const date = new Date(epoch)
  return isUtc(meta)
    ? date.getUTCHours() * 60 + date.getUTCMinutes()
    : date.getHours() * 60 + date.getMinutes()
}

/** Day of week, 0 = Sunday, in the configured zone. */
export function dayOfWeek(epoch: number, meta: FilterTypeMeta): number {
  const date = new Date(epoch)
  return isUtc(meta) ? date.getUTCDay() : date.getDay()
}

/** Parses `HH:MM` into minutes since midnight. */
export function parseTimeOfDay(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Formats an epoch for a `date` or `datetime-local` input.
 *
 * `toISOString` is always UTC, which would shift the displayed value for a
 * local-zone column, so the parts are assembled explicitly.
 */
export function toInputValue(
  epoch: number | null,
  withTime: boolean,
  meta: FilterTypeMeta,
): string {
  if (epoch == null) return ''
  const date = new Date(epoch)
  const utc = isUtc(meta)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = utc ? date.getUTCFullYear() : date.getFullYear()
  const mo = pad((utc ? date.getUTCMonth() : date.getMonth()) + 1)
  const d = pad(utc ? date.getUTCDate() : date.getDate())
  if (!withTime) return `${y}-${mo}-${d}`
  const h = pad(utc ? date.getUTCHours() : date.getHours())
  const mi = pad(utc ? date.getUTCMinutes() : date.getMinutes())
  return `${y}-${mo}-${d}T${h}:${mi}`
}

/** Parses a `date` / `datetime-local` input value in the configured zone. */
export function fromInputValue(value: string, meta: FilterTypeMeta): number | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value)
  if (!match) return toEpoch(value)
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match
  const parts = [Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)] as const
  return isUtc(meta)
    ? Date.UTC(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5])
    : new Date(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]).getTime()
}

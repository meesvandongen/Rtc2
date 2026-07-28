import { useComponents } from '../../components/registry'
import { MultiSelectOperand, NoOperand, NumberOperand } from '../operands'
import type { ColumnDataType, FilterOperandProps, FilterOperator } from '../types'

/**
 * Columns whose cell is itself a list — tags, roles, labels.
 *
 * Distinct from `enum` because "contains any of" and "contains all of" are
 * different questions once the *cell* holds several values, and neither is
 * expressible with the scalar operators.
 */

const toArray = (value: unknown): string[] => {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((entry) => String(entry))
  return [String(value)]
}

const collectionOperators: FilterOperator[] = [
  {
    id: 'containsAnyOf',
    label: 'Contains any of',
    arity: 'n',
    usesFacets: true,
    Operand: MultiSelectOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand) => {
      const wanted = toArray(operand)
      if (wanted.length === 0) return true
      const have = toArray(data)
      return wanted.some((entry) => have.includes(entry))
    },
  },
  {
    id: 'containsAllOf',
    label: 'Contains all of',
    arity: 'n',
    usesFacets: true,
    Operand: MultiSelectOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand) => {
      const wanted = toArray(operand)
      if (wanted.length === 0) return true
      const have = toArray(data)
      return wanted.every((entry) => have.includes(entry))
    },
  },
  {
    id: 'containsNoneOf',
    label: 'Contains none of',
    arity: 'n',
    usesFacets: true,
    Operand: MultiSelectOperand,
    initialValue: () => [],
    isIncomplete: (operand) => !Array.isArray(operand) || operand.length === 0,
    test: (data, operand) => {
      const wanted = toArray(operand)
      if (wanted.length === 0) return true
      const have = toArray(data)
      return !wanted.some((entry) => have.includes(entry))
    },
  },
  {
    id: 'countEquals',
    label: 'Item count equals',
    arity: 1,
    Operand: NumberOperand,
    isIncomplete: (operand) => typeof operand !== 'number',
    test: (data, operand) =>
      typeof operand !== 'number' || toArray(data).length === operand,
  },
  {
    id: 'countAtLeast',
    label: 'Item count at least',
    arity: 1,
    Operand: NumberOperand,
    isIncomplete: (operand) => typeof operand !== 'number',
    test: (data, operand) =>
      typeof operand !== 'number' || toArray(data).length >= operand,
  },
  {
    id: 'isEmpty',
    label: 'Is empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toArray(data).length === 0,
  },
  {
    id: 'isNotEmpty',
    label: 'Is not empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toArray(data).length > 0,
  },
]

export const collectionDataType: ColumnDataType = {
  id: 'collection',
  operators: collectionOperators,
  defaultOperator: 'containsAnyOf',
  Operand: MultiSelectOperand,
  describe: (condition, ctx) => {
    if (Array.isArray(condition.value)) {
      return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${condition.value.join(', ')}`
    }
    return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()} ${condition.value ?? ''}`
  },
}

// ------------------------------------------------------------------ geo ----

export interface GeoPoint {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

function toPoint(value: unknown): GeoPoint | null {
  if (value == null) return null
  if (Array.isArray(value) && value.length >= 2) {
    const [lat, lng] = value.map(Number)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat!, lng: lng! } : null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const lat = Number(record.lat ?? record.latitude)
    const lng = Number(record.lng ?? record.lon ?? record.longitude)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }
  if (typeof value === 'string') {
    const parts = value.split(',').map((entry) => Number(entry.trim()))
    return parts.length === 2 && parts.every(Number.isFinite)
      ? { lat: parts[0]!, lng: parts[1]! }
      : null
  }
  return null
}

/** Great-circle distance in kilometres. */
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function RadiusOperand({ value, onChange, size, label, localization }: FilterOperandProps) {
  const ui = useComponents()
  const current = (value ?? {}) as { lat?: number; lng?: number; km?: number }
  return (
    <div className="rtc-filter-stack">
      <div className="rtc-filter-range">
        <ui.NumberInput
          size={size}
          label={`${label} ${localization.latitude}`}
          placeholder={localization.latitude}
          value={current.lat}
          onChange={(lat) => onChange({ ...current, lat })}
          dataAttributes={{ 'data-rtc-operand': 'geo-lat' }}
        />
        <ui.NumberInput
          size={size}
          label={`${label} ${localization.longitude}`}
          placeholder={localization.longitude}
          value={current.lng}
          onChange={(lng) => onChange({ ...current, lng })}
          dataAttributes={{ 'data-rtc-operand': 'geo-lng' }}
        />
      </div>
      <ui.NumberInput
        size={size}
        label={`${label} ${localization.radiusKm}`}
        placeholder={localization.radiusKm}
        value={current.km}
        min={0}
        onChange={(km) => onChange({ ...current, km })}
        dataAttributes={{ 'data-rtc-operand': 'geo-radius' }}
      />
    </div>
  )
}

function BoundingBoxOperand({
  value,
  onChange,
  size,
  label,
  localization,
}: FilterOperandProps) {
  const ui = useComponents()
  const box = (value ?? {}) as { north?: number; south?: number; east?: number; west?: number }
  const field = (key: 'north' | 'south' | 'east' | 'west') => (
    <ui.NumberInput
      size={size}
      label={`${label} ${localization.bounds[key]}`}
      placeholder={localization.bounds[key]}
      value={box[key]}
      onChange={(next) => onChange({ ...box, [key]: next })}
    />
  )
  return (
    <div className="rtc-filter-stack">
      <div className="rtc-filter-range">
        {field('north')}
        {field('south')}
      </div>
      <div className="rtc-filter-range">
        {field('west')}
        {field('east')}
      </div>
    </div>
  )
}

const geoOperators: FilterOperator[] = [
  {
    id: 'geoWithinRadius',
    label: 'Within radius of',
    arity: 1,
    Operand: RadiusOperand,
    initialValue: () => ({}),
    isIncomplete: (operand) => {
      const value = (operand ?? {}) as Record<string, unknown>
      return (
        typeof value.lat !== 'number' ||
        typeof value.lng !== 'number' ||
        typeof value.km !== 'number'
      )
    },
    test: (data, operand, ctx) => {
      const centre = (operand ?? {}) as { lat?: number; lng?: number; km?: number }
      if (
        typeof centre.lat !== 'number' ||
        typeof centre.lng !== 'number' ||
        typeof centre.km !== 'number'
      ) {
        return true
      }
      const point = toPoint(data)
      if (!point) return !!ctx.modifiers.includeNulls
      return haversineKm(point, { lat: centre.lat, lng: centre.lng }) <= centre.km
    },
  },
  {
    id: 'geoWithinBounds',
    label: 'Within bounding box',
    arity: 1,
    Operand: BoundingBoxOperand,
    initialValue: () => ({}),
    isIncomplete: (operand) =>
      !operand || Object.values(operand as object).every((entry) => typeof entry !== 'number'),
    test: (data, operand, ctx) => {
      const box = (operand ?? {}) as Record<string, number | undefined>
      const point = toPoint(data)
      if (!point) return !!ctx.modifiers.includeNulls
      if (typeof box.north === 'number' && point.lat > box.north) return false
      if (typeof box.south === 'number' && point.lat < box.south) return false
      if (typeof box.east === 'number' && point.lng > box.east) return false
      if (typeof box.west === 'number' && point.lng < box.west) return false
      return true
    },
  },
  {
    id: 'isEmpty',
    label: 'Is empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toPoint(data) == null,
  },
  {
    id: 'isNotEmpty',
    label: 'Is not empty',
    arity: 0,
    Operand: NoOperand,
    isIncomplete: () => false,
    test: (data) => toPoint(data) != null,
  },
]

/**
 * Coordinates.
 *
 * Included as a built-in mainly as proof that the model is not limited to
 * scalars: the operands here are structured objects, the predicate is
 * geometric, and none of it required a change to the filter component.
 */
export const geoPointDataType: ColumnDataType = {
  id: 'geoPoint',
  operators: geoOperators,
  defaultOperator: 'geoWithinRadius',
  Operand: RadiusOperand,
  describe: (condition, ctx) => {
    const value = (condition.value ?? {}) as Record<string, number | undefined>
    if (condition.op === 'geoWithinRadius') {
      return `${ctx.columnLabel} ≤ ${value.km ?? '…'}km of ${value.lat ?? '…'}, ${value.lng ?? '…'}`
    }
    if (condition.op === 'geoWithinBounds') return `${ctx.columnLabel} in box`
    return `${ctx.columnLabel} ${ctx.operatorLabel.toLowerCase()}`
  },
}

export { toPoint as parseGeoPoint, haversineKm }

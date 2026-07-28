import { useMemo } from 'react'
import type { RowData } from '@tanstack/react-table'

import { useComponents, type RtcMenuItem, type RtcOption } from './registry'
import { formatMessage } from '../locale'
import { getColumnLabel, normalizeOptions, stringifyValue } from '../utils'
import type {
  DataTableColumnInstance,
  DataTableFilterVariant,
  DataTableInstance,
} from '../types'

/** Filter fns offered by default for each variant, in menu order. */
const DEFAULT_FILTER_MODES: Record<DataTableFilterVariant, string[]> = {
  text: [
    'includesString',
    'includesStringSensitive',
    'equalsString',
    'startsWith',
    'endsWith',
    'empty',
    'notEmpty',
  ],
  autocomplete: ['includesString', 'equalsString', 'startsWith', 'endsWith'],
  select: ['equalsString', 'weakEquals', 'empty', 'notEmpty'],
  'multi-select': ['arrIncludesSome', 'arrIncludesAll'],
  checkbox: ['arrIncludesSome'],
  range: ['inNumberRange', 'greaterThan', 'lessThan', 'between', 'betweenInclusive'],
  'range-slider': ['inNumberRange'],
  date: ['equalsString', 'greaterThan', 'lessThan'],
  'date-range': ['inNumberRange'],
}

const RANGE_MODES = ['inNumberRange', 'between', 'betweenInclusive']
/** Operators that take no operand at all. */
const NULLARY_MODES = ['empty', 'notEmpty']

export function inferFilterVariant<TData extends RowData>(
  column: DataTableColumnInstance<TData, any>,
): DataTableFilterVariant {
  const declared = column.columnDef.meta?.filterVariant
  if (declared) return declared
  const filterFn = column.columnDef.filterFn
  if (typeof filterFn === 'string' && RANGE_MODES.includes(filterFn)) return 'range'
  return 'text'
}

/**
 * The filter fn currently applied to a column, whether default or chosen.
 *
 * `'auto'` is TanStack's sentinel for "resolve from the data", not a concrete
 * operator, so it is treated as unset and falls through to the variant's
 * default — otherwise the operator menu would show "auto" with nothing ticked.
 */
export function currentFilterMode<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): string {
  const chosen = table.ui.columnFilterFns[column.id]
  if (chosen) return chosen
  const declared = column.columnDef.filterFn
  if (typeof declared === 'string' && declared !== 'auto') return declared
  return DEFAULT_FILTER_MODES[inferFilterVariant(column)][0] ?? 'includesString'
}

function useFacetOptions<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): RtcOption[] {
  const meta = column.columnDef.meta
  const enableFaceting = table.dataTableOptions.enableFaceting ?? true
  // Faceted values narrow with the other active filters, so this has to
  // recompute whenever filter state changes.
  const filterSignal = table.state.columnFilters
  const globalSignal = table.state.globalFilter

  return useMemo(() => {
    if (meta?.filterSelectOptions) return normalizeOptions(meta.filterSelectOptions)
    if (!enableFaceting) return []
    const unique = column.getFacetedUniqueValues()
    if (!unique) return []
    return Array.from(unique.keys())
      .flatMap((key) => (Array.isArray(key) ? key : [key]))
      .filter((key) => key != null && key !== '')
      .map((key) => stringifyValue(key))
      .filter((key, index, all) => all.indexOf(key) === index)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ label: key, value: key }))
  }, [column, meta?.filterSelectOptions, enableFaceting, filterSignal, globalSignal])
}

export interface FilterEditorProps<TData extends RowData> {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
  /** Compact controls, for the popover. */
  size?: 'sm' | 'md'
}

/**
 * The value editor for one column's filter.
 *
 * Shared by the header popover and the filter panel so the two can never drift
 * apart. It renders only the control — the operator menu and clear button are
 * the caller's, because their placement differs between the two surfaces.
 */
export function FilterEditor<TData extends RowData>({
  table,
  column,
  size = 'md',
}: FilterEditorProps<TData>) {
  const ui = useComponents()
  const { localization } = table.dataTableOptions
  const meta = column.columnDef.meta
  const variant = inferFilterVariant(column)
  const mode = currentFilterMode(table, column)
  const value = column.getFilterValue()
  const options = useFacetOptions(table, column)

  const placeholder =
    meta?.filterPlaceholder ??
    formatMessage(localization.filterByColumn, { column: getColumnLabel(column) })

  if (NULLARY_MODES.includes(mode)) {
    return (
      <span className="rtc-group-count">
        {mode === 'empty' ? localization.filterVariantEmpty : localization.filterVariantNotEmpty}
      </span>
    )
  }

  // A scalar column switched to a range operator needs the range editor.
  const effective: DataTableFilterVariant =
    variant === 'range' || variant === 'range-slider' || variant === 'date-range'
      ? variant
      : RANGE_MODES.includes(mode)
        ? 'range'
        : variant

  switch (effective) {
    case 'select':
      return (
        <ui.Select
          label={placeholder}
          size={size}
          value={stringifyValue(value)}
          placeholder={localization.showAll}
          options={options}
          onChange={(next) => column.setFilterValue(next || undefined)}
          dataAttributes={{ 'data-rtc-filter-input': column.id }}
        />
      )

    case 'multi-select':
    case 'checkbox': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      if (effective === 'multi-select') {
        return (
          <ui.MultiSelect
            label={placeholder}
            size={size}
            value={selected}
            options={options}
            onChange={(next) => column.setFilterValue(next.length > 0 ? next : undefined)}
          />
        )
      }
      return (
        <div className="rtc-filter-checkboxes" role="group" aria-label={placeholder}>
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
                    column.setFilterValue(next.length > 0 ? next : undefined)
                  }}
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )
    }

    case 'range-slider': {
      const bounds = column.getFacetedMinMaxValues()
      const min = bounds?.[0] ?? 0
      const max = bounds?.[1] ?? 100
      const range = Array.isArray(value) ? (value as Array<number | undefined>) : []
      return (
        <ui.RangeSlider
          label={placeholder}
          min={min}
          max={max}
          value={[range[0] ?? min, range[1] ?? max]}
          onChange={(next) => column.setFilterValue(next)}
        />
      )
    }

    case 'range':
    case 'date-range': {
      const range = Array.isArray(value) ? (value as Array<string | number | undefined>) : []
      const isDate = effective === 'date-range'
      const setBound = (index: 0 | 1, next: string | number | undefined) => {
        const updated: Array<string | number | undefined> = [range[0], range[1]]
        updated[index] = next === '' ? undefined : next
        column.setFilterValue(
          updated[0] === undefined && updated[1] === undefined ? undefined : updated,
        )
      }
      return (
        <div className="rtc-filter-range">
          {isDate ? (
            <>
              <ui.TextInput
                type="date"
                size={size}
                label={`${placeholder} ${localization.min}`}
                placeholder={localization.min}
                value={stringifyValue(range[0])}
                onChange={(next) => setBound(0, next)}
              />
              <ui.TextInput
                type="date"
                size={size}
                label={`${placeholder} ${localization.max}`}
                placeholder={localization.max}
                value={stringifyValue(range[1])}
                onChange={(next) => setBound(1, next)}
              />
            </>
          ) : (
            <>
              <ui.NumberInput
                size={size}
                label={`${placeholder} ${localization.min}`}
                placeholder={localization.min}
                value={typeof range[0] === 'number' ? range[0] : undefined}
                onChange={(next) => setBound(0, next)}
              />
              <ui.NumberInput
                size={size}
                label={`${placeholder} ${localization.max}`}
                placeholder={localization.max}
                value={typeof range[1] === 'number' ? range[1] : undefined}
                onChange={(next) => setBound(1, next)}
              />
            </>
          )}
        </div>
      )
    }

    case 'date':
      return (
        <ui.TextInput
          type="date"
          size={size}
          label={placeholder}
          value={stringifyValue(value)}
          onChange={(next) => column.setFilterValue(next || undefined)}
          dataAttributes={{ 'data-rtc-filter-input': column.id }}
        />
      )

    case 'autocomplete':
    default:
      return (
        <ui.TextInput
          size={size}
          label={placeholder}
          placeholder={placeholder}
          value={stringifyValue(value)}
          onChange={(next) => column.setFilterValue(next || undefined)}
          dataAttributes={{ 'data-rtc-filter-input': column.id }}
        />
      )
  }
}

/** Menu items for switching a column's filter operator. */
export function filterModeItems<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): RtcMenuItem[] {
  const { localization } = table.dataTableOptions
  const meta = column.columnDef.meta
  const modes = meta?.filterModeOptions ?? DEFAULT_FILTER_MODES[inferFilterVariant(column)]
  const current = currentFilterMode(table, column)

  return modes.map((mode) => ({
    type: 'checkbox' as const,
    id: mode,
    checked: current === mode,
    label: localization.filterOperators[mode] ?? mode,
    onSelect: () => {
      table.setColumnFilterFn(column.id, mode)
      // Scalar and range operators take incompatible value shapes.
      const wasRange = RANGE_MODES.includes(current)
      const isRange = RANGE_MODES.includes(mode)
      if (wasRange !== isRange) column.setFilterValue(undefined)
      if (NULLARY_MODES.includes(mode)) column.setFilterValue('')
    },
  }))
}

export function hasFilterModes<TData extends RowData>(
  table: DataTableInstance<TData>,
  column: DataTableColumnInstance<TData, any>,
): boolean {
  const meta = column.columnDef.meta
  const enabled = meta?.enableFilterModes ?? table.dataTableOptions.enableFilterModes ?? false
  if (!enabled) return false
  const modes = meta?.filterModeOptions ?? DEFAULT_FILTER_MODES[inferFilterVariant(column)]
  return modes.length > 1
}

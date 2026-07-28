import type { RowData } from '@tanstack/react-table'
import { useMemo } from 'react'

import { formatMessage } from '../locale'
import { getColumnLabel, normalizeOptions, stringifyValue } from '../utils'
import { IconButton, Select, TextInput } from './primitives/Controls'
import { CloseIcon, FilterIcon } from './primitives/Icons'
import { Menu, MenuItem, MenuLabel } from './primitives/Menu'
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

/** Variants whose filter value is a `[min, max]` tuple. */
const RANGE_VARIANTS = new Set<DataTableFilterVariant>(['range', 'range-slider', 'date-range'])

function inferVariant<TData extends RowData>(column: DataTableColumnInstance<TData, any>): DataTableFilterVariant {
  const declared = column.columnDef.meta?.filterVariant
  if (declared) return declared
  const filterFn = column.columnDef.filterFn
  if (typeof filterFn === 'string' && ['inNumberRange', 'between', 'betweenInclusive'].includes(filterFn)) {
    return 'range'
  }
  return 'text'
}

/**
 * The filter editor for one column.
 *
 * Options for `select`-family variants fall back to TanStack's faceted unique
 * values, so a column becomes filterable by its real domain without the caller
 * enumerating it.
 */
export function ColumnFilter<TData extends RowData>({
  table,
  column,
}: {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
}) {
  const options = table.dataTableOptions
  const { localization, enableFaceting = true } = options
  const variant = inferVariant(column)
  const meta = column.columnDef.meta
  const value = column.getFilterValue()

  const facetedOptions = useMemo(() => {
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
    // Faceted values change with the other active filters, so this recomputes
    // whenever the filter state does.
  }, [column, meta?.filterSelectOptions, enableFaceting, table.state.columnFilters, table.state.globalFilter])

  const placeholder =
    meta?.filterPlaceholder ??
    formatMessage(localization.filterByColumn, { column: getColumnLabel(column) })

  const clear = () => column.setFilterValue(undefined)
  const isActive = column.getIsFiltered()

  const modes = meta?.filterModeOptions ?? DEFAULT_FILTER_MODES[variant]
  const showModes =
    (meta?.enableFilterModes ?? options.enableFilterModes ?? false) && modes.length > 1

  const currentMode =
    table.ui.columnFilterFns[column.id] ??
    (typeof column.columnDef.filterFn === 'string' ? column.columnDef.filterFn : modes[0]) ??
    'includesString'

  return (
    <div className="rtc-filter">
      {showModes ? (
        <Menu
          label={localization.changeFilterMode}
          trigger={(triggerProps) => (
            <IconButton
              size="sm"
              label={formatMessage(localization.filterMode, {
                filterType: localization.filterOperators[currentMode] ?? currentMode,
              })}
              active={isActive}
              {...(triggerProps as any)}
            >
              <FilterIcon />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>{localization.changeFilterMode}</MenuLabel>
              {modes.map((mode) => (
                <MenuItem
                  key={mode}
                  role="menuitemcheckbox"
                  checked={currentMode === mode}
                  active={currentMode === mode}
                  onClick={() => {
                    table.setColumnFilterFn(column.id, mode)
                    // Value shapes differ between scalar and range operators.
                    const wasRange = ['inNumberRange', 'between', 'betweenInclusive'].includes(
                      currentMode,
                    )
                    const isRange = ['inNumberRange', 'between', 'betweenInclusive'].includes(mode)
                    if (wasRange !== isRange) column.setFilterValue(undefined)
                    if (mode === 'empty' || mode === 'notEmpty') column.setFilterValue('')
                    close()
                  }}
                >
                  {localization.filterOperators[mode] ?? mode}
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
      ) : null}

      <FilterInput
        table={table}
        column={column}
        variant={variant}
        value={value}
        options={facetedOptions}
        placeholder={placeholder}
        currentMode={currentMode}
      />

      {isActive ? (
        <IconButton size="sm" label={localization.clearFilter} onClick={clear}>
          <CloseIcon />
        </IconButton>
      ) : null}
    </div>
  )
}

interface FilterInputProps<TData extends RowData> {
  table: DataTableInstance<TData>
  column: DataTableColumnInstance<TData, any>
  variant: DataTableFilterVariant
  value: unknown
  options: Array<{ label: string; value: string }>
  placeholder: string
  currentMode: string
}

function FilterInput<TData extends RowData>({
  table,
  column,
  variant,
  value,
  options,
  placeholder,
  currentMode,
}: FilterInputProps<TData>) {
  const { localization } = table.dataTableOptions
  const listId = `rtc-facets-${column.id}`

  // Operators that take no operand at all.
  if (currentMode === 'empty' || currentMode === 'notEmpty') {
    return (
      <span className="rtc-group-count">
        {currentMode === 'empty' ? localization.filterVariantEmpty : localization.filterVariantNotEmpty}
      </span>
    )
  }

  const effectiveVariant: DataTableFilterVariant = RANGE_VARIANTS.has(variant)
    ? variant
    : ['inNumberRange', 'between', 'betweenInclusive'].includes(currentMode)
      ? 'range'
      : variant

  switch (effectiveVariant) {
    case 'select':
      return (
        <Select
          label={placeholder}
          value={stringifyValue(value)}
          options={[{ label: localization.showAll, value: '' }, ...options]}
          onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        />
      )

    case 'multi-select': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <select
          className="rtc-select"
          multiple
          aria-label={placeholder}
          value={selected}
          onChange={(event) => {
            const next = Array.from(event.target.selectedOptions, (option) => option.value)
            column.setFilterValue(next.length > 0 ? next : undefined)
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    case 'checkbox': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="rtc-filter-checkboxes" role="group" aria-label={placeholder}>
          {options.map((option) => {
            const checked = selected.includes(option.value)
            return (
              <label key={option.value} className="rtc-filter-chip" data-rtc-active={checked}>
                <input
                  className="rtc-checkbox"
                  type="checkbox"
                  checked={checked}
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
      const low = range[0] ?? min
      const high = range[1] ?? max
      return (
        <div className="rtc-filter-range">
          <input
            className="rtc-slider"
            type="range"
            min={min}
            max={max}
            value={low}
            aria-label={`${placeholder} ${localization.min}`}
            onChange={(event) =>
              column.setFilterValue([Number(event.target.value), high])
            }
          />
          <input
            className="rtc-slider"
            type="range"
            min={min}
            max={max}
            value={high}
            aria-label={`${placeholder} ${localization.max}`}
            onChange={(event) => column.setFilterValue([low, Number(event.target.value)])}
          />
        </div>
      )
    }

    case 'range':
    case 'date-range': {
      const range = Array.isArray(value) ? (value as Array<string | number | undefined>) : []
      const inputType = effectiveVariant === 'date-range' ? 'date' : 'number'
      const setBound = (index: 0 | 1, next: string) => {
        const parsed = next === '' ? undefined : inputType === 'number' ? Number(next) : next
        const updated: Array<string | number | undefined> = [range[0], range[1]]
        updated[index] = parsed
        column.setFilterValue(
          updated[0] === undefined && updated[1] === undefined ? undefined : updated,
        )
      }
      return (
        <div className="rtc-filter-range">
          <TextInput
            type={inputType}
            aria-label={`${placeholder} ${localization.min}`}
            placeholder={localization.min}
            value={range[0] ?? ''}
            onChange={(event) => setBound(0, event.target.value)}
          />
          <TextInput
            type={inputType}
            aria-label={`${placeholder} ${localization.max}`}
            placeholder={localization.max}
            value={range[1] ?? ''}
            onChange={(event) => setBound(1, event.target.value)}
          />
        </div>
      )
    }

    case 'date':
      return (
        <TextInput
          type="date"
          aria-label={placeholder}
          value={stringifyValue(value)}
          onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        />
      )

    case 'autocomplete':
      return (
        <>
          <TextInput
            list={listId}
            aria-label={placeholder}
            placeholder={placeholder}
            value={stringifyValue(value)}
            onChange={(event) => column.setFilterValue(event.target.value || undefined)}
          />
          <datalist id={listId}>
            {options.map((option) => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
        </>
      )

    default:
      return (
        <TextInput
          aria-label={placeholder}
          placeholder={placeholder}
          value={stringifyValue(value)}
          onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        />
      )
  }
}

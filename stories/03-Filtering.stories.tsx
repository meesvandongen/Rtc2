import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type ColumnFiltersState } from '../src'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(60)

const meta: Meta = {
  title: 'DataTable/03 Filtering',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/** Filter inputs live in a row under the header, toggled from the toolbar. */
export const ColumnFilters: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableColumnFilters
      initialState={{ showColumnFilters: true }}
    />
  ),
}

/**
 * Every built-in filter editor at once. The variant is chosen per column via
 * `meta.filterVariant`; `select`, `autocomplete` and `checkbox` populate their
 * options from TanStack's faceted unique values.
 */
export const FilterVariants: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Text, autocomplete, select, checkbox, numeric range, range slider and date range — each
        column below uses a different <code>meta.filterVariant</code>.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        enableColumnFilters
        enableFaceting
        initialState={{ showColumnFilters: true }}
      />
    </>
  ),
}

/** A multi-select variant driven by explicit options rather than facets. */
export const MultiSelectFilter: Story = {
  render: () => (
    <DataTable
      columns={personColumns.map((column) =>
        (column as { accessorKey?: string }).accessorKey === 'department'
          ? {
              ...column,
              filterFn: 'arrIncludesSome' as const,
              meta: {
                filterVariant: 'multi-select' as const,
                filterSelectOptions: ['Engineering', 'Design', 'Sales', 'Support', 'Finance'],
              },
            }
          : column,
      )}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ showColumnFilters: true }}
    />
  ),
}

/**
 * `enableFilterModes` adds an operator menu to each filter, so a text column
 * can switch between contains / starts with / equals / is empty, and a numeric
 * one between between / greater than / less than.
 */
export const FilterModes: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableFilterModes
      initialState={{ showColumnFilters: true }}
    />
  ),
}

/** Filters moved into each column's actions menu instead of a filter row. */
export const FiltersInColumnMenu: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      columnFilterDisplayMode="popover"
      enableColumnActions
      enableFilterModes
    />
  ),
}

/** A single search box across every globally-filterable column. */
export const GlobalFilter: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableGlobalFilter
      initialState={{ showGlobalFilter: true }}
    />
  ),
}

/** The search box can be permanently visible by disabling its toggle. */
export const AlwaysVisibleSearch: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      enableGlobalFilterToggle={false}
      globalFilterFn="includesString"
    />
  ),
}

export const ControlledFilters: Story = {
  render: function ControlledFilters() {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
      { id: 'department', value: 'Engineering' },
    ])
    return (
      <>
        <div className="sb-row">
          <button type="button" className="rtc-button" onClick={() => setColumnFilters([])}>
            Clear all filters
          </button>
        </div>
        <DataTable
          columns={personColumns}
          data={data}
          getRowId={(row) => row.id}
          state={{ columnFilters }}
          onColumnFiltersChange={(updater) =>
            setColumnFilters((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
          initialState={{ showColumnFilters: true }}
        />
        <pre className="sb-panel">{JSON.stringify(columnFilters, null, 2)}</pre>
      </>
    )
  },
}

/**
 * Faceting powers the option lists. Filtering by department narrows the city
 * autocomplete to the cities still present in the result set.
 */
export const Faceting: Story = {
  render: () => (
    <>
      <p className="sb-note">
        Pick a department, then open the city filter — its suggestions are recomputed from the
        remaining rows.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        enableFaceting
        initialState={{ showColumnFilters: true }}
      />
    </>
  ),
}

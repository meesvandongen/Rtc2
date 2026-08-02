import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  DataTable,
  DataTableFilterPanel,
  useDataTable,
  type ColumnFiltersState,
} from '../src'
import { makePeople, personColumns, type Person } from './fixtures'

const data = makePeople(60)

const meta: Meta = {
  title: 'DataTable/03 Filtering',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * The default. Each column gets a funnel button in its header that opens the
 * editor in a popover, so a tall control costs no row height.
 */
export const ColumnFilterPopovers: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Click the funnel icon in any header. Active filters appear as removable chips in the
        toolbar, since the editors themselves are hidden until opened.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="popover"
      />
    </>
  ),
}

/**
 * A vertical, scrollable pane docked beside the table.
 *
 * This is the mode to use when several filters are edited together, or when
 * the editors are large: the pane scrolls independently of the rows.
 */
export const DockedFilterPanel: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      filterDisplayMode="panel"
      height={560}
      enableStickyHeader
    />
  ),
}

export const PanelOnTheStartEdge: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      filterDisplayMode="panel"
      filterPanelPosition="start"
      height={560}
      enableStickyHeader
    />
  ),
}

/** Both surfaces: quick single-column edits in the header, everything in the pane. */
export const PopoverAndPanel: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      filterDisplayMode="popover-and-panel"
      height={560}
      enableStickyHeader
      initialState={{ showFilterPanel: true }}
    />
  ),
}

/**
 * The panel is a standalone component. Give it an instance from `useDataTable`
 * and render it anywhere — a drawer, a sidebar, another column of the page.
 */
export const FilterPanelOutsideTheTable: Story = {
  render: function FilterPanelOutsideTheTable() {
    const table = useDataTable<Person>({
      columns: personColumns,
      data,
      getRowId: (row) => row.id,
      filterDisplayMode: 'none',
    })

    return (
      <>
        <p className="rtc-sb-note">
          The pane below lives outside <code>&lt;DataTable /&gt;</code> entirely and drives it
          through the shared instance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          <aside
            style={{
              border: '1px solid var(--rtc-color-border, #e2e8f0)',
              borderRadius: 8,
              overflow: 'hidden',
              maxHeight: 560,
              display: 'flex',
            }}
          >
            <DataTableFilterPanel table={table} />
          </aside>
          <DataTable table={table} />
        </div>
      </>
    )
  },
}

/**
 * Every editor at once. Each column declares a `meta.dataType`, and the type
 * supplies both the operator list and the operand editor — select and
 * checkbox operands populate from TanStack's faceted unique values.
 */
export const FilterVariants: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Text, enum, number, boolean and date. Switch the operator on any column to change the
        operand: the date range and the salary slider are exactly the editors that made an in-table
        filter row unworkable.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        filterDisplayMode="panel"
        height={620}
        enableStickyHeader
      />
    </>
  ),
}

/**
 * Dates and date-times side by side.
 *
 * `date` compares whole days and edits with a `date` input; `datetime` keeps
 * minute precision and edits with `datetime-local`. Same operators, same
 * editor component — only `meta.dataType` differs, and with it the granularity
 * every comparison truncates to.
 */
export const DateAndTimeFilters: Story = {
  render: () => (
    <>
      <p className="rtc-sb-note">
        Filter <strong>Start date</strong> "is on" a day and it matches every row from that day.
        Filter <strong>Last seen</strong> and you get a full timestamp — then switch its operator to
        "Time of day between" to match a clock window across every date.
      </p>
      <DataTable
        columns={personColumns.filter((column) =>
          ['firstName', 'department', 'startDate', 'lastSeen'].includes(
            (column as { accessorKey?: string }).accessorKey ?? '',
          ),
        )}
        data={data}
        getRowId={(row) => row.id}
        enableFilterModes
        filterDisplayMode="popover-and-panel"
        height={560}
        enableStickyHeader
        initialState={{ showFilterPanel: true }}
      />
    </>
  ),
}

/** A multi-select driven by explicit options rather than facets. */
export const MultiSelectFilter: Story = {
  render: () => (
    <DataTable
      columns={personColumns.map((column) =>
        (column as { accessorKey?: string }).accessorKey === 'department'
          ? {
              ...column,
              meta: {
                dataType: 'enum' as const,
                filterOperators: ['isAnyOf'],
                filterSelectOptions: ['Engineering', 'Design', 'Sales', 'Support', 'Finance'],
              },
            }
          : column,
      )}
      data={data}
      getRowId={(row) => row.id}
      filterDisplayMode="panel"
      height={560}
    />
  ),
}

/**
 * `enableFilterModes` adds an operator menu to each filter, so a text column
 * can switch between contains / starts with / equals / is empty — and the
 * chosen operator is stored inside the filter value, not beside it.
 */
export const FilterModes: Story = {
  render: () => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableFilterModes
      filterDisplayMode="popover-and-panel"
      height={560}
      initialState={{ showFilterPanel: true }}
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
        <div className="rtc-sb-row">
          <button type="button" className="rtc-button" onClick={() => setColumnFilters([])}>
            Clear all filters
          </button>
        </div>
        <DataTable
          columns={personColumns}
          data={data}
          getRowId={(row) => row.id}
          filterDisplayMode="popover-and-panel"
          state={{ columnFilters }}
          onColumnFiltersChange={(updater) =>
            setColumnFilters((old) => (typeof updater === 'function' ? updater(old) : updater))
          }
          height={520}
        />
        <pre className="rtc-sb-panel">{JSON.stringify(columnFilters, null, 2)}</pre>
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
      <p className="rtc-sb-note">
        Pick a department, then open the city filter — its suggestions are recomputed from the
        remaining rows.
      </p>
      <DataTable
        columns={personColumns}
        data={data}
        getRowId={(row) => row.id}
        enableFaceting
        filterDisplayMode="panel"
        height={560}
      />
    </>
  ),
}

/** No built-in filter UI at all; filters are driven entirely from outside. */
export const NoBuiltInFilterUi: Story = {
  render: function NoBuiltInFilterUi() {
    const [department, setDepartment] = useState('')
    return (
      <>
        <div className="rtc-sb-row">
          {['', 'Engineering', 'Design', 'Sales'].map((value) => (
            <button
              key={value || 'all'}
              type="button"
              className="rtc-button"
              onClick={() => setDepartment(value)}
            >
              {value || 'All'}
            </button>
          ))}
        </div>
        <DataTable
          columns={personColumns.slice(0, 6)}
          data={data}
          getRowId={(row) => row.id}
          filterDisplayMode="none"
          state={{
            columnFilters: department ? [{ id: 'department', value: department }] : [],
          }}
        />
      </>
    )
  },
}

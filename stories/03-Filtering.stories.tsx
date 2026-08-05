import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  DataTable,
  DataTableFilterPanel,
  useDataTable,
  type ColumnFiltersState,
} from '../src'
import { loadingArgTypes } from './controls'
import { makePeople, personColumns, type Person } from './fixtures'

const data = makePeople(60)

/** Filtering behaviour knobs shared across the stories in this file. */
const filteringArgTypes = {
  filterDisplayMode: {
    control: 'select',
    options: ['popover', 'panel', 'popover-and-panel', 'none'],
    table: { category: 'Filtering' },
  },
  filterPanelPosition: {
    control: 'select',
    options: ['start', 'end'],
    description: 'Which side the docked filter panel appears on.',
    table: { category: 'Filtering' },
  },
  enableFilterModes: {
    control: 'boolean',
    description: 'Show the per-column operator (filter mode) menu.',
    table: { category: 'Filtering' },
  },
  enableMultipleFilterConditions: {
    control: 'boolean',
    description: 'Allow several conditions on one column (`age > 20 AND age < 30`).',
    table: { category: 'Filtering' },
  },
  showActiveFilterChips: {
    control: 'boolean',
    description: 'Removable chips in the toolbar for each active column filter.',
    table: { category: 'Filtering' },
  },
  enableFaceting: {
    control: 'boolean',
    description: 'Compute faceted unique values, powering select/checkbox filter options.',
    table: { category: 'Filtering' },
  },
  enableGlobalFilter: { control: 'boolean', table: { category: 'Filtering' } },
  enableGlobalFilterToggle: {
    control: 'boolean',
    description: 'Whether the global search box has to be toggled open, versus always visible.',
    table: { category: 'Filtering' },
  },
  globalFilterFn: {
    control: 'select',
    options: [
      'includesString',
      'includesStringSensitive',
      'equalsString',
      'equalsStringSensitive',
      'startsWith',
      'endsWith',
      'weakEquals',
    ],
    table: { category: 'Filtering' },
  },
  enableStickyHeader: { control: 'boolean', table: { category: 'Appearance' } },
} as const

const meta: Meta = {
  title: 'DataTable/03 Filtering',
  argTypes: { ...filteringArgTypes, ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * The default. Each column gets a funnel button in its header that opens the
 * editor in a popover, so a tall control costs no row height.
 */
export const ColumnFilterPopovers: Story = {
  args: {
    filterDisplayMode: 'popover',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Click the funnel icon in any header. Active filters appear as removable chips in the
        toolbar, since the editors themselves are hidden until opened.
      </p>
      <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} {...args} />
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
  args: {
    filterDisplayMode: 'panel',
    enableStickyHeader: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} height={560} {...args} />
  ),
}

export const PanelOnTheStartEdge: Story = {
  args: {
    filterDisplayMode: 'panel',
    filterPanelPosition: 'start',
    enableStickyHeader: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} height={560} {...args} />
  ),
}

/** Both surfaces: quick single-column edits in the header, everything in the pane. */
export const PopoverAndPanel: Story = {
  args: {
    filterDisplayMode: 'popover-and-panel',
    enableStickyHeader: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      height={560}
      initialState={{ showFilterPanel: true }}
      {...args}
    />
  ),
}

/**
 * On a narrow viewport both filter surfaces are wrong: a popover anchored to a
 * 24px funnel in a sideways-scrolling header has nowhere to open, and a 280px
 * pane docked beside the rows leaves no rows. Below `mobileBreakpoint` the
 * table swaps both for a modal bottom sheet — a native `<dialog>`, so the top
 * layer, the backdrop, the focus trap and Escape all come from the browser —
 * and the toolbar always offers the funnel that opens it.
 *
 * This story pins Storybook's viewport to a phone so the real 640px default
 * applies — the Viewport toolbar resizes the preview iframe, and that is the
 * same media query the table listens to. Pinning it also disables the picker
 * here; to watch the switch happen, open any other filtering story and drag
 * the canvas edge (or pick a viewport) across 640px.
 */
export const MobileFilterDrawer: Story = {
  globals: { viewport: { value: 'mobile2' } },
  args: {
    filterDisplayMode: 'popover-and-panel',
    enableStickyHeader: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Open the funnel in the toolbar for every column, or the one in a header for a single
        column. Both land in the same sheet — drag it down by its grabber to dismiss it.
      </p>
      <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} height={560} {...args} />
    </>
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
  args: {
    filterDisplayMode: 'panel',
    enableStickyHeader: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Text, enum, number, boolean and date. Switch the operator on any column to change the
        operand: the date range and the salary slider are exactly the editors that made an in-table
        filter row unworkable.
      </p>
      <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} height={620} {...args} />
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
  args: {
    enableFilterModes: true,
    filterDisplayMode: 'popover-and-panel',
    enableStickyHeader: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
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
        height={560}
        initialState={{ showFilterPanel: true }}
        {...args}
      />
    </>
  ),
}

/** A multi-select driven by explicit options rather than facets. */
export const MultiSelectFilter: Story = {
  args: {
    filterDisplayMode: 'panel',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
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
      height={560}
      {...args}
    />
  ),
}

/**
 * `enableFilterModes` adds an operator menu to each filter, so a text column
 * can switch between contains / starts with / equals / is empty — and the
 * chosen operator is stored inside the filter value, not beside it.
 */
export const FilterModes: Story = {
  args: {
    enableFilterModes: true,
    filterDisplayMode: 'popover-and-panel',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      height={560}
      initialState={{ showFilterPanel: true }}
      {...args}
    />
  ),
}

/** A single search box across every globally-filterable column. */
export const GlobalFilter: Story = {
  args: {
    enableGlobalFilter: true,
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      initialState={{ showGlobalFilter: true }}
      {...args}
    />
  ),
}

export const AlwaysVisibleSearch: Story = {
  args: {
    enableGlobalFilterToggle: false,
    globalFilterFn: 'includesString',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable columns={personColumns.slice(0, 6)} data={data} getRowId={(row) => row.id} {...args} />
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
  args: {
    enableFaceting: true,
    filterDisplayMode: 'panel',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <>
      <p className="rtc-sb-note">
        Pick a department, then open the city filter — its suggestions are recomputed from the
        remaining rows.
      </p>
      <DataTable columns={personColumns} data={data} getRowId={(row) => row.id} height={560} {...args} />
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
